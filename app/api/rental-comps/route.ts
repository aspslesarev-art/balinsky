import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// «Что рядом сдают за эти же деньги» — выдача под ползунок ADR в
// инвест-виджете. Отвечает на вопрос покупателя «а за мою ставку тут
// вообще что снимают?», поэтому сегмент (вилла/отель, число спален) не
// фильтруется: показываем всё, что попадает в цену и в радиус.
//
// Диапазон цены задаётся процентами, а не долларами: −25% / +10% от ADR.
// На 110 это 82…121 — тот самый коридор, который просили, но при ADR 40
// или 400 он остаётся осмысленным, тогда как фиксированные ±30$ на краях
// шкалы либо схлопываются, либо ловят весь рынок.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const BAND_BELOW = 0.25
const BAND_ABOVE = 0.10
const ALLOWED_RADII: readonly number[] = [500, 1000]
const LIMIT = 16

type Row = {
  id: number
  title: string | null
  unit_kind: string | null
  bedrooms: number | null
  distance_m: number | null
  occupancy: number | null
  price: number | null
  star: number | null
  slug: string | null
  image: string | null
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
    const { data, error } = await sb.rpc('booking_data_price_comps', {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radius,
      p_price_min: priceMin,
      p_price_max: priceMax,
      p_limit: LIMIT,
    })
    if (error) throw new Error(error.message)

    const items = ((data ?? []) as Row[]).map(r => ({
      id: r.id,
      title: r.title,
      unitKind: r.unit_kind,
      bedrooms: r.bedrooms,
      distanceM: r.distance_m == null ? null : Number(r.distance_m),
      occupancy: r.occupancy == null ? null : Number(r.occupancy),
      price: r.price == null ? null : Number(r.price),
      star: r.star == null ? null : Number(r.star),
      image: r.image,
      // Прямая ссылка на карточку требует кода страны, которого в данных
      // нет, — часть ссылок оказалась бы битой. Поиск по названию открывает
      // тот же объект и не ломается.
      url: r.title
        ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(r.title)}`
        : null,
    }))

    const res = NextResponse.json({ ok: true, priceMin, priceMax, radius, items })
    // Данные обновляются раз в сутки — держим на краю час.
    res.headers.set('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res
  } catch (e) {
    console.error('[rental-comps]', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 502 })
  }
}
