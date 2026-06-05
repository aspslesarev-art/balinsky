'use client'

import Link from 'next/link'
import { PhotoSlider } from './PhotoSlider'
import { useCurrency } from './CurrencyContext'
import { WishlistButton } from './WishlistButton'
import { formatPriceExact } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

export type VillaCardData = {
  slug: string
  title: string
  priceUsd: number | null
  bedrooms: number | null
  area: number | null
  land: number | null
  district: string | null
  status: string | null
  photos: string[]
  investmentScore?: number | null
  // 'resale' / 'secondary' = sold by an owner / agent rather than the
  // developer. Drives the "Перепродажа" badge and the contact routing
  // on the detail page (direct seller contact instead of dev manager).
  dealType?: 'resale' | 'secondary' | null
  // Optional fields piped into the wishlist snapshot at heart-tap so
  // saved listings carry investor-relevant context out of the catalog
  // without needing to open the detail page first.
  developerName?: string | null
  developerCompletedCount?: number | null
  developerInProgressCount?: number | null
  pricePerSqmUsd?: number | null
  pricePerSqmYearUsd?: number | null
  leaseYears?: number | null
  permit?: string | null
  completionYear?: string | null
  claimedYieldPct?: number | null
  bestCapRate?: number | null
  interiorStyle?: string | null
  // Airtable record ID, piped into the wishlist snapshot so the
  // agent PDF can print a lookup code and the catalog search can
  // resolve a paste-back. Optional for safety against legacy callers.
  airtableId?: string | null
}

const COPY = {
  ru: { resale: 'Перепродажа', secondary: 'Вторичка', house: 'Дом', land: 'Земля', sqm: 'м²' },
  en: { resale: 'Resale',      secondary: 'Secondary', house: 'House', land: 'Land', sqm: 'm²' },
} as const

export function VillaCard({ a, lang = 'ru' }: { a: VillaCardData; lang?: Lang }) {
  const { currency } = useCurrency()
  const copy = COPY[lang]
  const price = a.priceUsd != null && Number.isFinite(a.priceUsd)
    ? formatPriceExact(a.priceUsd, currency)
    : null
  const dealLabel = a.dealType === 'resale' ? copy.resale
    : a.dealType === 'secondary' ? copy.secondary
    : null
  const detailHref = lang === 'en' ? `/en/villas/o/${a.slug}` : `/ru/villy/o/${a.slug}`
  return (
    <Link
      href={detailHref}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      <div className="relative">
        <PhotoSlider photos={a.photos} alt={a.title} trackingId={`villa:${a.slug}`} />
        {dealLabel && (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide bg-white text-[#111827] rounded-full px-2.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            {dealLabel}
          </span>
        )}
        <WishlistButton
          className="absolute top-3 right-3 z-10"
          item={{
            kind: 'villa', slug: a.slug, title: a.title,
            photo: a.photos?.[0] ?? null,
            priceUsd: a.priceUsd ?? null,
            district: a.district ?? null,
            bedrooms: a.bedrooms ?? null,
            area: a.area ?? null,
            land: a.land ?? null,
            dealType: a.dealType === 'resale' ? 'resale' : a.dealType === 'secondary' ? 'secondary' : 'primary',
            developerName: a.developerName ?? null,
            developerCompletedCount: a.developerCompletedCount ?? null,
            developerInProgressCount: a.developerInProgressCount ?? null,
            pricePerSqmUsd: a.pricePerSqmUsd ?? null,
            pricePerSqmYearUsd: a.pricePerSqmYearUsd ?? null,
            leaseYears: a.leaseYears ?? null,
            permit: a.permit ?? null,
            completionYear: a.completionYear ?? null,
            claimedYieldPct: a.claimedYieldPct ?? null,
            status: a.status ?? null,
            bestCapRate: a.bestCapRate ?? null,
            interiorStyle: a.interiorStyle ?? null,
            airtableId: a.airtableId ?? null,
          }}
        />
      </div>

      <div className="p-6">
        <h3
          className="text-[20px] font-semibold text-[var(--color-text)] leading-[1.3] mb-4 overflow-hidden"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        >
          {a.title}
        </h3>

        {price && (
          <div className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{price}</div>
        )}

        <div className="flex items-center flex-wrap gap-x-5 gap-y-1 text-[14px] text-[var(--color-text-muted)]">
          {a.bedrooms != null && <span>{a.bedrooms} BR</span>}
          {a.area != null && <span>{copy.house}: {a.area} {copy.sqm}</span>}
          {a.land != null && <span>{copy.land}: {a.land} {copy.sqm}</span>}
          {a.district && <span>{a.district}</span>}
        </div>
      </div>
    </Link>
  )
}
