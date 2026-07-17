'use client'

import { useCurrency } from './CurrencyContext'
import { formatPriceExact } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

// Inline price text in the active currency. Used inside server-rendered prose
// where we just need a single value (e.g. "Юниты от $X").
export function InlinePrice({ usd, className, lang = 'ru' }: { usd: number; className?: string; lang?: Lang }) {
  const { currency } = useCurrency()
  return <span className={className}>{formatPriceExact(usd, currency, lang)}</span>
}
