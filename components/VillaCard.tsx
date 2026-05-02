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
}

export function VillaCard({ a }: { a: VillaCardData }) {
  const { currency } = useCurrency()
  const price = a.priceUsd != null && Number.isFinite(a.priceUsd)
    ? formatPrice(a.priceUsd, currency)
    : null
  return (
    <Link
      href={`/ru/villy/o/${a.slug}`}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden"
    >
      <PhotoSlider photos={a.photos} alt={a.title} trackingId={`villa:${a.slug}`} />

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
