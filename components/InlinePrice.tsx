'use client'

import { useCurrency } from './CurrencyContext'
import { formatPriceExact } from '@/lib/currency'

// Inline price text in the active currency. Used inside server-rendered prose
// where we just need a single value (e.g. "Юниты от $X").
export function InlinePrice({ usd, className }: { usd: number; className?: string }) {
  const { currency } = useCurrency()
  return <span className={className}>{formatPriceExact(usd, currency)}</span>
}
