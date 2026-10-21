'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { formatPriceExact } from '@/lib/currency'
import { useCurrency } from '../CurrencyContext'
import { BookingCompCard, type CompMix } from '../BookingCompCard'

// «Что рядом сдают за эти же деньги»: живая подборка объектов Booking в
// коридоре вокруг ADR, который посетитель выставил ползунком.
//
// Смысл блока — проверка ставки глазами, а не ещё одна таблица: человек
// видит фотографии, цену за ночь и загрузку тех, с кем реально будет
// конкурировать. Поэтому сегмент не сужается до «вилла, 2 спальни» —
// показываем всё, что попадает в цену и в радиус.
//
// С 21.10.2026 в ту же ленту идут соседи с Airbnb (просьба владельца): цена —
// из поиска Airbnb, вместо загрузки рейтинг, площадка подписана на фото.

type Item = {
  source: 'booking' | 'airbnb'
  /** Строка: id Airbnb длиннее 2^53 и в числе округляется. */
  id: string
  title: string | null
  unitKind: string | null
  bedrooms: number | null
  areaSqm: number | null
  distanceM: number | null
  occupancy: number | null
  price: number | null
  star: number | null
  image: string | null
  /** Конкретный вариант на Booking, чья цена в коридоре («One-Bedroom Villa»). */
  roomType: string | null
  /** Загрузка варианта по estatemarket, %; `occupancy` — всего объекта. */
  roomOcc: number | null
  roomPhoto: string | null
  mix: CompMix | null
  url: string | null
  /** Рейтинг гостей из 5 и число отзывов — только у Airbnb. */
  rating: number | null
  reviews: number | null
}

const RADII = [500, 1000] as const
/** Ползунок ADR тянут непрерывно — ждём паузы, чтобы не звать API на каждый шаг. */
const DEBOUNCE_MS = 450

const COPY = {
  ru: {
    title: 'Что рядом сдают за эти же деньги',
    sub: (a: string, b: string) => `Всё, что сдаётся на Booking и Airbnb в этом бюджете: от ${b} до ${a} за ночь, сначала самые дорогие.`,
    widened: (r: number) => `Рядом в этой ставке никого, поэтому показываем в радиусе ${r < 1000 ? `${r} м` : `${r / 1000} км`}.`,
    subLoading: 'Подбираем объекты по вашей ставке…',
    empty: 'В этом радиусе и в этой цене на Booking и Airbnb пока никого — попробуйте больший радиус или другую ставку.',
    r500: '500 м',
    r1000: '1 км',
    houseLess: (d: number) => `на ${d} м² меньше вашего дома`,
    houseMore: (d: number) => `на ${d} м² больше вашего дома`,
    houseSame: 'площадь как у вашего дома',
    withLand: 'как ваш дом с участком',
    landMore: (d: number, land: number) => `на ${d} м² больше вашего участка (${land} м²)`,
    bedsLess: (d: number) => `на ${d} ${d === 1 ? 'спальню' : d < 5 ? 'спальни' : 'спален'} меньше`,
    bedsMore: (d: number) => `на ${d} ${d === 1 ? 'спальню' : d < 5 ? 'спальни' : 'спален'} больше`,
    m: 'м',
    km: 'км',
    approx: 'около',
    source: 'Данные Booking и Airbnb, обновляются ежедневно. Цена на Booking — ставка за ночь, которую выставляет объект; на Airbnb — сколько гость платит за ночь вместе со сборами, при брони на 5 ночей. Загрузка Booking — по estatemarket.io: доля ночей за месяц, когда этот вариант нельзя было забронировать (бронь или закрыл хозяин); у объекта — средняя по его вариантам. Загрузку Airbnb мы собираем с 20.10.2026 и покажем, когда наберётся месяц; пока — рейтинг гостей. Airbnb сдвигает точку на карте, поэтому расстояние до его объектов примерное. Площадь — как её указал объект; у вилл в неё часто входит участок, поэтому их сравниваем и с вашим домом, и с участком.',
    prev: 'Предыдущие объекты',
    next: 'Следующие объекты',
  },
  en: {
    title: 'What the same money rents nearby',
    sub: (a: string, b: string) => `Everything on Booking and Airbnb within this budget: ${b} down to ${a} per night, most expensive first.`,
    widened: (r: number) => `Nothing at this rate right nearby, so we widened the search to ${r < 1000 ? `${r} m` : `${r / 1000} km`}.`,
    subLoading: 'Finding listings at your rate…',
    empty: 'Nothing on Booking or Airbnb in this radius at this price — try a wider radius or another rate.',
    r500: '500 m',
    r1000: '1 km',
    houseLess: (d: number) => `${d} m² smaller than your house`,
    houseMore: (d: number) => `${d} m² larger than your house`,
    houseSame: 'same size as your house',
    withLand: 'about your house plus plot',
    landMore: (d: number, land: number) => `${d} m² larger than your plot (${land} m²)`,
    bedsLess: (d: number) => `${d} bedroom${d === 1 ? '' : 's'} fewer`,
    bedsMore: (d: number) => `${d} bedroom${d === 1 ? '' : 's'} more`,
    m: 'm',
    km: 'km',
    approx: '~',
    source: 'Booking and Airbnb data, refreshed daily. Booking price is the nightly rate each property lists; Airbnb price is what a guest pays per night including fees, for a 5-night stay. Booking occupancy is from estatemarket.io: share of nights in a month this option could not be booked (booked or closed by the owner); for the property, the average across its options. We have tracked Airbnb occupancy since 20 Oct 2026 and will show it once a month of data builds up; until then, the guest rating. Airbnb shifts map pins, so distances to its listings are approximate. Size is as the property lists it; villas often include the plot, so we compare them with both your house and your plot.',
    prev: 'Previous listings',
    next: 'Next listings',
  },
} as const

function fmtDistance(m: number, c: { m: string; km: string; approx: string }, approx = false): string {
  // Точка Airbnb размыта на сотни метров — до 50 м точности нет.
  const s = m < 950 ? `${Math.round(m / (approx ? 50 : 10)) * (approx ? 50 : 10)} ${c.m}` : `${(m / 1000).toFixed(1)} ${c.km}`
  return approx ? `${c.approx} ${s}` : s
}

/** Сравнение с объектом на странице: площадь в пределах ±5 м² считаем равной. */
const AREA_SAME_M2 = 5

/** Целое жильё (вилла, дом): Booking-площадь у них часто вместе с участком. */
function isWholeHome(it: Item): boolean {
  return it.unitKind === 'villa' || it.unitKind === 'house' || /villa|house|bungalow/i.test(it.roomType ?? '')
}

export function RentalComps({ lat, lng, adr, lang, areaSqm, landSqm, bedrooms }: {
  lat: number; lng: number; adr: number; lang: Lang
  /** Дом, участок и спальни объекта на странице — с ними сравниваем соседей. */
  areaSqm?: number | null
  landSqm?: number | null
  bedrooms?: number | null
}) {
  // По умолчанию километр: в 500 м и в коридоре ставки часто один-два
  // объекта, а по ним рынок не понять (просьба владельца 21.10.2026).
  const [radius, setRadius] = useState<number>(1000)
  const [items, setItems] = useState<Item[] | null>(null)
  // В каком радиусе объекты в итоге нашлись: в разреженных районах API
  // расширяет поиск сам, и промолчать об этом нельзя — на переключателе
  // будет «500 м», а объекты окажутся из другого места.
  const [usedRadius, setUsedRadius] = useState<number | null>(null)
  const [band, setBand] = useState<{ min: number; max: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const c = pickCopy(COPY, lang)
  const { currency } = useCurrency()

  // Чем сосед отличается от объекта на странице; good — в пользу объекта.
  // Номер отеля сравниваем с домом. Вилла на Booking часто указывает площадь
  // вместе с участком: если её цифра больше нашего дома, сверяем ещё и с
  // участком, а не пишем, что у соседа «дом больше» (владелец 21.10.2026).
  function compareWith(it: Item): { text: string; good: boolean; kind?: 'area' | 'beds' }[] {
    const diffs: { text: string; good: boolean; kind?: 'area' | 'beds' }[] = []
    if (areaSqm && it.areaSqm != null) {
      const theirs = Math.round(it.areaSqm)
      const house = Math.round(areaSqm)
      const d = theirs - house
      if (Math.abs(d) <= AREA_SAME_M2) diffs.push({ text: c.houseSame, good: false })
      else if (d < 0) diffs.push({ text: c.houseLess(-d), good: true })
      else if (isWholeHome(it) && landSqm) {
        const land = Math.round(landSqm)
        const total = Math.max(house, land)
        if (theirs > total * 1.1) diffs.push({ text: c.landMore(theirs - land, land), good: false })
        else diffs.push({ text: c.withLand, good: false })
      } else diffs.push({ text: c.houseMore(d), good: false })
    }
    if (bedrooms != null && it.bedrooms != null && it.bedrooms !== bedrooms) {
      const d = it.bedrooms - bedrooms
      diffs.push(d < 0 ? { text: c.bedsLess(-d), good: true, kind: 'beds' } : { text: c.bedsMore(d), good: false, kind: 'beds' })
    }
    return diffs
  }

  /** Прокрутка на «экран» ленты: чуть меньше её ширины, чтобы край оставался виден. */
  function scrollBy(dir: -1 | 1) {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    setLoading(true)
    const timer = setTimeout(() => {
      const url = `/api/rental-comps?lat=${lat}&lng=${lng}&adr=${Math.round(adr)}&radius=${radius}`
      fetch(url, { signal: ctrl.signal })
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          if (d?.ok) {
            setItems(d.items as Item[])
            setBand({ min: d.priceMin, max: d.priceMax })
            setUsedRadius(typeof d.usedRadius === 'number' ? d.usedRadius : null)
          } else {
            setItems([])
            setUsedRadius(null)
          }
        })
        .catch(() => { if (!cancelled) setItems([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, DEBOUNCE_MS)
    return () => { cancelled = true; ctrl.abort(); clearTimeout(timer) }
  }, [lat, lng, adr, radius])

  // Внутри карточки калькулятора, под расчётом - как соседи у помесячной.
  return (
    <div className="mt-10 border-t border-[var(--color-border)] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="text-[12px] uppercase tracking-wide font-semibold text-[var(--color-text)]">{c.title}</div>
        <div className="flex gap-1.5">
          {RADII.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                radius === r
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
              }`}
            >
              {r === 500 ? c.r500 : c.r1000}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
        {band ? c.sub(formatPriceExact(band.min, currency, lang), formatPriceExact(band.max, currency, lang)) : c.subLoading}
        {usedRadius !== null && usedRadius > radius && items?.length ? ` ${c.widened(usedRadius)}` : ''}
      </div>

      {loading && items === null && (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="shrink-0 w-[240px] rounded-xl border border-[var(--color-border)] overflow-hidden">
              <div className="aspect-[4/3] bg-[var(--color-search-bg)]" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 rounded bg-[var(--color-search-bg)]" />
                <div className="h-3 w-2/3 rounded bg-[var(--color-search-bg)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && !loading && (
        <div className="text-[13px] text-[var(--color-text-muted)]">{c.empty}</div>
      )}

      {items !== null && items.length > 0 && (
        /* Одна строка с горизонтальной прокруткой: карточек столько же,
           но блок не растёт вниз. Картинки остаются lazy — те, что справа
           за краем, грузятся по мере прокрутки. */
        <div className="relative">
          <div
            ref={trackRef}
            className={`flex gap-3 overflow-x-auto snap-x scroll-smooth pb-1 [scrollbar-width:thin] ${loading ? 'opacity-60' : ''}`}
          >
          {items.map(it => (
            <div key={`${it.source}-${it.id}`} className="shrink-0 w-[240px] snap-start">
              <BookingCompCard
                href={it.url}
                photo={it.roomPhoto ?? it.image}
                fallbackPhoto={it.image}
                priceUsd={it.price}
                name={it.title ?? ''}
                variant={it.roomType}
                bedrooms={it.bedrooms}
                areaSqm={it.areaSqm}
                distance={it.distanceM != null ? fmtDistance(it.distanceM, c, it.source === 'airbnb') : null}
                mix={it.mix}
                variantOcc={it.roomOcc}
                propertyOcc={it.occupancy}
                compare={compareWith(it)}
                lang={lang}
                size="sm"
                source={it.source}
                rating={it.rating}
                reviews={it.reviews}
              />
            </div>
          ))}
          </div>

          {/* Стрелки — для мыши: колесом ленту горизонтально не прокрутить.
              На тач-устройствах они не нужны, там работает свайп. */}
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={c.prev}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={c.next}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className="mt-3 text-[11.5px] text-[var(--color-text-muted)]">{c.source}</div>
    </div>
  )
}
