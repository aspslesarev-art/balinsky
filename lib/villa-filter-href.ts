import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { buildCanonicalPath } from './villa-seo-routes'
import type { Lang } from './i18n'

const RU_LIST_BASE = '/ru/villy'
const RU_MAP_BASE = '/ru/villy/karta'
const EN_LIST_BASE = '/en/villas'
const EN_MAP_BASE = '/en/villas/map'

function toQueryString(f: VillaFilterState): string {
  const sp = new URLSearchParams()
  if (f.q && f.q.trim()) sp.set('q', f.q.trim())
  if (f.priceMin != null) sp.set('price_min', String(f.priceMin))
  if (f.priceMax != null) sp.set('price_max', String(f.priceMax))
  if (f.district.length) sp.set('district', f.district.join(','))
  if (f.bedrooms.length) sp.set('bedrooms', f.bedrooms.join(','))
  if (f.status.length) sp.set('status', f.status.join(','))
  if (f.permit.length) sp.set('permit', f.permit.join(','))
  if (f.year.length) sp.set('year', f.year.join(','))
  if (f.developer.length) sp.set('developer', f.developer.join(','))
  if (f.style.length) sp.set('style', f.style.join(','))
  if (f.features.length) sp.set('features', f.features.join(','))
  if (f.goal) sp.set('goal', f.goal)
  if (f.dealType.length) sp.set('deal', f.dealType.join(','))
  return sp.toString()
}

export function buildListHref(f: VillaFilterState, lang: Lang = 'ru'): string {
  const base = lang === 'en' ? EN_LIST_BASE : RU_LIST_BASE
  if (lang === 'ru' && (!f.q || !f.q.trim())) {
    const canonical = buildCanonicalPath(f)
    if (canonical) return canonical
  }
  const qs = toQueryString(f)
  return qs ? `${base}?${qs}` : base
}

export function buildMapHref(f: VillaFilterState, lang: Lang = 'ru'): string {
  const base = lang === 'en' ? EN_MAP_BASE : RU_MAP_BASE
  const qs = toQueryString(f)
  return qs ? `${base}?${qs}` : base
}
