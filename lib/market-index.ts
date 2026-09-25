// Typed access to lib/market-index.json (built by scripts/build-market-index.mjs)
// plus the small formatting helpers the market-data pages share.

import raw from './market-index.json'
import type { Lang } from './i18n'
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

export const RU_EN_MARKET_PAGES = {
  prices: { ru: '/ru/tseny-na-nedvizhimost-bali', en: '/en/bali-property-prices' },
  rent: { ru: '/ru/tseny-arendy-na-bali', en: '/en/bali-rent-prices' },
  method: { ru: '/ru/metodologiya', en: '/en/methodology' },
} as const
export type MarketPageKey = keyof typeof RU_EN_MARKET_PAGES

/** RU and EN only; every other locale is sent to the English page. */
export function marketPath(key: MarketPageKey, lang: Lang): string {
  return lang === 'ru' ? RU_EN_MARKET_PAGES[key].ru : RU_EN_MARKET_PAGES[key].en
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
  const v = Math.round(n)
  // Non-breaking group separator: «$320 000» must never wrap between groups.
  return lang === 'ru' ? '$' + v.toLocaleString('ru-RU').replace(/[\s,]/g, '\u00a0') : '$' + v.toLocaleString('en-US')
}

export function range(s: { p25: number | null; p75: number | null }, lang: Lang): string {
  if (s.p25 == null || s.p75 == null) return '—'
  return `${usd(s.p25, lang)}–${usd(s.p75, lang)}`
}

export function asOfLabel(lang: Lang): string {
  const [y, m] = MARKET.asOf.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function dayLabel(iso: string | null, lang: Lang): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

