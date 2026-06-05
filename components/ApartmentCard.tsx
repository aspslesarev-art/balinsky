'use client'

import Link from 'next/link'
import { PhotoSlider } from './PhotoSlider'
import { useCurrency } from './CurrencyContext'
import { WishlistButton } from './WishlistButton'
import { formatPriceExact } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

export type ApartmentCardData = {
  slug: string
  title: string
  priceUsd: number | null
  bedrooms: number | null
  area: number | null
  floor: string | null
  photos: string[]
  district?: string | null
  // 'resale' / 'secondary' = sold by an owner / agent rather than the
  // developer. Drives the "Перепродажа" badge and the contact routing
  // on the detail page (direct seller link instead of dev manager).
  dealType?: 'resale' | 'secondary' | null
  // Optional fields piped into the wishlist snapshot at heart-tap so
  // saved apartments carry investor-relevant context.
  developerName?: string | null
  developerCompletedCount?: number | null
  developerInProgressCount?: number | null
  pricePerSqmUsd?: number | null
  pricePerSqmYearUsd?: number | null
  leaseYears?: number | null
  permit?: string | null
  completionYear?: string | null
  claimedYieldPct?: number | null
  status?: string | null
  // Airtable record ID — saved into the wishlist so the agent PDF
  // can print a lookup code searchable on the catalog.
  airtableId?: string | null
}

const COPY = {
  ru: { sqm: 'м²', floor: 'Этаж', resale: 'Перепродажа', secondary: 'Вторичка' },
  en: { sqm: 'm²', floor: 'Floor', resale: 'Resale',     secondary: 'Secondary' },
} as const

export function ApartmentCard({ a, lang = 'ru' }: { a: ApartmentCardData; lang?: Lang }) {
  const { currency } = useCurrency()
  const c = COPY[lang]
  const price = a.priceUsd != null && Number.isFinite(a.priceUsd)
    ? formatPriceExact(a.priceUsd, currency)
    : null
  const dealLabel = a.dealType === 'resale' ? c.resale
    : a.dealType === 'secondary' ? c.secondary
    : null
  const detailHref = lang === 'en' ? `/en/apartments/o/${a.slug}` : `/ru/apartamenty/o/${a.slug}`

  return (
    <Link
      href={detailHref}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      <div className="relative">
        <PhotoSlider photos={a.photos} alt={a.title} trackingId={`apt:${a.slug}`} />
        {dealLabel && (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide bg-white text-[#111827] rounded-full px-2.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            {dealLabel}
          </span>
        )}
        <WishlistButton
          className="absolute top-3 right-3 z-10"
          item={{
            kind: 'apartment', slug: a.slug, title: a.title,
            photo: a.photos?.[0] ?? null,
            priceUsd: a.priceUsd ?? null,
            district: a.district ?? null,
            bedrooms: a.bedrooms ?? null,
            area: a.area ?? null,
            floor: a.floor ?? null,
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
            dealType: a.dealType === 'resale' ? 'resale' : a.dealType === 'secondary' ? 'secondary' : 'primary',
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
          {a.area != null && <span>{a.area} {c.sqm}</span>}
          {a.floor && <span>{c.floor}: {a.floor}</span>}
        </div>
      </div>
    </Link>
  )
}
