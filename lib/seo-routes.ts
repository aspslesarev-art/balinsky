import type { FilterState } from '@/components/filters/FiltersBar'

// Slug maps. We keep a closed list per dimension so that any unknown segment
// in a path means "not a canonical SEO route" (and we can safely 404 / fall back).

export const DISTRICT_TO_SLUG: Record<string, string> = {
  'Batu Bolong': 'batu-bolong',
  'Pandawa': 'pandawa',
  'Ubud': 'ubud',
  'Pererenan': 'pererenan',
  'Seseh': 'seseh',
  'Uluwatu': 'uluwatu',
  'Nusa Dua': 'nusa-dua',
  'Cemagi': 'cemagi',
  'Melasti': 'melasti',
  'Berawa': 'berawa',
  'Sanur': 'sanur',
  'Umalas': 'umalas',
  'GWK': 'gwk',
  'Nusa Penida': 'nusa-penida',
  'Kedungu': 'kedungu',
  'Ungasan': 'ungasan',
  'Karanggasem': 'karanggasem',
  'Batu Belig': 'batu-belig',
  'Nyanyi': 'nyanyi',
  'Kerobokan': 'kerobokan',
  'Canggu': 'canggu',
}
export const SLUG_TO_DISTRICT: Record<string, string> = Object.fromEntries(
  Object.entries(DISTRICT_TO_SLUG).map(([k, v]) => [v, k])
)

export const BEDROOM_TO_SLUG: Record<string, string> = {
  '1': '1-spalnya',
  '2': '2-spalni',
  '3': '3-spalni',
}
export const SLUG_TO_BEDROOM: Record<string, string> = Object.fromEntries(
  Object.entries(BEDROOM_TO_SLUG).map(([k, v]) => [v, k])
)

export const STATUS_TO_SLUG: Record<string, string> = {
  building: 'stroyatsya',
  built: 'gotovye',
}
export const SLUG_TO_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TO_SLUG).map(([k, v]) => [v, k])
)

// Predefined price segments (USD). Match order matters: pick first that fits.
export type PriceSegment = {
  slug: string
  min: number | null
  max: number | null
  label: string
}
export const PRICE_SEGMENTS: PriceSegment[] = [
  { slug: 'do-100000', min: null, max: 100000, label: 'до 100 000 $' },
  { slug: '100000-200000', min: 100000, max: 200000, label: '100 000 – 200 000 $' },
  { slug: '200000-300000', min: 200000, max: 300000, label: '200 000 – 300 000 $' },
  { slug: '300000-500000', min: 300000, max: 500000, label: '300 000 – 500 000 $' },
  { slug: 'ot-500000', min: 500000, max: null, label: 'от 500 000 $' },
]
const PRICE_BY_SLUG = Object.fromEntries(PRICE_SEGMENTS.map(s => [s.slug, s])) as Record<string, PriceSegment>

function matchPriceSegment(min: number | null, max: number | null): PriceSegment | null {
  return PRICE_SEGMENTS.find(s => s.min === min && s.max === max) ?? null
}

// Strips a trailing `/page/N` from the segments (if present and well-formed).
// Returns { segments, page } where segments is the prefix and page is 1-based.
export function stripPagination(segments: string[]): { segments: string[]; page: number } | null {
  if (segments.length >= 2 && segments[segments.length - 2] === 'page') {
    const n = Number(segments[segments.length - 1])
    if (!Number.isInteger(n) || n < 1) return null
    return { segments: segments.slice(0, -2), page: n }
  }
  return { segments, page: 1 }
}

// Path → filters
export function parseCleanPath(segments: string[]): FilterState | null {
  const filters: FilterState = {
    q: '',
    priceMin: null,
    priceMax: null,
    district: [],
    bedrooms: [],
    floor: [],
    developer: [],
    status: [],
    permit: [],
    dealType: [],
    goal: null,
  }
  const seen = new Set<string>()
  for (const raw of segments) {
    const seg = decodeURIComponent(raw)
    if (SLUG_TO_DISTRICT[seg]) {
      if (seen.has('district')) return null
      seen.add('district')
      filters.district = [SLUG_TO_DISTRICT[seg]]
    } else if (SLUG_TO_BEDROOM[seg]) {
      if (seen.has('bedrooms')) return null
      seen.add('bedrooms')
      filters.bedrooms = [SLUG_TO_BEDROOM[seg]]
    } else if (SLUG_TO_STATUS[seg]) {
      if (seen.has('status')) return null
      seen.add('status')
      filters.status = [SLUG_TO_STATUS[seg]]
    } else if (PRICE_BY_SLUG[seg]) {
      if (seen.has('price')) return null
      seen.add('price')
      filters.priceMin = PRICE_BY_SLUG[seg].min
      filters.priceMax = PRICE_BY_SLUG[seg].max
    } else {
      return null // unknown segment → not a clean URL
    }
  }
  return filters
}

// Filters → canonical clean path (or null if not canonical-eligible)
//
// Canonical iff:
//   - only whitelisted dimensions used: district, bedrooms, status, price
//   - each used dimension has exactly one value
//   - 1..3 dimensions used (0 = base /ru/apartamenty)
//   - if price is set, must match a predefined segment
export function buildCanonicalPath(f: FilterState): string | null {
  // search query is never canonical
  if (f.q && f.q.trim().length > 0) return null
  // disallowed dimensions
  if (f.floor.length > 0) return null
  if (f.developer.length > 0) return null
  if (f.permit.length > 0) return null
  if (f.goal) return null
  // multi-value disallowed
  if (f.district.length > 1) return null
  if (f.bedrooms.length > 1) return null
  if (f.status.length > 1) return null
  // count used dimensions
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
  if (f.priceMin != null || f.priceMax != null) {
    const seg = matchPriceSegment(f.priceMin, f.priceMax)
    if (!seg) return null
    dims.push(seg.slug)
  }
  if (dims.length === 0) return '/ru/apartamenty'
  if (dims.length > 3) return null
  return '/ru/apartamenty/' + dims.join('/')
}

export function isCanonicalCombo(f: FilterState): boolean {
  return buildCanonicalPath(f) !== null
}

// Used by sitemap / static generation later
export function listAllCanonicalPaths(): string[] {
  const out = new Set<string>(['/ru/apartamenty'])
  const districtSlugs = Object.values(DISTRICT_TO_SLUG)
  const bedroomSlugs = Object.values(BEDROOM_TO_SLUG)
  const statusSlugs = Object.values(STATUS_TO_SLUG)
  const priceSlugs = PRICE_SEGMENTS.map(s => s.slug)

  for (const d of districtSlugs) out.add(`/ru/apartamenty/${d}`)
  for (const b of bedroomSlugs) out.add(`/ru/apartamenty/${b}`)
  for (const s of statusSlugs) out.add(`/ru/apartamenty/${s}`)
  for (const p of priceSlugs) out.add(`/ru/apartamenty/${p}`)
  for (const d of districtSlugs) {
    for (const b of bedroomSlugs) out.add(`/ru/apartamenty/${d}/${b}`)
    for (const s of statusSlugs) out.add(`/ru/apartamenty/${d}/${s}`)
    for (const p of priceSlugs) out.add(`/ru/apartamenty/${d}/${p}`)
  }
  for (const b of bedroomSlugs) {
    for (const s of statusSlugs) out.add(`/ru/apartamenty/${b}/${s}`)
    for (const p of priceSlugs) out.add(`/ru/apartamenty/${b}/${p}`)
  }
  return [...out]
}
