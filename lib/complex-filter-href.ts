import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import { buildCanonicalPath } from './complex-seo-routes'

const LIST_BASE = '/ru/zhilye-kompleksy'
const MAP_BASE = '/ru/zhilye-kompleksy/karta'

function toQueryString(f: ComplexFilterState): string {
  const sp = new URLSearchParams()
  if (f.q && f.q.trim()) sp.set('q', f.q.trim())
  if (f.district.length) sp.set('district', f.district.join(','))
  if (f.types.length) sp.set('types', f.types.join(','))
  if (f.status.length) sp.set('status', f.status.join(','))
  if (f.permit.length) sp.set('permit', f.permit.join(','))
  if (f.year.length) sp.set('year', f.year.join(','))
  if (f.developer.length) sp.set('developer', f.developer.join(','))
  if (f.purpose.length) sp.set('purpose', f.purpose.join(','))
  return sp.toString()
}

export function buildListHref(f: ComplexFilterState): string {
  if (!f.q || !f.q.trim()) {
    const canonical = buildCanonicalPath(f)
    if (canonical) return canonical
  }
  const qs = toQueryString(f)
  return qs ? `${LIST_BASE}?${qs}` : LIST_BASE
}

export function buildMapHref(f: ComplexFilterState): string {
  const qs = toQueryString(f)
  return qs ? `${MAP_BASE}?${qs}` : MAP_BASE
}
