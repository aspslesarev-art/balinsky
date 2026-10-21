import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// «Что рядом сдают за эти же деньги» — выдача под ползунок ADR в
// инвест-виджете. Отвечает на вопрос покупателя «а за мою ставку тут
// вообще что снимают?», поэтому сегмент (вилла/отель, число спален) не
// фильтруется: показываем всё, что попадает в цену и в радиус.
//
// «За эти же деньги» — всё, что сдаётся в пределах бюджета: от ставки +10%
// вниз до половины ставки, сначала самые дорогие (просьба владельца
// 15.10.2026: «от большего к меньшему»). Нижняя граница отсекает хостелы
// за $12 рядом с виллой за $200 — это не конкуренты. Проценты, а не
// доллары, чтобы коридор оставался осмысленным и при ADR 40, и при 400.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const BAND_BELOW = 0.50
const BAND_ABOVE = 0.10
const ALLOWED_RADII: readonly number[] = [500, 1000]
const LIMIT = 48
/** Соседи с Airbnb (migrations/129) — добавляются в ту же ленту. */
const AIRBNB_LIMIT = 24

// Куда расширять поиск, если в запрошенном радиусе никого. Плотность
// аренды на Бали разная: в Чангу в 500 м сотни объектов, а в Сануре
// вокруг того же дома всего 20 объектов с ценой, и в коридор ставки не
// попадает ни один. Пустой блок в такой ситуации — не ответ: покупателю
// нужно знать, за сколько сдают рядом, пусть и в паре километров.
const FALLBACK_RADII: readonly number[] = [1000, 2000, 3000]

type Row = {
  id: number
  title: string | null
  unit_kind: string | null
  bedrooms: number | null
  area_sqm: number | null
  distance_m: number | null
  occupancy: number | null
  price: number | null
  star: number | null
  slug: string | null
  image: string | null
  room_type: string | null
  room_photo: string | null
  room_occ: number | null
  n_villas: number | null
  n_apts: number | null
  n_rooms: number | null
}

type AirbnbRow = {
  id: string
  name: string | null
  title: string | null
  property_type: string | null
  room_type: string | null
  bedrooms: number | null
  rating: number | null
  reviews: number | null
  distance_m: number | null
  price: number | null
  photo: string | null
}

/** Тип жилья Airbnb → то же деление, что у Booking (вилла/дом/апартаменты/номер). */
function airbnbKind(propertyType: string | null): 'villa' | 'house' | 'apartment' | 'room' | null {
  const t = (propertyType ?? '').toLowerCase()
  if (!t) return null
  if (/room|hostel|shared/.test(t)) return 'room'
  if (/villa/.test(t)) return 'villa'
  if (/rental unit|condo|apartment|loft|serviced/.test(t)) return 'apartment'
  if (/home|house|bungalow|cottage|guesthouse|guest suite|cabin|townhouse|tiny|place/.test(t)) return 'house'
  return null
}

function num(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const q = new URL(req.url).searchParams
  const lat = num(q.get('lat'))
  const lng = num(q.get('lng'))
  const adr = num(q.get('adr'))
  const radiusRaw = num(q.get('radius')) ?? 1000
  const radius = ALLOWED_RADII.includes(radiusRaw) ? radiusRaw : 1000

  if (lat == null || lng == null || adr == null) {
    return NextResponse.json({ ok: false, error: 'bad_params' }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || adr <= 0 || adr > 100000) {
    return NextResponse.json({ ok: false, error: 'bad_params' }, { status: 400 })
  }

  const priceMin = Math.max(1, Math.round(adr * (1 - BAND_BELOW)))
  const priceMax = Math.round(adr * (1 + BAND_ABOVE))

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    const ask = async (r: number) => {
      const { data, error } = await sb.rpc('booking_data_price_comps', {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: r,
        p_price_min: priceMin,
        p_price_max: priceMax,
        p_limit: LIMIT,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as Row[]
    }

    const askAirbnb = async (r: number) => {
      const { data, error } = await sb.rpc('airbnb_price_comps', {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: r,
        p_price_min: priceMin,
        p_price_max: priceMax,
        p_limit: AIRBNB_LIMIT,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as AirbnbRow[]
    }

    let usedRadius = radius
    let [data, abnb] = await Promise.all([ask(radius), askAirbnb(radius)])
    for (const wider of FALLBACK_RADII) {
      if (data.length || abnb.length || wider <= radius) continue
      ;[data, abnb] = await Promise.all([ask(wider), askAirbnb(wider)])
      usedRadius = wider
      if (data.length || abnb.length) break
    }

    const booking = (data as Row[]).map(r => ({
      source: 'booking' as const,
      id: String(r.id),
      title: r.title,
      unitKind: r.unit_kind,
      bedrooms: r.bedrooms,
      areaSqm: r.area_sqm == null ? null : Number(r.area_sqm),
      distanceM: r.distance_m == null ? null : Number(r.distance_m),
      occupancy: r.occupancy == null ? null : Number(r.occupancy),
      price: r.price == null ? null : Number(r.price),
      star: r.star == null ? null : Number(r.star),
      image: r.image,
      // Вариант жилья, чья цена попала в коридор (migrations/104): у комплекса
      // однушка и трёхспальная вилла стоят по-разному, сравниваем с конкретной.
      roomType: r.room_type ?? null,
      // Загрузка по estatemarket (migrations/126): варианта и всего объекта.
      roomOcc: r.room_occ == null ? null : Number(r.room_occ),
      // Фото самого варианта вместо общего кадра объекта, когда оно есть.
      roomPhoto: r.room_photo ? `https://cf.bstatic.com${r.room_photo}` : null,
      mix: r.n_villas == null && r.n_apts == null && r.n_rooms == null ? null : {
        villas: Number(r.n_villas ?? 0), apartments: Number(r.n_apts ?? 0), rooms: Number(r.n_rooms ?? 0),
      },
      // Все объекты в базе — на Бали, значит код страны в адресе карточки
      // всегда `id` (проверено 21.10.2026). Без slug — поиск по названию.
      url: r.slug
        ? `https://www.booking.com/hotel/id/${encodeURIComponent(r.slug)}.html`
        : r.title
          ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(r.title)}`
          : null,
      rating: null as number | null,
      reviews: null as number | null,
    }))

    // Airbnb: цена — из выдачи поиска (за ночь со сборами), загрузки пока нет,
    // вместо неё рейтинг. Точку Airbnb размывает, расстояние — примерное.
    const airbnb = abnb.map(r => ({
      source: 'airbnb' as const,
      id: r.id,
      title: r.name?.replace(/\s+/g, ' ').trim() || r.title,
      unitKind: airbnbKind(r.property_type),
      bedrooms: r.bedrooms,
      areaSqm: null as number | null,
      distanceM: r.distance_m == null ? null : Number(r.distance_m),
      occupancy: null as number | null,
      price: r.price == null ? null : Number(r.price),
      star: null as number | null,
      image: r.photo ? `${r.photo}?im_w=480` : null,
      roomType: null as string | null,
      roomOcc: null as number | null,
      roomPhoto: null as string | null,
      mix: null,
      url: `https://www.airbnb.com/rooms/${encodeURIComponent(r.id)}`,
      // Рейтинг 0 у Airbnb — новое объявление без отзывов, а не «ноль звёзд».
      rating: r.rating == null || Number(r.rating) <= 0 ? null : Number(r.rating),
      reviews: r.rating != null && Number(r.rating) <= 0 ? 0 : r.reviews == null ? null : Number(r.reviews),
    }))

    // SQL отдаёт ближайших к середине коридора; лента — от дорогих к дешёвым.
    const items = [...booking, ...airbnb].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))

    // radius — что спросили, usedRadius — где на самом деле нашлось.
    const res = NextResponse.json({ ok: true, priceMin, priceMax, radius, usedRadius, items })
    // Данные обновляются раз в сутки — держим на краю час.
    res.headers.set('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res
  } catch (e) {
    console.error('[rental-comps]', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 502 })
  }
}
