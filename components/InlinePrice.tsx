'use client'

import { useCurrency } from './CurrencyContext'
import { formatPrice, formatPriceExact } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

// Inline price text: rupiah first (the site's main currency since 2026-10-15),
// then a muted "≈ $X" in the visitor's chosen currency. `approx={false}` for
// tight spots such as "from X to Y" ranges, where two currencies per number
// would turn the line into noise.
export function InlinePrice({ usd, className, lang = 'ru', approx = true }: { usd: number; className?: string; lang?: Lang; approx?: boolean }) {
  const { currency, secondary } = useCurrency()
  return (
    <span className={className}>
      {formatPriceExact(usd, currency, lang)}
      {approx && secondary && <span className="font-normal text-[0.85em] text-[var(--color-text-muted)]"> ≈ {formatPrice(usd, secondary, lang)}</span>}
    </span>
  )
}

// "≈ $130K" under a rupiah price, in the visitor's chosen currency; nothing
// when they picked rupiah themselves.
export function ApproxPrice({ usd, className, lang = 'ru' }: { usd: number; className?: string; lang?: Lang }) {
  const { secondary } = useCurrency()
  if (!secondary) return null
  return <span className={className}>≈ {formatPrice(usd, secondary, lang)}</span>
}
