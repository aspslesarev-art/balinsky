'use client'

import { useState } from 'react'
import { Star, MapPin, ExternalLink } from 'lucide-react'
import type { NearbyCategory, NearbyPlace } from '@/lib/nearby-places'
import type { Lang } from '@/lib/i18n'

const ICONS: Record<string, string> = {
  beach: '🏝️',
  restaurant: '🍽️',
  cafe: '☕️',
  nightlife: '🍸',
  attraction: '✨',
  wellness: '🧘',
  beachclub: '🏖️',
}

// EN titles per category key — manifest stores RU titles only.
const TITLE_EN: Record<string, string> = {
  beach: 'Beaches',
  restaurant: 'Restaurants',
  cafe: 'Cafés',
  nightlife: 'Bars & clubs',
  attraction: 'Attractions',
  school: 'Schools',
  preschool: 'Nurseries & preschools',
  supermarket: 'Supermarkets',
  pharmacy: 'Pharmacies',
  hospital: 'Hospitals & clinics',
  wellness: 'Yoga & fitness',
  beachclub: 'Beach clubs',
  international_school: 'International schools',
}

const COPY = {
  ru: {
    h2: 'Что рядом',
    subtitle: 'Популярные места поблизости — данные Google Maps',
    onMap: 'На карте',
    free: 'бесплатно',
  },
  en: {
    h2: "What's nearby",
    subtitle: 'Popular spots nearby — sourced from Google Maps',
    onMap: 'View on map',
    free: 'free',
  },
} as const

function fmtDistance(km: number, lang: Lang): string {
  const mUnit = lang === 'en' ? 'm' : 'м'
  const kmUnit = lang === 'en' ? 'km' : 'км'
  if (km < 1) return `${Math.round(km * 1000)} ${mUnit}`
  return `${km.toFixed(1)} ${kmUnit}`
}

export function NearbyPlaces({
  categories,
  byCategory,
  lang = 'ru',
}: {
  categories: NearbyCategory[]
  byCategory: Record<string, NearbyPlace[]>
  lang?: Lang
}) {
  const c = COPY[lang]
  const available = categories.filter(cat => (byCategory[cat.key] ?? []).length > 0)
  const [active, setActive] = useState<string | null>(available[0]?.key ?? null)
  if (available.length === 0) return null

  const places: NearbyPlace[] = active
    ? [...(byCategory[active] ?? [])].sort((a, b) => a.distanceKm - b.distanceKm)
    : []
  const numberLocale = lang === 'en' ? 'en-GB' : 'ru-RU'

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        {c.h2}
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-4">
        {c.subtitle}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {available.map(cat => {
          const isActive = cat.key === active
          const count = byCategory[cat.key]?.length ?? 0
          const title = lang === 'en' ? (TITLE_EN[cat.key] ?? cat.title) : cat.title
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActive(cat.key)}
              className={
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ' +
                (isActive
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]')
              }
            >
              <span>{ICONS[cat.key] ?? '📍'}</span>
              <span>{title}</span>
              <span className={isActive ? 'opacity-90' : 'text-[var(--color-text-muted)]'}>· {count}</span>
            </button>
          )
        })}
      </div>

      {/* Mobile: horizontal swipe with the next card peeking; desktop: grid.
          max-w-none releases the `main * { max-width: 100% }` guard so the
          -mx-6 track reaches the screen edges instead of leaving a gap. */}
      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-6 px-6 max-w-none md:max-w-full md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {places.map(p => (
          <li
            key={p.id}
            className="snap-start shrink-0 w-[280px] md:w-auto rounded-2xl border border-[var(--color-border)] bg-white p-4 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[15px] font-semibold leading-snug text-[#111827] line-clamp-2">{p.name}</div>
              <div className="text-[12px] text-[var(--color-text-muted)] shrink-0 mt-0.5">{fmtDistance(p.distanceKm, lang)}</div>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-muted)]">
              {p.rating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                  <span className="font-medium text-[#111827]">{p.rating.toFixed(1)}</span>
                  {p.reviews != null && <span>· {p.reviews.toLocaleString(numberLocale).replace(/,/g, ' ')}</span>}
                </span>
              )}
              {p.priceLevel && (
                <span>{priceLevelToSymbol(p.priceLevel, c.free)}</span>
              )}
            </div>
            {p.address && (
              <div className="flex items-start gap-1.5 text-[12px] text-[var(--color-text-muted)]">
                <MapPin size={12} className="shrink-0 mt-0.5" />
                <span className="line-clamp-1">{p.address}</span>
              </div>
            )}
            {p.mapsUrl && (
              <a
                href={p.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline mt-auto"
              >
                <ExternalLink size={12} />
                {c.onMap}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function priceLevelToSymbol(level: string, freeLabel: string): string {
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: freeLabel,
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  }
  return map[level] ?? ''
}
