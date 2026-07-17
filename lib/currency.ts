import type { Lang } from '@/lib/i18n'

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

// Compact suffixes follow the page language so a /zh or /de visitor never sees
// Russian "млрд"/"млн". Where the natural compact form is ambiguous or would
// imply the wrong grouping (Chinese groups by 万/亿, not thousand/million), we
// fall back to Latin K/M/B with a '.' decimal — universally readable and safe.
const LANG_SUFFIXES: Record<Lang, Suffixes> = {
  ru:  SUFFIXES_RU,
  en:  SUFFIXES_EN,
  id:  { thou: 'K',    mln: 'M',    mlrd: 'B',    decimal: '.' },
  fr:  { thou: 'K',    mln: 'M',    mlrd: 'Md',   decimal: ',' },
  de:  { thou: 'Tsd.', mln: 'Mio.', mlrd: 'Mrd.', decimal: ',' },
  zh:  { thou: 'K',    mln: 'M',    mlrd: 'B',    decimal: '.' },
  nl:  { thou: 'K',    mln: 'mln',  mlrd: 'mld',  decimal: ',' },
  ban: { thou: 'K',    mln: 'M',    mlrd: 'B',    decimal: '.' },
}

// Thousands grouping for the exact (non-compact) number, per page language.
// RU keeps its space grouping via formatRuNumber; the rest use their locale.
const EXACT_LOCALE: Record<Lang, string> = {
  ru:  'ru-RU',
  en:  'en-US',
  id:  'id-ID',
  fr:  'fr-FR',
  de:  'de-DE',
  zh:  'zh-CN',
  nl:  'nl-NL',
  ban: 'id-ID',
}

// $ and € on the Russian page keep Latin K/M/B (existing convention); every
// other page — and every non-USD/EUR currency — follows the page language.
function compactSuffixes(currency: Currency, lang: Lang): Suffixes {
  if ((currency === 'USD' || currency === 'EUR') && lang === 'ru') return SUFFIXES_EN
  return LANG_SUFFIXES[lang]
}

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

// Grouped exact number for the RUB/UAH/IDR path. RU stays byte-identical to the
// old space-grouped output; other languages group per their own locale.
function formatGrouped(value: number, lang: Lang): string {
  if (lang === 'ru') return formatRuNumber(value)
  return Math.round(value).toLocaleString(EXACT_LOCALE[lang])
}

export function formatPrice(usd: number, currency: Currency, lang: Lang = 'ru'): string {
  if (!Number.isFinite(usd)) return '—'
  const value = usd * CURRENCY_RATES[currency]
  const suf = compactSuffixes(currency, lang)
  switch (currency) {
    case 'USD': return '$' + formatCompact(value, suf)
    case 'EUR': return '€' + formatCompact(value, suf)
    case 'RUB': return formatCompact(value, suf) + ' ₽'
    case 'UAH': return formatCompact(value, suf) + ' ₴'
    case 'IDR': return 'Rp ' + formatCompact(value, suf)
  }
}

// Same as formatPrice but never compacts — for places that need the exact
// number (price-per-sqm tables, slider tooltips at the low end of the range).
export function formatPriceExact(usd: number, currency: Currency, lang: Lang = 'ru'): string {
  if (!Number.isFinite(usd)) return '—'
  const value = usd * CURRENCY_RATES[currency]
  switch (currency) {
    case 'USD': return '$' + Math.round(value).toLocaleString('en-US')
    case 'EUR': return '€' + Math.round(value).toLocaleString('de-DE')
    case 'RUB': return formatGrouped(value, lang) + ' ₽'
    case 'UAH': return formatGrouped(value, lang) + ' ₴'
    case 'IDR': return 'Rp ' + formatGrouped(value, lang)
  }
}
