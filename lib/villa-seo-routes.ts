import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { DISTRICT_TO_SLUG, SLUG_TO_DISTRICT, BEDROOM_TO_SLUG, SLUG_TO_BEDROOM } from './seo-routes'

export const STATUS_TO_SLUG: Record<string, string> = {
  building: 'stroyatsya',
  built: 'gotovye',
  planned: 'planiruyutsya',
}
export const SLUG_TO_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TO_SLUG).map(([k, v]) => [v, k]),
)

const BASE = '/ru/villy'

export function stripPagination(segments: string[]): { segments: string[]; page: number } | null {
  if (segments.length >= 2 && segments[segments.length - 2] === 'page') {
    const n = Number(segments[segments.length - 1])
    if (!Number.isInteger(n) || n < 1) return null
    return { segments: segments.slice(0, -2), page: n }
  }
  return { segments, page: 1 }
}

export function parseCleanPath(segments: string[]): VillaFilterState | null {
  const f: VillaFilterState = {
    q: '',
    priceMin: null,
    priceMax: null,
    district: [],
    bedrooms: [],
    status: [],
    permit: [],
    year: [],
    developer: [],
    style: [],
  }
  const seen = new Set<string>()
  for (const raw of segments) {
    const seg = decodeURIComponent(raw)
    if (SLUG_TO_DISTRICT[seg]) {
      if (seen.has('district')) return null
      seen.add('district')
      f.district = [SLUG_TO_DISTRICT[seg]]
    } else if (SLUG_TO_BEDROOM[seg]) {
      if (seen.has('bedrooms')) return null
      seen.add('bedrooms')
      f.bedrooms = [SLUG_TO_BEDROOM[seg]]
    } else if (SLUG_TO_STATUS[seg]) {
      if (seen.has('status')) return null
      seen.add('status')
      f.status = [SLUG_TO_STATUS[seg]]
    } else {
      return null
    }
  }
  return f
}

export function buildCanonicalPath(f: VillaFilterState): string | null {
  if (f.q && f.q.trim().length > 0) return null
  if (f.permit.length > 0) return null
  if (f.year.length > 0) return null
  if (f.developer.length > 0) return null
  if (f.style.length > 0) return null
  if (f.priceMin != null || f.priceMax != null) return null
  if (f.district.length > 1) return null
  if (f.bedrooms.length > 1) return null
  if (f.status.length > 1) return null

  const dims: string[] = []
  if (f.district.length === 1) {
    const slug = DISTRICT_TO_SLUG[f.district[0]]
    if (!slug) return null
    dims.push(slug)
  }
  if (f.bedrooms.length === 1) {
    const slug = BEDROOM_TO_SLUG[f.bedrooms[0]]
    if (!slug) return null
    dims.push(slug)
  }
  if (f.status.length === 1) {
    const slug = STATUS_TO_SLUG[f.status[0]]
    if (!slug) return null
    dims.push(slug)
  }
  if (dims.length === 0) return BASE
  if (dims.length > 3) return null
  return BASE + '/' + dims.join('/')
}

export function listAllCanonicalPaths(): string[] {
  const out = new Set<string>([BASE])
  const districtSlugs = Object.values(DISTRICT_TO_SLUG)
  const bedroomSlugs = Object.values(BEDROOM_TO_SLUG)
  const statusSlugs = Object.values(STATUS_TO_SLUG)
  for (const d of districtSlugs) out.add(`${BASE}/${d}`)
  for (const b of bedroomSlugs) out.add(`${BASE}/${b}`)
  for (const s of statusSlugs) out.add(`${BASE}/${s}`)
  for (const d of districtSlugs) {
    for (const b of bedroomSlugs) out.add(`${BASE}/${d}/${b}`)
    for (const s of statusSlugs) out.add(`${BASE}/${d}/${s}`)
  }
  for (const b of bedroomSlugs) for (const s of statusSlugs) out.add(`${BASE}/${b}/${s}`)
  return [...out]
}
