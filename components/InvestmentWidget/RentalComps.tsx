'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { formatPriceExact } from '@/lib/currency'
import { InlinePrice } from '../InlinePrice'
import { useCurrency } from '../CurrencyContext'

// «Что рядом сдают за эти же деньги»: живая подборка объектов Booking в
// коридоре вокруг ADR, который посетитель выставил ползунком.
//
// Смысл блока — проверка ставки глазами, а не ещё одна таблица: человек
// видит фотографии, цену за ночь и загрузку тех, с кем реально будет
// конкурировать. Поэтому сегмент не сужается до «вилла, 2 спальни» —
// показываем всё, что попадает в цену и в радиус.

type Item = {
  id: number
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
  /** Загрузка по нашему ежедневному сбору Booking и за сколько ночей. */
  occPct: number | null
  occNights: number | null
  url: string | null
}

const RADII = [500, 1000] as const
/** Ползунок ADR тянут непрерывно — ждём паузы, чтобы не звать API на каждый шаг. */
const DEBOUNCE_MS = 450

const COPY = {
  ru: {
    title: 'Что рядом сдают за эти же деньги',
    sub: (a: string, b: string) => `Всё, что сдаётся на Booking в этом бюджете: от ${b} до ${a} за ночь, сначала самые дорогие.`,
    widened: (r: number) => `Рядом в этой ставке никого, поэтому показываем в радиусе ${r < 1000 ? `${r} м` : `${r / 1000} км`}.`,
    subLoading: 'Подбираем объекты по вашей ставке…',
    empty: 'В этом радиусе и в этой цене на Booking пока никого — попробуйте больший радиус или другую ставку.',
    r500: '500 м',
    r1000: '1 км',
    occ: (n: number, nights: number) => `загрузка ${n}% за ${nights} ${nights % 10 === 1 && nights % 100 !== 11 ? 'ночь' : nights % 10 >= 2 && nights % 10 <= 4 && (nights % 100 < 12 || nights % 100 > 14) ? 'ночи' : 'ночей'}`,
    areaLess: (d: number) => `на ${d} м² меньше вашей`,
    areaMore: (d: number) => `на ${d} м² больше вашей`,
    areaSame: 'площадь как у вашей',
    bedsLess: (d: number) => `на ${d} ${d === 1 ? 'спальню' : d < 5 ? 'спальни' : 'спален'} меньше`,
    bedsMore: (d: number) => `на ${d} ${d === 1 ? 'спальню' : d < 5 ? 'спальни' : 'спален'} больше`,
    perNight: '/ночь',
    m: 'м',
    km: 'км',
    beds: (n: number) => (n === 0 ? 'студия' : `${n} ${n === 1 ? 'спальня' : n < 5 ? 'спальни' : 'спален'}`),
    sqm: 'м²',
    kinds: { villa: 'вилла', apartment: 'апартаменты', hotel: 'отель', resort: 'резорт',
             guesthouse: 'гестхаус', house: 'дом', hostel: 'хостел', aparthotel: 'апарт-отель' } as Record<string, string>,
    source: 'Данные Booking, обновляются ежедневно. Цена — ставка за ночь, которую выставляет объект. Загрузка — наш ежедневный сбор: сколько открытых ночей забронировали.',
    prev: 'Предыдущие объекты',
    next: 'Следующие объекты',
  },
  en: {
    title: 'What the same money rents nearby',
    sub: (a: string, b: string) => `Everything on Booking within this budget: ${b} down to ${a} per night, most expensive first.`,
    widened: (r: number) => `Nothing at this rate right nearby, so we widened the search to ${r < 1000 ? `${r} m` : `${r / 1000} km`}.`,
    subLoading: 'Finding listings at your rate…',
    empty: 'Nothing on Booking in this radius at this price — try a wider radius or another rate.',
    r500: '500 m',
    r1000: '1 km',
    occ: (n: number, nights: number) => `${n}% occupied over ${nights} night${nights === 1 ? '' : 's'}`,
    areaLess: (d: number) => `${d} m² smaller than yours`,
    areaMore: (d: number) => `${d} m² larger than yours`,
    areaSame: 'same size as yours',
    bedsLess: (d: number) => `${d} bedroom${d === 1 ? '' : 's'} fewer`,
    bedsMore: (d: number) => `${d} bedroom${d === 1 ? '' : 's'} more`,
    perNight: '/night',
    m: 'm',
    km: 'km',
    beds: (n: number) => (n === 0 ? 'studio' : `${n} BR`),
    sqm: 'm²',
    kinds: { villa: 'villa', apartment: 'apartment', hotel: 'hotel', resort: 'resort',
             guesthouse: 'guesthouse', house: 'house', hostel: 'hostel', aparthotel: 'aparthotel' } as Record<string, string>,
    source: 'Booking data, refreshed daily. Price is the nightly rate each property lists. Occupancy is our daily tracking: how many open nights got booked.',
    prev: 'Previous listings',
    next: 'Next listings',
  },
} as const

function fmtDistance(m: number, c: { m: string; km: string }): string {
  return m < 950 ? `${Math.round(m / 10) * 10} ${c.m}` : `${(m / 1000).toFixed(1)} ${c.km}`
}

/** Сравнение с объектом на странице: площадь в пределах ±5 м² считаем равной. */
const AREA_SAME_M2 = 5

export function RentalComps({ lat, lng, adr, lang, areaSqm, bedrooms }: {
  lat: number; lng: number; adr: number; lang: Lang
  /** Площадь и спальни объекта на странице — с ними сравниваем соседей. */
  areaSqm?: number | null
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
            <div key={i} className="shrink-0 w-[210px] rounded-xl border border-[var(--color-border)] overflow-hidden">
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
            <a
              key={it.id}
              href={it.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group shrink-0 w-[210px] snap-start rounded-xl border border-[var(--color-border)] overflow-hidden no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
            >
              {/* Фото отдаёт CDN Booking — своего egress не тратим. next/image
                  здесь не нужен: чужие картинки не оптимизируем. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.image ?? ''}
                alt={it.title ?? ''}
                loading="lazy"
                className="block w-full aspect-[4/3] object-cover"
              />
              <div className="p-2.5">
                <div className="text-[13px] font-medium leading-snug line-clamp-2">{it.title}</div>
                {it.roomType && (
                  <div className="mt-0.5 text-[11.5px] leading-snug text-[var(--color-text-muted)] line-clamp-2" title={it.roomType}>{it.roomType}</div>
                )}
                {/* Состав объекта — то, что делает сравнение честным.
                    Площадь у Booking заполнена меньше чем у процента
                    объектов, поэтому показываем её только когда есть. */}
                <div className="mt-1 text-[11.5px] text-[var(--color-text)]">
                  {[
                    it.unitKind ? (c.kinds[it.unitKind] ?? it.unitKind) : null,
                    it.bedrooms != null ? c.beds(it.bedrooms) : null,
                    it.areaSqm != null ? `${Math.round(it.areaSqm)} ${c.sqm}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                  {it.distanceM != null && fmtDistance(it.distanceM, c)}
                </div>
                {/* Чем сосед отличается от объекта на странице. Зелёным — то,
                    в чём объект на странице выигрывает. */}
                {(() => {
                  const diffs: { text: string; ours: boolean }[] = []
                  if (areaSqm && it.areaSqm != null) {
                    const d = Math.round(it.areaSqm - areaSqm)
                    if (Math.abs(d) <= AREA_SAME_M2) diffs.push({ text: c.areaSame, ours: false })
                    else diffs.push(d < 0 ? { text: c.areaLess(-d), ours: true } : { text: c.areaMore(d), ours: false })
                  }
                  if (bedrooms != null && it.bedrooms != null && it.bedrooms !== bedrooms) {
                    const d = it.bedrooms - bedrooms
                    diffs.push(d < 0 ? { text: c.bedsLess(-d), ours: true } : { text: c.bedsMore(d), ours: false })
                  }
                  if (diffs.length === 0) return null
                  return (
                    <div className="mt-1 space-y-0.5 text-[11.5px] leading-snug">
                      {diffs.map(x => (
                        <div key={x.text} className={x.ours ? 'text-[var(--color-primary-pressed)]' : 'text-[var(--color-text-muted)]'}>{x.text}</div>
                      ))}
                    </div>
                  )
                })()}
                <div className="mt-1.5 text-[14px] font-semibold text-[var(--color-primary-pressed)]">
                  {it.price != null && <InlinePrice usd={it.price} lang={lang} />}
                  <span className="text-[11px] font-normal text-[var(--color-text-muted)]">{c.perNight}</span>
                </div>
                {it.occPct != null && it.occNights != null && (
                  <div className="mt-0.5 text-[11.5px] text-[var(--color-text)]">{c.occ(it.occPct, it.occNights)}</div>
                )}
              </div>
            </a>
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
