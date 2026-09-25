// Typed access to lib/market-index.json (built by scripts/build-market-index.mjs)
// plus the small formatting helpers the market-data pages share.

import raw from './market-index.json'
import { switchLangPath, langToSegment, localizeSegment, type Lang } from './i18n'
import { enKnowledgeSlug } from './knowledge-en-slugs'
import { knowledgeAvailableIn } from './knowledge-locales'
import { districtRu } from './district-ru'
import { DISTRICT_TO_SLUG } from './seo-routes'
import { localizeHubPath } from './hub-routes'

export type SaleStats = { n: number; median: number | null; p25: number | null; p75: number | null; perM2: number | null; perM2N: number }
export type RentStats = { n: number; median: number | null; p25: number | null; p75: number | null }
export type VillaDistrict = SaleStats & {
  median2br: number | null; n2br: number
  leaseYears: number | null; leaseN: number
  offPlanShare: number; permitShare: number
}
export type RentDistrict = {
  villas: number; apartments: number
  villa1br?: RentStats; villa2br?: RentStats; villa3br?: RentStats; villa4br?: RentStats
  apartment?: RentStats
}
export type MonthlyDistrict = { n: number; all: RentStats; villa1br?: RentStats; villa2br?: RentStats; villa3br?: RentStats }

export type MarketIndex = {
  asOf: string
  generatedAt: string
  source: string
  totals: { villas: number; apartments: number; rentals: number; villaRentals: number }
  island: {
    villas: SaleStats & { offPlanShare: number; permitShare: number; leaseYears: number | null }
    apartments: SaleStats
    villaByBeds: Record<'1' | '2' | '3' | '4+', SaleStats>
    villaRent: Record<'1br' | '2br' | '3br' | '4br', RentStats>
    apartmentRent: RentStats
  }
  villaDistricts: Record<string, VillaDistrict>
  aptDistricts: Record<string, SaleStats>
  rentDistricts: Record<string, RentDistrict>
  monthly: {
    n: number; from: string | null; to: string | null
    island: { apartment: RentStats; villa1br: RentStats; villa2br: RentStats; villa3br: RentStats; villa4br: RentStats }
    districts: Record<string, MonthlyDistrict>
  }
}

export const MARKET = raw as unknown as MarketIndex

/** Below this many observations a figure is shown as indicative, not a finding. */
export const INDICATIVE_N = 30

/** Russian path of each market page — the key the other locales are mapped from. */
export const MARKET_PAGES_RU = {
  prices: '/ru/tseny-na-nedvizhimost-bali',
  rent: '/ru/tseny-arendy-na-bali',
  method: '/ru/metodologiya',
} as const
export type MarketPageKey = keyof typeof MARKET_PAGES_RU

/** e.g. prices → /ru/tseny-na-nedvizhimost-bali, /en/bali-property-prices, /ua/bali-property-prices. */
export function marketPath(key: MarketPageKey, lang: Lang): string {
  return switchLangPath(MARKET_PAGES_RU[key], lang)
}

/**
 * A knowledge article in `lang`, keyed by its Russian slug. Articles that
 * exist only in RU/EN (lib/knowledge-locales.ts) link to the English copy.
 */
export function knowledgePath(ruSlug: string, lang: Lang): string {
  if (lang === 'ru') return `/ru/znaniya/${ruSlug}`
  const l = knowledgeAvailableIn(ruSlug, lang) ? lang : 'en'
  return `/${langToSegment(l)}/${localizeSegment('znaniya', l)}/${enKnowledgeSlug(ruSlug)}`
}

// Intl locale per site language. Balinese has no Intl data of its own and
// its readers use Indonesian number and date conventions.
const LOCALE: Record<Lang, string> = {
  ru: 'ru-RU', en: 'en-US', id: 'id-ID', ban: 'id-ID', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', nl: 'nl-NL', pl: 'pl-PL', uk: 'uk-UA',
}
export const marketLocale = (lang: Lang) => LOCALE[lang]

/** Localised integer; space group separators become non-breaking. */
export function num(n: number, lang: Lang): string {
  return Math.round(n).toLocaleString(LOCALE[lang]).replace(/\s/g, '\u00a0')
}

/** One-decimal ratio in the language's decimal style (2,4 / 2.4). */
export function ratio(n: number, lang: Lang): string {
  return n.toLocaleString(LOCALE[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function districtName(latin: string, lang: Lang): string {
  return lang === 'ru' ? (districtRu(latin) ?? latin) : latin
}

/** Crawlable hub for a district, when the catalogue has one. */
export function districtHub(latin: string, kind: 'villy' | 'apartamenty', lang: Lang): string | null {
  const slug = DISTRICT_TO_SLUG[latin]
  return slug ? localizeHubPath(`/ru/${kind}/${slug}`, lang) : null
}

export function usd(n: number | null | undefined, lang: Lang): string {
  if (n == null) return '—'
  // Non-breaking group separator: «$320 000» must never wrap between groups.
  return '$' + num(n, lang)
}

export function range(s: { p25: number | null; p75: number | null }, lang: Lang): string {
  if (s.p25 == null || s.p75 == null) return '—'
  return `${usd(s.p25, lang)}–${usd(s.p75, lang)}`
}

export function asOfLabel(lang: Lang): string {
  const [y, m] = MARKET.asOf.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(LOCALE[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function dayLabel(iso: string | null, lang: Lang): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

