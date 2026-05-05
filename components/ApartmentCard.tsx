'use client'

import Link from 'next/link'
import { PhotoSlider } from './PhotoSlider'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

export type ApartmentCardData = {
  slug: string
  title: string
  priceUsd: number | null
  bedrooms: number | null
  area: number | null
  floor: string | null
  photos: string[]
}

const COPY = {
  ru: { sqm: 'м²', floor: 'Этаж' },
  en: { sqm: 'm²', floor: 'Floor' },
} as const

export function ApartmentCard({ a, lang = 'ru' }: { a: ApartmentCardData; lang?: Lang }) {
  const { currency } = useCurrency()
  const c = COPY[lang]
  const price = a.priceUsd != null && Number.isFinite(a.priceUsd)
    ? formatPrice(a.priceUsd, currency)
    : null
  const detailHref = lang === 'en' ? `/en/apartments/o/${a.slug}` : `/ru/apartamenty/o/${a.slug}`

  return (
    <Link
      href={detailHref}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      <PhotoSlider photos={a.photos} alt={a.title} trackingId={`apt:${a.slug}`} />

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
