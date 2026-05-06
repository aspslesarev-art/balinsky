'use client'

// Manual ROI calculator. Foreign investor enters their own assumptions
// (occupancy, ADR, management fee), sees gross / net / yield / payback
// in their selected currency. Counters the "developer claims X%" black
// box — the visitor builds their own model and stress-tests it.

import { useMemo, useState } from 'react'
import { Calculator, TrendingUp, AlertCircle } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { formatPrice, CURRENCY_RATES } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    h2: 'Калькулятор доходности',
    intro: 'Ваши собственные допущения — без чёрного ящика. Поменяйте параметры и посмотрите, как сходится модель.',
    occupancy: 'Загрузка',
    occupancyHint: 'Доля ночей в году, на которые приходится оплачиваемое бронирование. Реалистичный диапазон для Бали под управляющей компанией — 65–80%.',
    adr: 'Цена за ночь',
    adrHint: 'Average Daily Rate — средняя ставка по Booking/Airbnb за ночь в высокий сезон вашего района.',
    mgmtFee: 'Комиссия управляющей компании',
    mgmtFeeHint: 'Что забирает компания за уборку, маркетинг, чек-ин гостей. Стандарт для Бали — 18–25% от валовой выручки.',
    grossAnnual: 'Валовая выручка / год',
    netAnnual: 'Чистый доход / год',
    yieldPct: 'Доходность net',
    payback: 'Окупаемость',
    payback1: '1 год', paybackN: (y: string) => `${y} лет`, paybackInf: '∞',
    perYear: 'годовых',
    claimedLabel: 'Заявлено застройщиком',
    disclaimer: 'Это модель на ваших допущениях. Реальная доходность зависит от качества управляющей компании, сезонности и насыщения района листингами на Booking/Airbnb.',
    needsPrice: 'Цена объекта не указана — модель посчитать не получится.',
  },
  en: {
    h2: 'ROI calculator',
    intro: 'Your own assumptions — no black box. Tweak the inputs and see whether the model holds.',
    occupancy: 'Occupancy',
    occupancyHint: 'Share of nights per year actually paid for. Realistic Bali range under a management company is 65–80%.',
    adr: 'Rate per night',
    adrHint: 'Average Daily Rate — typical Booking/Airbnb rate per night in your district during high season.',
    mgmtFee: 'Management company fee',
    mgmtFeeHint: 'What the management firm takes for cleaning, marketing and guest check-ins. Bali standard is 18–25% of gross.',
    grossAnnual: 'Gross revenue / year',
    netAnnual: 'Net income / year',
    yieldPct: 'Net yield',
    payback: 'Payback',
    payback1: '1 year', paybackN: (y: string) => `${y} years`, paybackInf: '∞',
    perYear: 'per year',
    claimedLabel: 'Developer claim',
    disclaimer: 'This is a model on your inputs. Actual yield depends on the management company, seasonality, and how saturated the district is on Booking/Airbnb.',
    needsPrice: 'No price set on this listing — the model cannot run.',
  },
} as const

// Per-district default ADRs in USD. Tuned to current Bali Booking/Airbnb
// medians; serves as the starting point if we don't have a better hint
// from the listing's own claimed yield. Investor will adjust anyway.
const DISTRICT_DEFAULT_ADR: Record<string, number> = {
  Berawa: 200, 'Batu Bolong': 200, Pererenan: 220, Canggu: 200, 'Echo Beach': 220,
  Uluwatu: 230, Pandawa: 220, Bingin: 230, Padang: 230, Nusa: 220,
  Ubud: 140, Sanur: 130, Sidemen: 110, Amed: 110,
}
function adrForDistrict(district: string | null | undefined): number {
  if (!district) return 150
  for (const [key, v] of Object.entries(DISTRICT_DEFAULT_ADR)) {
    if (district.toLowerCase().includes(key.toLowerCase())) return v
  }
  return 150
}

type YearLabels = { payback1: string; paybackN: (y: string) => string; paybackInf: string }
function formatYears(payback: number, c: YearLabels): string {
  if (!Number.isFinite(payback) || payback <= 0) return c.paybackInf
  if (payback < 1.05) return c.payback1
  const rounded = Math.round(payback * 10) / 10
  return c.paybackN(rounded.toFixed(1).replace(/\.0$/, ''))
}

export function RoiCalculator({
  priceUsd,
  district,
  claimedYieldPct,
  lang,
}: {
  priceUsd: number | null
  district?: string | null
  claimedYieldPct?: number | null
  lang: Lang
}) {
  const c = COPY[lang]
  const { currency } = useCurrency()
  const fxRate = CURRENCY_RATES[currency]
  const [occupancyPct, setOccupancyPct] = useState(70)
  const [adrUsd, setAdrUsd] = useState(adrForDistrict(district))
  const [mgmtFeePct, setMgmtFeePct] = useState(20)

  // Show ADR in user's selected currency to avoid the "wait what's $200
  // in EUR" friction. Convert to USD internally for the math.
  const adrInCurrency = useMemo(() => Math.round(adrUsd * fxRate), [adrUsd, fxRate])
  const setAdrInCurrency = (n: number) => setAdrUsd(Math.round(n / fxRate))

  const { grossUsd, netUsd, yieldPct, payback } = useMemo(() => {
    if (!priceUsd || priceUsd <= 0) {
      return { grossUsd: 0, netUsd: 0, yieldPct: 0, payback: Infinity }
    }
    const gross = adrUsd * 365 * (occupancyPct / 100)
    const net = gross * (1 - mgmtFeePct / 100)
    const yld = (net / priceUsd) * 100
    const pb = net > 0 ? priceUsd / net : Infinity
    return { grossUsd: gross, netUsd: net, yieldPct: yld, payback: pb }
  }, [priceUsd, adrUsd, occupancyPct, mgmtFeePct])

  if (!priceUsd || priceUsd <= 0) {
    return (
      <section className="mb-10">
        <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2 inline-flex items-center gap-2">
          <Calculator size={20} className="text-[var(--color-primary)]" /> {c.h2}
        </h2>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 text-[14px] text-[var(--color-text-muted)]">
          {c.needsPrice}
        </div>
      </section>
    )
  }

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2 inline-flex items-center gap-2">
        <Calculator size={20} className="text-[var(--color-primary)]" /> {c.h2}
      </h2>
      <p className="text-[14px] text-[var(--color-text-muted)] mb-5 max-w-2xl">{c.intro}</p>

      <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Inputs */}
          <div className="p-5 md:p-6 md:border-r border-[var(--color-border)] space-y-5">
            <Slider
              label={c.occupancy}
              hint={c.occupancyHint}
              min={50} max={90} step={1}
              value={occupancyPct}
              onChange={setOccupancyPct}
              suffix="%"
            />
            <NumberInput
              label={c.adr}
              hint={c.adrHint}
              value={adrInCurrency}
              onChange={setAdrInCurrency}
              suffix={currency}
              min={20}
              max={2000}
              step={Math.max(1, Math.round(10 * fxRate))}
            />
            <Slider
              label={c.mgmtFee}
              hint={c.mgmtFeeHint}
              min={10} max={35} step={1}
              value={mgmtFeePct}
              onChange={setMgmtFeePct}
              suffix="%"
            />
          </div>

          {/* Results */}
          <div className="p-5 md:p-6 bg-[var(--color-search-bg)] flex flex-col gap-4">
            <ResultRow label={c.grossAnnual} value={formatPrice(grossUsd, currency)} />
            <ResultRow label={c.netAnnual}   value={formatPrice(netUsd, currency)} />
            <ResultRow
              label={c.yieldPct}
              value={`${yieldPct.toFixed(1)}%`}
              hint={c.perYear}
              accent
            />
            <ResultRow label={c.payback} value={formatYears(payback, c)} />

            {claimedYieldPct != null && Number.isFinite(claimedYieldPct) && (
              <div className="mt-2 pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-[13px]">
                <TrendingUp size={14} className="text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-muted)]">{c.claimedLabel}:</span>
                <span className="font-semibold text-[#111827]">{claimedYieldPct}%</span>
                {claimedYieldPct - yieldPct > 1 && (
                  <span className="ml-auto text-[12px] text-[#92400E] inline-flex items-center gap-1">
                    <AlertCircle size={12} /> +{(claimedYieldPct - yieldPct).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 md:px-6 py-3 border-t border-[var(--color-border)] text-[12px] text-[var(--color-text-muted)] leading-snug">
          {c.disclaimer}
        </div>
      </div>
    </section>
  )
}

function Slider({
  label, hint, min, max, step, value, onChange, suffix,
}: {
  label: string; hint: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; suffix: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[13px] font-medium text-[#111827]">{label}</label>
        <span className="text-[15px] font-semibold tabular-nums text-[var(--color-primary)]">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)] cursor-pointer"
      />
      <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">{hint}</p>
    </div>
  )
}

function NumberInput({
  label, hint, value, onChange, suffix, min, max, step,
}: {
  label: string; hint: string; value: number; onChange: (v: number) => void;
  suffix: string; min?: number; max?: number; step?: number
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#111827] mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(n)
          }}
          min={min}
          max={max}
          step={step}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[15px] tabular-nums text-[#111827] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
        />
        <span className="text-[13px] text-[var(--color-text-muted)] shrink-0">{suffix}</span>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">{hint}</p>
    </div>
  )
}

function ResultRow({
  label, value, hint, accent,
}: {
  label: string; value: string; hint?: string; accent?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-[var(--color-text-muted)]">{label}</span>
      <span className={`text-right ${accent ? 'text-[20px] md:text-[22px] font-semibold text-[var(--color-primary)]' : 'text-[16px] font-medium text-[#111827]'} tabular-nums`}>
        {value}
        {hint && <span className="text-[11px] font-normal text-[var(--color-text-muted)] ml-1">{hint}</span>}
      </span>
    </div>
  )
}
