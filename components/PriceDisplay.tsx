'use client'

import { useCurrency } from './CurrencyContext'
import { CURRENCY_RATES, formatPrice } from '@/lib/currency'

// Renders a price using the visitor's chosen currency, with the alternate
// (USD when the pick is non-USD; IDR when the pick is USD) underneath as a
// quiet reference line.
export function PriceDisplay({
  usd,
  suffix,
  size = 'lg',
}: {
  usd: number
  suffix?: string
  size?: 'lg' | 'md'
}) {
  const { currency } = useCurrency()
  const main = formatPrice(usd, currency)
  const subValue =
    currency === 'USD'
      ? 'Rp ' + Math.round(usd * CURRENCY_RATES.IDR).toLocaleString('ru-RU').replace(/,/g, ' ')
      : '~' + formatPrice(usd, 'USD')

  const mainCls = size === 'lg' ? 'text-[28px]' : 'text-[20px]'
  return (
    <div>
      <div className={`${mainCls} font-semibold text-[#111827]`}>
        {main}
        {suffix && (
          <span className="text-[14px] font-normal text-[var(--color-text-muted)]"> {suffix}</span>
        )}
      </div>
      <div className="text-[12px] md:text-[14px] text-[var(--color-text-muted)] mt-1">{subValue}{suffix ? ' ' + suffix : ''}</div>
    </div>
  )
}
