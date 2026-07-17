'use client'

import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

// Renders a price using the visitor's chosen currency. Single line — matches
// the format used on villa / apartment cards.
export function PriceDisplay({
  usd,
  suffix,
  size = 'lg',
  lang = 'ru',
}: {
  usd: number
  suffix?: string
  size?: 'lg' | 'md'
  lang?: Lang
}) {
  const { currency } = useCurrency()
  const main = formatPrice(usd, currency, lang)
  const mainCls = size === 'lg' ? 'text-[28px]' : 'text-[20px]'
  return (
    <div className={`${mainCls} font-semibold text-[#111827]`}>
      {main}
      {suffix && (
        <span className="text-[14px] font-normal text-[var(--color-text-muted)]"> {suffix}</span>
      )}
    </div>
  )
}
