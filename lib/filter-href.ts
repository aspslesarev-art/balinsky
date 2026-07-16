import type { FilterState } from '@/components/filters/FiltersBar'
import { buildCanonicalPath } from './seo-routes'
import { switchLangPath, type Lang } from './i18n'

const RU_LIST_BASE = '/ru/apartamenty'
const RU_MAP_BASE = '/ru/apartamenty/karta'

function toQueryString(f: FilterState): string {
  const sp = new URLSearchParams()
  if (f.q && f.q.trim()) sp.set('q', f.q.trim())
  if (f.priceMin != null) sp.set('price_min', String(f.priceMin))
  if (f.priceMax != null) sp.set('price_max', String(f.priceMax))
  if (f.district.length) sp.set('district', f.district.join(','))
  if (f.bedrooms.length) sp.set('bedrooms', f.bedrooms.join(','))
  if (f.floor.length) sp.set('floor', f.floor.join(','))
  if (f.developer.length) sp.set('developer', f.developer.join(','))
  if (f.status.length) sp.set('status', f.status.join(','))
  if (f.permit.length) sp.set('permit', f.permit.join(','))
  if (f.dealType.length) sp.set('deal', f.dealType.join(','))
  if (f.features.length) sp.set('features', f.features.join(','))
  if (f.goal) sp.set('goal', f.goal)
  return sp.toString()
}

export function buildListHref(f: FilterState, lang: Lang = 'ru'): string {
  const base = switchLangPath(RU_LIST_BASE, lang)
  // RU canonical slugs (/ru/apartamenty/canggu/2-spalni) only exist for RU
  // — EN has no matching route tree, so on EN we always stay at the flat
  // base with the filters in the query string.
  if (lang === 'ru' && (!f.q || !f.q.trim())) {
    const canonical = buildCanonicalPath(f)
    if (canonical) return canonical
  }
  const qs = toQueryString(f)
  return qs ? `${base}?${qs}` : base
}

export function buildMapHref(f: FilterState, lang: Lang = 'ru'): string {
  const base = switchLangPath(RU_MAP_BASE, lang)
  const qs = toQueryString(f)
  return qs ? `${base}?${qs}` : base
}
