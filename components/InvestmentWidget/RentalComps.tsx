'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

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
  url: string | null
}

const RADII = [500, 1000] as const
/** Ползунок ADR тянут непрерывно — ждём паузы, чтобы не звать API на каждый шаг. */
const DEBOUNCE_MS = 450

const COPY = {
  ru: {
    title: 'Что рядом сдают за эти же деньги',
    sub: (a: number, b: number) => `Объекты Booking со ставкой $${a}–${b} за ночь — коридор вокруг вашего ADR.`,
    subLoading: 'Подбираем объекты по вашей ставке…',
    empty: 'В этом радиусе и в этой цене на Booking пока никого — попробуйте больший радиус или другую ставку.',
    r500: '500 м',
    r1000: '1 км',
    occ: (n: number) => `загрузка ${n}%`,
    perNight: '/ночь',
    m: 'м',
    km: 'км',
    beds: (n: number) => (n === 0 ? 'студия' : `${n} ${n === 1 ? 'спальня' : n < 5 ? 'спальни' : 'спален'}`),
    sqm: 'м²',
    kinds: { villa: 'вилла', apartment: 'апартаменты', hotel: 'отель', resort: 'резорт',
             guesthouse: 'гестхаус', house: 'дом', hostel: 'хостел', aparthotel: 'апарт-отель' } as Record<string, string>,
    source: 'Данные Booking, обновляются ежедневно. Загрузка — за последний доступный период.',
    prev: 'Предыдущие объекты',
    next: 'Следующие объекты',
  },
  en: {
    title: 'What the same money rents nearby',
    sub: (a: number, b: number) => `Booking listings at $${a}–${b} per night — the band around your ADR.`,
    subLoading: 'Finding listings at your rate…',
    empty: 'Nothing on Booking in this radius at this price — try a wider radius or another rate.',
    r500: '500 m',
    r1000: '1 km',
    occ: (n: number) => `${n}% occupancy`,
    perNight: '/night',
    m: 'm',
    km: 'km',
    beds: (n: number) => (n === 0 ? 'studio' : `${n} BR`),
    sqm: 'm²',
    kinds: { villa: 'villa', apartment: 'apartment', hotel: 'hotel', resort: 'resort',
             guesthouse: 'guesthouse', house: 'house', hostel: 'hostel', aparthotel: 'aparthotel' } as Record<string, string>,
    source: 'Booking data, refreshed daily. Occupancy is for the latest available period.',
    prev: 'Previous listings',
    next: 'Next listings',
  },
} as const

function fmtDistance(m: number, c: { m: string; km: string }): string {
  return m < 950 ? `${Math.round(m / 10) * 10} ${c.m}` : `${(m / 1000).toFixed(1)} ${c.km}`
}

export function RentalComps({ lat, lng, adr, lang }: { lat: number; lng: number; adr: number; lang: Lang }) {
  const [radius, setRadius] = useState<number>(500)
  const [items, setItems] = useState<Item[] | null>(null)
  const [band, setBand] = useState<{ min: number; max: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const c = pickCopy(COPY, lang)

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
          } else {
            setItems([])
          }
        })
        .catch(() => { if (!cancelled) setItems([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, DEBOUNCE_MS)
    return () => { cancelled = true; ctrl.abort(); clearTimeout(timer) }
  }, [lat, lng, adr, radius])

  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="text-[12px] uppercase tracking-wide font-semibold text-[#111827]">{c.title}</div>
        <div className="flex gap-1.5">
          {RADII.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                radius === r
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[#111827] hover:border-[var(--color-primary)]'
              }`}
            >
              {r === 500 ? c.r500 : c.r1000}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[13px] text-[var(--color-text-muted)] mb-4">
        {band ? c.sub(band.min, band.max) : c.subLoading}
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
              className="group shrink-0 w-[210px] snap-start rounded-xl border border-[var(--color-border)] overflow-hidden no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
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
                {/* Состав объекта — то, что делает сравнение честным.
                    Площадь у Booking заполнена меньше чем у процента
                    объектов, поэтому показываем её только когда есть. */}
                <div className="mt-1 text-[11.5px] text-[#111827]">
                  {[
                    it.unitKind ? (c.kinds[it.unitKind] ?? it.unitKind) : null,
                    it.bedrooms != null ? c.beds(it.bedrooms) : null,
                    it.areaSqm != null ? `${Math.round(it.areaSqm)} ${c.sqm}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                  {it.distanceM != null && fmtDistance(it.distanceM, c)}
                  {it.occupancy != null && <> · {c.occ(Math.round(it.occupancy))}</>}
                </div>
                <div className="mt-1.5 text-[14px] font-semibold text-[var(--color-primary-pressed)]">
                  ${it.price}
                  <span className="text-[11px] font-normal text-[var(--color-text-muted)]">{c.perNight}</span>
                </div>
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
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 text-[#111827] hover:text-[var(--color-primary)]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={c.next}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 text-[#111827] hover:text-[var(--color-primary)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className="mt-3 text-[11.5px] text-[var(--color-text-muted)]">{c.source}</div>
    </div>
  )
}
