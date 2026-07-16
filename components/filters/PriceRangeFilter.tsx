'use client'

import { useEffect, useState } from 'react'
import { FilterDropdown } from '../FilterDropdown'
import { useFilterUrl, type FilterView } from './useFilterUrl'
import type { FilterState } from './FiltersBar'
import { useCurrency } from '../CurrencyContext'
import { CURRENCY_RATES, formatPrice } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { from: 'от', to: 'до', clear: 'Сбросить', apply: 'Применить', quick: 'Быстрый выбор' },
  en: { from: 'from', to: 'to', clear: 'Clear', apply: 'Apply', quick: 'Quick presets' },
} as const

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', RUB: '₽', UAH: '₴', IDR: 'Rp' }

// Common Bali price brackets in USD, used as one-tap chips inside
// the popover. Stored in USD because the URL state is USD; the chip
// LABEL is rendered in the active currency by formatPrice().
const PRESETS_USD: { min: number | null; max: number | null }[] = [
  { min: null, max: 200_000 },
  { min: 200_000, max: 400_000 },
  { min: 400_000, max: 700_000 },
  { min: 700_000, max: 1_200_000 },
  { min: 1_200_000, max: null },
]

function fmtRu(v: number): string {
  return Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ')
}
function parseNum(v: string): number | null {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function PriceRangeFilter({
  label,
  min,
  max,
  current,
  view = 'list',
  lang = 'ru',
}: {
  label: string
  min: number | null
  max: number | null
  current: FilterState
  view?: FilterView
  lang?: Lang
}) {
  const { apply } = useFilterUrl(current, view)
  const { currency } = useCurrency()
  const rate = CURRENCY_RATES[currency]
  const sym = SYMBOLS[currency] ?? '$'
  const c = pickCopy(COPY, lang)

  // URL stores USD; the input shows the currently-selected currency.
  const usdToInput = (usd: number | null): string => usd == null ? '' : fmtRu(usd * rate)
  const inputToUsd = (s: string): number | null => {
    const n = parseNum(s)
    return n == null ? null : Math.round(n / rate)
  }

  const [draftMin, setDraftMin] = useState(usdToInput(min))
  const [draftMax, setDraftMax] = useState(usdToInput(max))

  useEffect(() => { setDraftMin(usdToInput(min)) }, [min, rate]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDraftMax(usdToInput(max)) }, [max, rate]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = min != null || max != null
  const summary = active
    ? [
        min != null ? `${c.from} ${formatPrice(min, currency)}` : '',
        max != null ? `${c.to} ${formatPrice(max, currency)}` : '',
      ].filter(Boolean).join(' ')
    : ''

  // Format a preset's bracket label in the currently-selected
  // currency. "до $200k" / "$200–400k" / "$700k+" — we round to
  // tens-of-thousands to keep the chip terse, which the visitor
  // expects for "ballpark" navigation.
  function presetLabel(p: { min: number | null; max: number | null }): string {
    const fmt = (usd: number) => {
      const v = usd * rate
      // $1,200,000 → "$1.2M"; $200,000 → "$200k"; $999 → "$999"
      if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
      if (v >= 1_000) return `${sym}${Math.round(v / 1000)}k`
      return `${sym}${Math.round(v)}`
    }
    if (p.min == null && p.max != null) return `${c.from} ${fmt(p.max)}`.replace(c.from, c.to.charAt(0).toUpperCase() + c.to.slice(1))
    if (p.min != null && p.max == null) return `${fmt(p.min)}+`
    if (p.min != null && p.max != null) return `${fmt(p.min)} – ${fmt(p.max)}`
    return ''
  }
  function isPresetActive(p: { min: number | null; max: number | null }): boolean {
    return p.min === min && p.max === max
  }

  return (
    <FilterDropdown label={label} summary={summary} active={active}>
      {(close) => (
        <div className="flex flex-col gap-3 min-w-[340px] sm:min-w-[380px]">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-[12px] text-[var(--color-text-muted)] mb-1">{c.from}, {sym}</div>
              <input
                type="text"
                inputMode="numeric"
                value={draftMin}
                onChange={e => setDraftMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex-1">
              <div className="text-[12px] text-[var(--color-text-muted)] mb-1">{c.to}, {sym}</div>
              <input
                type="text"
                inputMode="numeric"
                value={draftMax}
                onChange={e => setDraftMax(e.target.value)}
                placeholder="∞"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Preset chips — one-tap brackets covering the typical Bali
              buy-side ladder. Tap → applies + closes; replaces typing
              for 90 % of visitors who just want a ballpark. */}
          <div>
            <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">{c.quick}</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS_USD.map((p, i) => {
                const active = isPresetActive(p)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDraftMin(usdToInput(p.min))
                      setDraftMax(usdToInput(p.max))
                      apply({ priceMin: p.min, priceMax: p.max })
                      close()
                    }}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] border transition-colors ${
                      active
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                        : 'bg-white border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                    }`}
                  >
                    {presetLabel(p)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => {
                setDraftMin('')
                setDraftMax('')
                apply({ priceMin: null, priceMax: null })
                close()
              }}
              className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1"
            >
              {c.clear}
            </button>
            <button
              type="button"
              onClick={() => {
                apply({ priceMin: inputToUsd(draftMin), priceMax: inputToUsd(draftMax) })
                close()
              }}
              className="text-[13px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg px-4 py-2 transition-colors"
            >
              {c.apply}
            </button>
          </div>
        </div>
      )}
    </FilterDropdown>
  )
}
