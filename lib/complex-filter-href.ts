import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import { buildCanonicalPath } from './complex-seo-routes'
import type { Lang } from './i18n'

const RU_LIST_BASE = '/ru/zhilye-kompleksy'
const RU_MAP_BASE = '/ru/zhilye-kompleksy/karta'
const EN_LIST_BASE = '/en/complexes'
const EN_MAP_BASE = '/ru/zhilye-kompleksy/karta'

function toQueryString(f: ComplexFilterState): string {
  const sp = new URLSearchParams()
  if (f.q && f.q.trim()) sp.set('q', f.q.trim())
  if (f.district.length) sp.set('district', f.district.join(','))
  if (f.types.length) sp.set('types', f.types.join(','))
  if (f.status.length) sp.set('status', f.status.join(','))
  if (f.permit.length) sp.set('permit', f.permit.join(','))
  if (f.year.length) sp.set('year', f.year.join(','))
  if (f.developer.length) sp.set('developer', f.developer.join(','))
  return sp.toString()
}

export function buildListHref(f: ComplexFilterState, lang: Lang = 'ru'): string {
  const base = lang === 'en' ? EN_LIST_BASE : RU_LIST_BASE
  if (lang === 'ru' && (!f.q || !f.q.trim())) {
    const canonical = buildCanonicalPath(f)
    if (canonical) return canonical
  }
  const qs = toQueryString(f)
  return qs ? `${base}?${qs}` : base
}

export function buildMapHref(f: ComplexFilterState, lang: Lang = 'ru'): string {
  const base = lang === 'en' ? EN_MAP_BASE : RU_MAP_BASE
  const qs = toQueryString(f)
  return qs ? `${base}?${qs}` : base
}
