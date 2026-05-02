// Static cross rates against USD. Long-form rentals + Bali real estate price
// drift slowly enough that a manually-curated rate is fine; refresh quarterly.
export const CURRENCY_RATES = {
  USD: 1,
  EUR: 0.92,
  RUB: 100,
  UAH: 41,
  IDR: 16400,
} as const

export type Currency = keyof typeof CURRENCY_RATES

export const ALL_CURRENCIES: Currency[] = ['USD', 'EUR', 'RUB', 'UAH', 'IDR']

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && v in CURRENCY_RATES
}

// Numbers hit millions/billions easily — IDR even on entry-level properties,
// RUB on anything above $10k. Compact form keeps cards readable.
type Suffixes = { thou: string; mln: string; mlrd: string; decimal: string }
const SUFFIXES_RU: Suffixes = { thou: 'тыс', mln: 'млн', mlrd: 'млрд', decimal: ',' }
const SUFFIXES_EN: Suffixes = { thou: 'K',   mln: 'M',   mlrd: 'B',    decimal: '.' }

function roundTo(n: number, frac: number): string {
  const p = 10 ** frac
  const v = Math.round(n * p) / p
  return frac > 0 ? v.toFixed(frac).replace(/\.?0+$/, '') : v.toString()
}

function formatCompact(value: number, suf: Suffixes): string {
  // Below 10k we render the exact rounded number — compact noise hurts more
  // than helps ("8 тыс" vs "8 423").
  if (value >= 1_000_000_000) return roundTo(value / 1_000_000_000, 2).replace('.', suf.decimal) + ' ' + suf.mlrd
  if (value >= 1_000_000)     return roundTo(value / 1_000_000, 1).replace('.', suf.decimal) + ' ' + suf.mln
  if (value >= 10_000)        return roundTo(value / 1000, 0) + ' ' + suf.thou
  return Math.round(value).toString()
}

function formatRuNumber(value: number): string {
  return Math.round(value).toLocaleString('ru-RU').replace(/,/g, ' ')
}

export function formatPrice(usd: number, currency: Currency): string {
  if (!Number.isFinite(usd)) return '—'
  const value = usd * CURRENCY_RATES[currency]
  switch (currency) {
    case 'USD': return '$' + formatCompact(value, SUFFIXES_EN)
    case 'EUR': return '€' + formatCompact(value, SUFFIXES_EN)
    case 'RUB': return formatCompact(value, SUFFIXES_RU) + ' ₽'
    case 'UAH': return formatCompact(value, SUFFIXES_RU) + ' ₴'
    case 'IDR': return 'Rp ' + formatCompact(value, SUFFIXES_RU)
  }
}

// Same as formatPrice but never compacts — for places that need the exact
// number (price-per-sqm tables, slider tooltips at the low end of the range).
export function formatPriceExact(usd: number, currency: Currency): string {
  if (!Number.isFinite(usd)) return '—'
  const value = usd * CURRENCY_RATES[currency]
  switch (currency) {
    case 'USD': return '$' + Math.round(value).toLocaleString('en-US')
    case 'EUR': return '€' + Math.round(value).toLocaleString('de-DE')
    case 'RUB': return formatRuNumber(value) + ' ₽'
    case 'UAH': return formatRuNumber(value) + ' ₴'
    case 'IDR': return 'Rp ' + formatRuNumber(value)
  }
}
