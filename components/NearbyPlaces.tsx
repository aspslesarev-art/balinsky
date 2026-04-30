'use client'

import { useState } from 'react'
import { Star, MapPin, ExternalLink } from 'lucide-react'
import type { NearbyCategory, NearbyPlace } from '@/lib/nearby-places'

const ICONS: Record<string, string> = {
  beach: '🏝️',
  restaurant: '🍽️',
  cafe: '☕️',
  nightlife: '🍸',
  attraction: '✨',
  wellness: '🧘',
  beachclub: '🏖️',
}

function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`
  return `${km.toFixed(1)} км`
}

export function NearbyPlaces({
  categories,
  byCategory,
}: {
  categories: NearbyCategory[]
  byCategory: Record<string, NearbyPlace[]>
}) {
  const available = categories.filter(c => (byCategory[c.key] ?? []).length > 0)
  const [active, setActive] = useState<string | null>(available[0]?.key ?? null)
  if (available.length === 0) return null

  const places: NearbyPlace[] = active
    ? [...(byCategory[active] ?? [])].sort((a, b) => a.distanceKm - b.distanceKm)
    : []

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        Что рядом
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-4">
        Популярные места поблизости — данные Google Maps
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {available.map(c => {
          const isActive = c.key === active
          const count = byCategory[c.key]?.length ?? 0
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActive(c.key)}
              className={
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ' +
                (isActive
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]')
              }
            >
              <span>{ICONS[c.key] ?? '📍'}</span>
              <span>{c.title}</span>
              <span className={isActive ? 'opacity-90' : 'text-[var(--color-text-muted)]'}>· {count}</span>
            </button>
          )
        })}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {places.map(p => (
          <li
            key={p.id}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-4 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[15px] font-semibold leading-snug text-[#111827] line-clamp-2">{p.name}</div>
              <div className="text-[12px] text-[var(--color-text-muted)] shrink-0 mt-0.5">{fmtDistance(p.distanceKm)}</div>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-muted)]">
              {p.rating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                  <span className="font-medium text-[#111827]">{p.rating.toFixed(1)}</span>
                  {p.reviews != null && <span>· {p.reviews.toLocaleString('ru-RU').replace(/,/g, ' ')}</span>}
                </span>
              )}
              {p.priceLevel && (
                <span>{priceLevelToSymbol(p.priceLevel)}</span>
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
                На карте
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function priceLevelToSymbol(level: string): string {
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: 'бесплатно',
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  }
  return map[level] ?? ''
}
