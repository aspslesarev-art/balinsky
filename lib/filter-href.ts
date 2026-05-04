import type { FilterState } from '@/components/filters/FiltersBar'
import { buildCanonicalPath } from './seo-routes'

const LIST_BASE = '/ru/apartamenty'
const MAP_BASE = '/ru/apartamenty/karta'

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
  if (f.purpose.length) sp.set('purpose', f.purpose.join(','))
  return sp.toString()
}

export function buildListHref(f: FilterState): string {
  // Search query is never canonical — keep it in the query string and let it
  // drop the user out of any canonical clean URL.
  if (!f.q || !f.q.trim()) {
    const canonical = buildCanonicalPath(f)
    if (canonical) return canonical
  }
  const qs = toQueryString(f)
  return qs ? `${LIST_BASE}?${qs}` : LIST_BASE
}

export function buildMapHref(f: FilterState): string {
  const qs = toQueryString(f)
  return qs ? `${MAP_BASE}?${qs}` : MAP_BASE
}
