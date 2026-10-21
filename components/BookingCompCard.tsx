'use client'

import { useState } from 'react'
import { BedDouble, Building2, ChartNoAxesColumn, Ruler, Star } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { pluralRu } from '@/lib/plural-ru'
import { InlinePrice } from './InlinePrice'

// Карточка соседа на Booking — одна для «Будет ли спрос → Посуточно» и для
// ленты «Что рядом сдают за эти же деньги» в калькуляторе.
//
// Порядок — как человек читает соседа (просьба владельца 21.10.2026):
// фото именно этого варианта с загрузкой поверх → цена за ночь → что это
// (вариант) и где (объект) → спальни, площадь, расстояние → из чего состоит
// объект и как загружен целиком → чем отличается от объекта на странице.
//
// Та же карточка показывает соседа с Airbnb (21.10.2026): там загрузки пока
// нет — вместо неё рейтинг и число отзывов, а площадка подписана на фото.

export type CompMix = { villas: number; apartments: number; rooms: number }

const COPY = {
  ru: {
    perNight: 'за ночь',
    beds: (n: number) => (n === 0 ? 'студия' : `${n} ${pluralRu(n, ['спальня', 'спальни', 'спален'])}`),
    sqm: 'м²',
    // Период — месяц: знаменатель у estatemarket 31 ночь (migrations/128).
    booked: (p: number) => `Занято ${p}% за месяц`,
    mix: (m: CompMix) => 'В объекте ' + [
      m.villas ? `${m.villas} ${pluralRu(m.villas, ['вилла', 'виллы', 'вилл'])}` : '',
      m.apartments ? `${m.apartments} ${pluralRu(m.apartments, ['апартаменты', 'апартаментов', 'апартаментов'])}` : '',
      m.rooms ? `${m.rooms} ${pluralRu(m.rooms, ['номер', 'номера', 'номеров'])}` : '',
    ].filter(Boolean).join(', '),
    whole: (p: number) => `Весь объект за месяц - ${p}%`,
    reviews: (n: number) => `${n} ${pluralRu(n, ['отзыв', 'отзыва', 'отзывов'])}`,
    newListing: 'Новое',
  },
  en: {
    perNight: 'per night',
    beds: (n: number) => (n === 0 ? 'studio' : `${n} BR`),
    sqm: 'm²',
    booked: (p: number) => `${p}% booked a month`,
    mix: (m: CompMix) => 'Property has ' + [
      m.villas ? `${m.villas} villa${m.villas === 1 ? '' : 's'}` : '',
      m.apartments ? `${m.apartments} apartment${m.apartments === 1 ? '' : 's'}` : '',
      m.rooms ? `${m.rooms} room${m.rooms === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(', '),
    whole: (p: number) => `Whole property ${p}% a month`,
    reviews: (n: number) => `${n} review${n === 1 ? '' : 's'}`,
    newListing: 'New',
  },
} as const

export function mixTotal(m: CompMix | null | undefined): number {
  return m ? m.villas + m.apartments + m.rooms : 0
}

/** Точка у загрузки: те же три цвета, что у шкал готовности на сайте. */
function occColor(p: number): string {
  if (p >= 75) return 'var(--color-progress-hi)'
  if (p >= 50) return 'var(--color-progress-mid)'
  return 'var(--color-progress-low)'
}

export function BookingCompCard({
  href, photo, fallbackPhoto, priceUsd, name, variant, bedrooms, areaSqm, distance,
  mix, variantOcc, propertyOcc, compare = [], lang, size = 'md',
  source, rating, reviews,
}: {
  href: string | null
  photo: string | null
  /** Запасное фото (обычно общий кадр объекта), если основное не грузится. */
  fallbackPhoto?: string | null
  priceUsd: number | null
  /** Объект на Booking (комплекс, отель, вилла). */
  name: string
  /** Вариант, чья цена показана («Two Bedroom Family Villa»). */
  variant: string | null
  bedrooms: number | null
  areaSqm: number | null
  /** Уже отформатированное расстояние («660 м»). */
  distance: string | null
  mix?: CompMix | null
  /** Загрузка варианта и всего объекта, % (estatemarket). */
  variantOcc?: number | null
  propertyOcc?: number | null
  /** Сравнение с объектом на странице; good — в его пользу. */
  compare?: { text: string; good: boolean; kind?: 'area' | 'beds' }[]
  lang: Lang
  size?: 'sm' | 'md'
  /** Подпись площадки на фото — где лента смешанная. */
  source?: 'booking' | 'airbnb'
  /** Рейтинг гостей (Airbnb, из 5) — показывается, когда загрузки нет. */
  rating?: number | null
  reviews?: number | null
}) {
  const c = pickCopy(COPY, lang)
  // Ссылки на фото у Booking со временем умирают: тогда пробуем запасное,
  // а без него оставляем пустую подложку вместо значка битой картинки.
  const candidates = [photo, fallbackPhoto].filter((u, i, a): u is string => !!u && a.indexOf(u) === i)
  const [failed, setFailed] = useState(0)
  const src = candidates[failed] ?? null
  const multi = mixTotal(mix) > 1
  const badge = variantOcc ?? propertyOcc ?? null
  // Строка «весь объект» нужна, только если бейдж показывает вариант и
  // загрузка объекта от неё заметно отличается.
  const showWhole = multi && variantOcc != null && propertyOcc != null && Math.abs(variantOcc - propertyOcc) >= 5
  const title = variant ?? name
  const sub = variant && variant !== name ? name : null
  const specs = [
    bedrooms != null ? c.beds(bedrooms) : null,
    areaSqm != null ? `${Math.round(areaSqm)} ${c.sqm}` : null,
    distance,
  ].filter(Boolean)
  const pad = size === 'sm' ? 'p-3' : 'p-4'

  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] no-underline transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      <span className="relative block aspect-[3/2] bg-[var(--color-search-bg)]">
        {src && (
          // Фото отдаёт CDN Booking — своего egress не тратим, чужие
          // картинки не оптимизируем.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(f => f + 1)} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {source && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[12px] font-semibold text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/.06),0_4px_12px_rgb(0_0_0/.08)]">
            {source === 'airbnb' ? 'Airbnb' : 'Booking'}
          </span>
        )}
        {badge == null && (rating != null || reviews === 0) && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/.06),0_4px_12px_rgb(0_0_0/.08)]">
            {rating != null ? (
              <>
                <Star size={13} aria-hidden className="fill-current" />
                {lang === 'ru' ? rating.toFixed(2).replace(/0$/, '').replace('.', ',') : rating.toFixed(2).replace(/0$/, '')}
                {reviews ? <span className="font-normal text-[var(--color-text-muted)]">· {c.reviews(reviews)}</span> : null}
              </>
            ) : c.newListing}
          </span>
        )}
        {badge != null && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/.06),0_4px_12px_rgb(0_0_0/.08)]">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: occColor(badge) }} />
            {c.booked(Math.round(badge))}
          </span>
        )}
      </span>

      <span className={`flex flex-1 flex-col ${pad}`}>
        {priceUsd != null && (
          <span className="text-[20px] font-semibold leading-tight tracking-tight">
            <InlinePrice usd={priceUsd} lang={lang} approx={false} />{' '}
            <span className="text-[13px] font-normal text-[var(--color-text-muted)]">{c.perNight}</span>
          </span>
        )}
        <span className="mt-2 text-[14px] font-semibold leading-snug line-clamp-2" title={title}>{title}</span>
        {sub && <span className="mt-0.5 text-[13px] leading-snug text-[var(--color-text-muted)] line-clamp-1" title={sub}>{sub}</span>}
        {specs.length > 0 && <span className="mt-2 text-[13px] text-[var(--color-text-muted)]">{specs.join(' · ')}</span>}

        {(multi || showWhole || compare.length > 0) && (
          <span className="mt-3 flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-3 text-[13px] leading-snug">
            {multi && mix && (
              <span className="flex items-start gap-2"><Building2 size={14} aria-hidden className="mt-[2px] shrink-0 text-[var(--color-text-muted)]" />{c.mix(mix)}</span>
            )}
            {showWhole && (
              <span className="flex items-start gap-2"><ChartNoAxesColumn size={14} aria-hidden className="mt-[2px] shrink-0 text-[var(--color-text-muted)]" />{c.whole(Math.round(propertyOcc!))}</span>
            )}
            {compare.map(x => (
              <span key={x.text} className={`flex items-start gap-2 ${x.good ? 'text-[var(--color-primary-pressed)]' : 'text-[var(--color-text-muted)]'}`}>
                {x.kind === 'beds'
                  ? <BedDouble size={14} aria-hidden className="mt-[2px] shrink-0" />
                  : <Ruler size={14} aria-hidden className="mt-[2px] shrink-0" />}
                {x.text}
              </span>
            ))}
          </span>
        )}
      </span>
    </a>
  )
}
