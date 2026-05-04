'use client'

import Link from 'next/link'
import { PhotoSlider } from './PhotoSlider'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'

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
}

export function VillaCard({ a }: { a: VillaCardData }) {
  const { currency } = useCurrency()
  const price = a.priceUsd != null && Number.isFinite(a.priceUsd)
    ? formatPrice(a.priceUsd, currency)
    : null
  const dealLabel = a.dealType === 'resale' ? 'Перепродажа'
    : a.dealType === 'secondary' ? 'Вторичка'
    : null
  return (
    <Link
      href={`/ru/villy/o/${a.slug}`}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      <div className="relative">
        <PhotoSlider photos={a.photos} alt={a.title} trackingId={`villa:${a.slug}`} />
        {dealLabel && (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide bg-white text-[#111827] rounded-full px-2.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            {dealLabel}
          </span>
        )}
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
          {a.area != null && <span>Дом: {a.area} м²</span>}
          {a.land != null && <span>Земля: {a.land} м²</span>}
          {a.district && <span>{a.district}</span>}
        </div>
      </div>
    </Link>
  )
}
