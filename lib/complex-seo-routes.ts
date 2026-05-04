import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import { DISTRICT_TO_SLUG, SLUG_TO_DISTRICT } from './seo-routes'

export const TYPE_TO_SLUG: Record<string, string> = {
  Виллы: 'villy',
  Апартаменты: 'apartmenty',
  Таунхаусы: 'taunhausy',
  Hotel: 'hotel',
  'Смарт виллы': 'smart-villy',
  Пентхаусы: 'pentkhausy',
  Commercial: 'commercial',
}
export const SLUG_TO_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_TO_SLUG).map(([k, v]) => [v, k]),
)

export const STATUS_TO_SLUG: Record<string, string> = {
  building: 'stroyatsya',
  built: 'gotovye',
  planned: 'planiruyutsya',
}
export const SLUG_TO_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TO_SLUG).map(([k, v]) => [v, k]),
)

export const PURPOSE_TO_SLUG: Record<string, string> = {
  invest: 'dlya-investicij',
  live:   'dlya-zhizni',
}
export const SLUG_TO_PURPOSE: Record<string, string> = Object.fromEntries(
  Object.entries(PURPOSE_TO_SLUG).map(([k, v]) => [v, k]),
)

const BASE = '/ru/zhilye-kompleksy'

// Strips trailing /page/N from segments
export function stripPagination(segments: string[]): { segments: string[]; page: number } | null {
  if (segments.length >= 2 && segments[segments.length - 2] === 'page') {
    const n = Number(segments[segments.length - 1])
    if (!Number.isInteger(n) || n < 1) return null
    return { segments: segments.slice(0, -2), page: n }
  }
  return { segments, page: 1 }
}

// Path → filters
export function parseCleanPath(segments: string[]): ComplexFilterState | null {
  const f: ComplexFilterState = {
    q: '',
    district: [],
    types: [],
    status: [],
    permit: [],
    year: [],
    developer: [],
    purpose: [],
  }
  const seen = new Set<string>()
  for (const raw of segments) {
    const seg = decodeURIComponent(raw)
    if (SLUG_TO_DISTRICT[seg]) {
      if (seen.has('district')) return null
      seen.add('district')
      f.district = [SLUG_TO_DISTRICT[seg]]
    } else if (SLUG_TO_TYPE[seg]) {
      if (seen.has('types')) return null
      seen.add('types')
      f.types = [SLUG_TO_TYPE[seg]]
    } else if (SLUG_TO_STATUS[seg]) {
      if (seen.has('status')) return null
      seen.add('status')
      f.status = [SLUG_TO_STATUS[seg]]
    } else if (SLUG_TO_PURPOSE[seg]) {
      if (seen.has('purpose')) return null
      seen.add('purpose')
      f.purpose = [SLUG_TO_PURPOSE[seg]]
    } else {
      return null
    }
  }
  return f
}

// Filters → canonical clean path (or null)
//
// Canonical iff:
//   - whitelisted dimensions only: district, types, status
//   - each used dimension has exactly one value
//   - 1..3 dimensions
export function buildCanonicalPath(f: ComplexFilterState): string | null {
  if (f.q && f.q.trim().length > 0) return null
  if (f.permit.length > 0) return null
  if (f.year.length > 0) return null
  if (f.developer.length > 0) return null
  if (f.district.length > 1) return null
  if (f.types.length > 1) return null
  if (f.status.length > 1) return null
  if (f.purpose.length > 1) return null

  const dims: string[] = []
  if (f.district.length === 1) {
    const slug = DISTRICT_TO_SLUG[f.district[0]]
    if (!slug) return null
    dims.push(slug)
  }
  if (f.types.length === 1) {
    const slug = TYPE_TO_SLUG[f.types[0]]
    if (!slug) return null
    dims.push(slug)
  }
  if (f.status.length === 1) {
    const slug = STATUS_TO_SLUG[f.status[0]]
    if (!slug) return null
    dims.push(slug)
  }
  if (f.purpose.length === 1) {
    const slug = PURPOSE_TO_SLUG[f.purpose[0]]
    if (!slug) return null
    dims.push(slug)
  }
  if (dims.length === 0) return BASE
  if (dims.length > 4) return null
  return BASE + '/' + dims.join('/')
}

export function listAllCanonicalPaths(): string[] {
  const out = new Set<string>([BASE])
  const districtSlugs = Object.values(DISTRICT_TO_SLUG)
  const typeSlugs = Object.values(TYPE_TO_SLUG)
  const statusSlugs = Object.values(STATUS_TO_SLUG)
  const purposeSlugs = Object.values(PURPOSE_TO_SLUG)
  for (const d of districtSlugs) out.add(`${BASE}/${d}`)
  for (const t of typeSlugs) out.add(`${BASE}/${t}`)
  for (const s of statusSlugs) out.add(`${BASE}/${s}`)
  for (const p of purposeSlugs) out.add(`${BASE}/${p}`)
  for (const d of districtSlugs) {
    for (const t of typeSlugs) out.add(`${BASE}/${d}/${t}`)
    for (const s of statusSlugs) out.add(`${BASE}/${d}/${s}`)
    for (const p of purposeSlugs) out.add(`${BASE}/${d}/${p}`)
  }
  for (const t of typeSlugs) {
    for (const s of statusSlugs) out.add(`${BASE}/${t}/${s}`)
  }
  return [...out]
}
