'use client'

import Link from 'next/link'
import { ProgressBar } from './ProgressBar'
import { PhotoSlider } from './PhotoSlider'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'

export type ComplexCardData = {
  slug: string
  name: string
  location: string | null
  types: string | null
  permit: string | null
  readiness: number
  coverUrl: string | null
  photos: string[]
  photoCount: number
  villaPriceFrom: number | null
  villaPriceTo: number | null
  aptPriceFrom: number | null
  aptPriceTo: number | null
}

function fmtRange(from: number | null, to: number | null, currency: 'USD' | 'EUR' | 'RUB' | 'UAH' | 'IDR'): string | null {
  if (from == null && to == null) return null
  const f = from != null ? formatPrice(from, currency) : null
  const t = to != null ? formatPrice(to, currency) : null
  if (f && t && from === to) return f
  if (f && t) return `от ${f} до ${t}`
  if (f) return `от ${f}`
  if (t) return `до ${t}`
  return null
}

export function ComplexCard({ c }: { c: ComplexCardData }) {
  const { currency } = useCurrency()
  // Prefer the synced storage photos (multi-image slider). Fallback to the
  // single cover image if the manifest doesn't have entries yet.
  const slides = c.photos.length > 0 ? c.photos : c.coverUrl ? [c.coverUrl] : []
  const villaRange = fmtRange(c.villaPriceFrom, c.villaPriceTo, currency)
  const aptRange = fmtRange(c.aptPriceFrom, c.aptPriceTo, currency)

  return (
    <Link
      href={`/ru/zhilye-kompleksy/o/${c.slug}`}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-sm transition-shadow"
    >
      <PhotoSlider photos={slides} alt={c.name} heightClass="h-[240px] md:h-[360px]" />

      <div className="p-6">
        <h3 className="text-[24px] font-semibold text-[var(--color-text)] mb-3 truncate">{c.name}</h3>
        {c.location && (
          <div className="text-[15px] text-[var(--color-text)] mb-3">{c.location}</div>
        )}
        {c.types && (
          <div className="text-[15px] text-[var(--color-text-muted)] mb-3">{c.types}</div>
        )}
        {(villaRange || aptRange) && (
          <div className="space-y-1 mb-4 text-[14px]">
            {villaRange && (
              <div className="text-[var(--color-text)]">
                <span className="text-[var(--color-text-muted)]">Виллы </span>
                <span className="font-medium">{villaRange}</span>
              </div>
            )}
            {aptRange && (
              <div className="text-[var(--color-text)]">
                <span className="text-[var(--color-text-muted)]">Апартаменты </span>
                <span className="font-medium">{aptRange}</span>
              </div>
            )}
          </div>
        )}
        <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
          Разрешение на строительство: {c.permit ?? 'нет'}
        </div>
        <div className="text-[14px] font-medium text-[var(--color-text)] mb-2">
          Готовность строительства
        </div>
        <ProgressBar value={c.readiness} />
      </div>
    </Link>
  )
}
