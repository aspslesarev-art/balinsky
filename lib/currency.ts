import type { Lang } from '@/lib/i18n'

// Static cross rates against USD. Long-form rentals + Bali real estate price
// drift slowly enough that a manually-curated rate is fine; refresh quarterly.
// Last refreshed 2026-09-27 (open.er-api.com, rounded).
export const CURRENCY_RATES = {
  USD: 1,
  EUR: 0.88,
  RUB: 84,
  UAH: 45,
  IDR: 17900,
} as const

export type Currency = keyof typeof CURRENCY_RATES

export const ALL_CURRENCIES: Currency[] = ['USD', 'EUR', 'RUB', 'UAH', 'IDR']

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && v in CURRENCY_RATES
}

// Валюта по стране посетителя (решение владельца 15.10.2026): Индонезия —
// рупии, Россия — рубли, США — доллары, Европа — евро, Украина — гривны.
// Остальным — рупии: по правилам Банка Индонезии цена по умолчанию в рупиях.
// Всегда ОДНА валюта на экране — рупии рядом с другой валютой запрещены.
const COUNTRY_CURRENCY: Record<string, Currency> = {
  ID: 'IDR',
  RU: 'RUB',
  US: 'USD',
  UA: 'UAH',
  AT: 'EUR',
  BE: 'EUR',
  BG: 'EUR',
  HR: 'EUR',
  CY: 'EUR',
  CZ: 'EUR',
  DK: 'EUR',
  EE: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  GR: 'EUR',
  HU: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PL: 'EUR',
  PT: 'EUR',
  RO: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  ES: 'EUR',
  SE: 'EUR',
  GB: 'EUR',
  CH: 'EUR',
  NO: 'EUR',
  IS: 'EUR',
  LI: 'EUR',
  MC: 'EUR',
  SM: 'EUR',
  VA: 'EUR',
  AD: 'EUR',
  ME: 'EUR',
  AL: 'EUR',
  RS: 'EUR',
  MK: 'EUR',
  BA: 'EUR',
  MD: 'EUR',
}

export function currencyForCountry(country: string | null): Currency | null {
  if (!country) return null
  return COUNTRY_CURRENCY[country] ?? null
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
  pl:  { thou: 'tys.', mln: 'mln',  mlrd: 'mld',  decimal: ',' },
  uk:  { thou: 'тис.', mln: 'млн',  mlrd: 'млрд', decimal: ',' },
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
  pl:  'pl-PL',
  uk:  'uk-UA',
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

// Пересчёт по курсу — не точная цена, а оценка: «Rp 4 599 995 700» или
// «28 728 000 ₽» обещают точность до рубля, которой нет. Округляем до трёх
// значащих цифр («28 700 000 ₽», «230 000 ₽/м²»), а рупии от миллиона
// показываем компактно, по-человечески: «Rp 4,6 млрд», «Rp 2,1 млн».
function roundSignificant(value: number, digits = 3): number {
  if (value < 1000) return Math.round(value)
  const p = 10 ** (Math.floor(Math.log10(value)) - digits + 1)
  return Math.round(value / p) * p
}

// Сумма для коротких мест — плитки «Рынок в цифрах», ставка за ночь,
// быстрые кнопки фильтра, заголовок «до …»: в валюте посетителя, без хвостов
// пересчёта, от миллиона — «28,7 млн ₽», «Rp 6,1 млрд». Все пробелы
// неразрывные: «$342 000» не должен переноситься посередине.
export function formatMoney(usd: number, currency: Currency, lang: Lang = 'ru'): string {
  if (!Number.isFinite(usd)) return '—'
  const raw = usd * CURRENCY_RATES[currency]
  const value = currency === 'USD' ? raw : roundSignificant(raw)
  let out: string
  if (value >= 1_000_000) {
    // Один знак после запятой: «Rp 6,1 млрд», «28,7 млн ₽», «$1.2M».
    const suf = compactSuffixes(currency, lang)
    const [div, word] = value >= 1_000_000_000 ? [1_000_000_000, suf.mlrd] : [1_000_000, suf.mln]
    const num = roundTo(value / div, 1).replace('.', suf.decimal)
    // Однобуквенный суффикс пишется слитно ($1.2M), словесный — через пробел.
    const body = word.length === 1 ? num + word : num + ' ' + word
    switch (currency) {
      case 'USD': out = '$' + body; break
      case 'EUR': out = '€' + body; break
      case 'RUB': out = body + ' ₽'; break
      case 'UAH': out = body + ' ₴'; break
      case 'IDR': out = 'Rp ' + body; break
    }
  } else {
    const grouped = Math.round(value).toLocaleString(EXACT_LOCALE[lang])
    switch (currency) {
      case 'USD': out = '$' + grouped; break
      case 'EUR': out = '€' + grouped; break
      case 'RUB': out = grouped + ' ₽'; break
      case 'UAH': out = grouped + ' ₴'; break
      case 'IDR': out = 'Rp ' + grouped; break
    }
  }
  return out.replace(/[\s ]/g, ' ')
}

// Same as formatPrice but never compacts — for places that need the exact
// number (price-per-sqm tables, slider tooltips at the low end of the range).
// Доллары (валюта базы) — как есть; остальные валюты — округлённый пересчёт.
export function formatPriceExact(usd: number, currency: Currency, lang: Lang = 'ru'): string {
  if (!Number.isFinite(usd)) return '—'
  const raw = usd * CURRENCY_RATES[currency]
  if (currency === 'IDR' && raw >= 1_000_000) return 'Rp ' + formatCompact(raw, LANG_SUFFIXES[lang])
  const value = currency === 'USD' ? raw : roundSignificant(raw)
  switch (currency) {
    case 'USD': return '$' + Math.round(value).toLocaleString('en-US')
    case 'EUR': return '€' + Math.round(value).toLocaleString('de-DE')
    case 'RUB': return formatGrouped(value, lang) + ' ₽'
    case 'UAH': return formatGrouped(value, lang) + ' ₴'
    case 'IDR': return 'Rp ' + formatGrouped(value, lang)
  }
}
