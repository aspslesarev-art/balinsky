import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { buildCanonicalPath } from './villa-seo-routes'

const LIST_BASE = '/ru/villy'
const MAP_BASE = '/ru/villy/karta'

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
  return sp.toString()
}

export function buildListHref(f: VillaFilterState): string {
  if (!f.q || !f.q.trim()) {
    const canonical = buildCanonicalPath(f)
    if (canonical) return canonical
  }
  const qs = toQueryString(f)
  return qs ? `${LIST_BASE}?${qs}` : LIST_BASE
}

export function buildMapHref(f: VillaFilterState): string {
  const qs = toQueryString(f)
  return qs ? `${MAP_BASE}?${qs}` : MAP_BASE
}
