'use client'

import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

// Price block used at the top of villa / apartment / complex detail pages.
// Reactive to the global currency toggle, optionally renders the price per
// square metre and an editorial "Цена обновлена" footnote.
export function DetailPriceBlock({
  priceUsd,
  pricePerSqmUsd,
  updatedAt,
  lang = 'ru',
}: {
  priceUsd: number
  pricePerSqmUsd?: number | null
  updatedAt?: string | null
  lang?: Lang
}) {
  const { currency } = useCurrency()
  const main = formatPrice(priceUsd, currency, lang)
  const perSqm = pricePerSqmUsd != null && Number.isFinite(pricePerSqmUsd) && pricePerSqmUsd > 0
    ? formatPrice(pricePerSqmUsd, currency, lang)
    : null
  const updated = updatedAt ? formatUpdated(updatedAt) : null
  return (
    <div>
      <div className="text-[28px] font-semibold text-[#111827]">
        {main}
        {perSqm && (
          <span className="ml-3 text-[14px] font-normal text-[var(--color-text-muted)]">
            {perSqm} / м²
          </span>
        )}
      </div>
      {updated && (
        <div className="mt-1.5 text-[12px] text-[var(--color-text-muted)]">
          Цена обновлена {updated}
        </div>
      )}
    </div>
  )
}

function formatUpdated(iso: string): string | null {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return null }
}
