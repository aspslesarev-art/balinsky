import { createClient } from '@supabase/supabase-js'
import Fuse from 'fuse.js'
import type { ApartmentCardData } from '@/components/ApartmentCard'
import type { FilterOptions, FilterState } from '@/components/filters/FiltersBar'
import type { Option } from '@/components/filters/MultiSelectFilter'
import { translit, hasCyrillic } from '@/lib/translit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`
const DEV_LOOKUP_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_developers.json`

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

export type Row = { airtable_id: string; data: Record<string, unknown> }
export type Card = ApartmentCardData & { id: string }

export const PAGE_SIZE = 12
export const LAZY_CHUNK = 4

export type CatalogPage = {
  cards: Card[]
  page: number
  totalPages: number
  totalCount: number
  hasMore: boolean
}

export const STATUS_TO_URL: Record<string, string> = { 'Строится': 'building', 'Построен': 'built' }
export const URL_TO_STATUS: Record<string, string> = { building: 'Строится', built: 'Построен' }

export const EMPTY_FILTERS: FilterState = {
  q: '',
  priceMin: null,
  priceMax: null,
  district: [],
  bedrooms: [],
  floor: [],
  developer: [],
  status: [],
  permit: [],
}

export async function loadJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { next: { revalidate: 60 } })
    if (!r.ok) return fallback
    return (await r.json()) as T
  } catch {
    return fallback
  }
}

export function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) {
    const s = v[0]
    if (typeof s === 'string') return s.trim() || null
    if (typeof s === 'number') return String(s)
  }
  if (typeof v === 'number') return String(v)
  return null
}
export function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
function cleanTitle(s: string | null): string | null {
  if (!s) return null
  return s.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() || null
}
function normFloor(v: unknown): string | null {
  const s = firstString(v)
  if (!s) return null
  if (/ground/i.test(s)) return '0'
  const n = Number(s)
  return Number.isFinite(n) ? String(n) : null
}
function asArray(v: unknown): string[] {
  if (typeof v !== 'string') return []
  return v.split(',').map(x => x.trim()).filter(Boolean)
}
function asNumber(v: string | undefined | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseQueryFilters(sp: Record<string, string | undefined>): FilterState {
  return {
    q: typeof sp.q === 'string' ? sp.q.trim() : '',
    priceMin: asNumber(sp.price_min),
    priceMax: asNumber(sp.price_max),
    district: asArray(sp.district),
    bedrooms: asArray(sp.bedrooms),
    floor: asArray(sp.floor),
    developer: asArray(sp.developer),
    status: asArray(sp.status),
    permit: asArray(sp.permit),
  }
}

export type EnrichedRow = {
  id: string
  data: Record<string, unknown>
  district: string | null
  bedrooms: string | null
  floor: string | null
  developerNames: string[]
  status: string | null
  permit: string | null
  priceUsd: number | null
  lat: number | null
  lng: number | null
}

function priceUpdatedMs(d: Record<string, unknown>): number {
  const raw = firstString(d['Обновление цены'])
    ?? firstString(d['Последнее обновление'])
    ?? firstString(d['Обновлено'])
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : 0
}

function parseGeo(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeo(v[0])
  return null
}

function enrich(r: Row, devMap: Record<string, string>): EnrichedRow {
  const d = r.data
  const devRefs = Array.isArray(d['Developer']) ? (d['Developer'] as unknown[]) : []
  const developerNames = devRefs
    .map(id => (typeof id === 'string' ? devMap[id] : null))
    .filter((n): n is string => !!n)

  return {
    id: r.airtable_id,
    data: d,
    district: firstString(d['Location filter']),
    bedrooms: firstString(d['Комнаты']),
    floor: normFloor(d['Этаж']),
    developerNames,
    status: firstString(d['Статус']),
    permit: firstString(d['Разрешение']),
    priceUsd: numberOrNull(d['price_usd'] ?? d['Цена']),
    lat: parseGeo(d['Geo']),
    lng: parseGeo(d['Geo 2']),
  }
}

// Fuzzy search by SEO title, district, developer names. Tolerates typos and
// Cyrillic↔Latin (so "убуд" finds "Ubud", "магнум" finds "Magnum estate").
// Returns rows ordered by relevance (best match first).
export function applySearch(rows: EnrichedRow[], rawQuery: string): EnrichedRow[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return rows

  const queries = [q]
  if (hasCyrillic(q)) queries.push(translit(q))

  type Item = { id: string; row: EnrichedRow; haystack: string }
  const items: Item[] = rows.map(r => {
    const titleClean = (firstString(r.data['SEO:Title']) ?? '')
      .replace(/\s*\|\s*Balinsky\s*$/i, '')
      .trim()
    const parts = [
      titleClean,
      r.district ?? '',
      r.developerNames.join(' '),
      firstString(r.data['Notes']) ?? '',
    ]
      .filter(Boolean)
      .join(' ')
    const haystack = (parts + ' ' + translit(parts)).toLowerCase()
    return { id: r.id, row: r, haystack }
  })

  const fuse = new Fuse(items, {
    keys: ['haystack'],
    threshold: 0.35,
    distance: 200,
    minMatchCharLength: 2,
    ignoreLocation: true,
    includeScore: true,
  })

  const bestScore = new Map<string, number>()
  const itemById = new Map(items.map(i => [i.id, i]))
  for (const queryStr of queries) {
    for (const m of fuse.search(queryStr)) {
      const s = m.score ?? 1
      const prev = bestScore.get(m.item.id)
      if (prev == null || s < prev) bestScore.set(m.item.id, s)
    }
  }

  if (bestScore.size === 0) return []

  return [...bestScore.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => itemById.get(id)!.row)
}

export function passes(e: EnrichedRow, f: FilterState): boolean {
  if (f.priceMin != null && (e.priceUsd == null || e.priceUsd < f.priceMin)) return false
  if (f.priceMax != null && (e.priceUsd == null || e.priceUsd > f.priceMax)) return false
  if (f.district.length > 0 && (!e.district || !f.district.includes(e.district))) return false
  if (f.bedrooms.length > 0 && (!e.bedrooms || !f.bedrooms.includes(e.bedrooms))) return false
  if (f.floor.length > 0 && (!e.floor || !f.floor.includes(e.floor))) return false
  if (f.developer.length > 0 && !e.developerNames.some(n => f.developer.includes(n))) return false
  if (f.status.length > 0) {
    const wanted = f.status.map(s => URL_TO_STATUS[s] ?? s)
    if (!e.status || !wanted.includes(e.status)) return false
  }
  if (f.permit.length > 0 && (!e.permit || !f.permit.includes(e.permit))) return false
  return true
}

// Facet-counts: for each dimension, count items matching all OTHER filters
// (so e.g. "developer Alex Villas (32)" becomes "Alex Villas (X)" reflecting
// only apartments in the currently chosen district). Options with count 0 are
// kept so the user can see what would be possible if they cleared other filters.
export function buildOptions(allRows: EnrichedRow[], current: FilterState): FilterOptions {
  function countsExcludingDim(
    dim: keyof FilterState,
    picker: (e: EnrichedRow) => string | string[] | null
  ): Map<string, number> {
    const cleared: FilterState = { ...current, [dim]: [] }
    const subset = allRows.filter(e => passes(e, cleared))
    const m = new Map<string, number>()
    for (const e of subset) {
      const v = picker(e)
      if (v == null) continue
      const arr = Array.isArray(v) ? v : [v]
      for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1)
    }
    return m
  }

  function distinct(picker: (e: EnrichedRow) => string | string[] | null): Set<string> {
    const s = new Set<string>()
    for (const e of allRows) {
      const v = picker(e)
      if (v == null) continue
      const arr = Array.isArray(v) ? v : [v]
      for (const x of arr) s.add(x)
    }
    return s
  }

  function build(
    dim: keyof FilterState,
    picker: (e: EnrichedRow) => string | string[] | null,
    sortBy: 'count' | 'value' = 'count'
  ): Option[] {
    const all = [...distinct(picker)]
    const counts = countsExcludingDim(dim, picker)
    const arr: Option[] = all.map(value => ({ value, label: value, count: counts.get(value) ?? 0 }))
    if (sortBy === 'count') {
      arr.sort((a, b) => (b.count! - a.count!) || a.label.localeCompare(b.label, 'ru'))
    } else {
      arr.sort((a, b) => Number(a.value) - Number(b.value) || a.value.localeCompare(b.value))
    }
    return arr
  }

  const districts = build('district', e => e.district)
  const bedrooms = build('bedrooms', e => e.bedrooms, 'value')
  const floor = build('floor', e => e.floor, 'value').map(o => ({
    ...o,
    label: o.value === '0' ? 'Цокольный' : o.label,
  }))
  const developer = build('developer', e => e.developerNames)

  // status: counts keyed by Russian name, options keyed by URL slug
  const statusCounts = countsExcludingDim('status', e => e.status)
  const status: Option[] = []
  for (const [name, key] of Object.entries(STATUS_TO_URL)) {
    status.push({ value: key, label: name, count: statusCounts.get(name) ?? 0 })
  }

  const permit = build('permit', e => e.permit)

  return { district: districts, bedrooms, floor, developer, status, permit }
}

export function toCard(e: EnrichedRow, manifest: Record<string, string[]>): Card | null {
  const d = e.data
  const slug = firstString(d['SEO:Slug'])
  if (!slug || slug.startsWith('-')) return null
  const title =
    cleanTitle(firstString(d['SEO:Title'])) ??
    firstString(d['ИИ Имя']) ??
    firstString(d['Name'])
  if (!title) return null
  return {
    id: e.id,
    slug,
    title,
    priceUsd: e.priceUsd,
    bedrooms: e.bedrooms ? Number(e.bedrooms) : null,
    area: numberOrNull(d['Площадь']),
    floor: e.floor,
    photos: manifest[e.id] ?? [],
  }
}

// Module-level cache — same reason as villas/_lib.ts (unstable_cache hits
// the 2MB per-item limit and silently fails).
type CachedAll = { enriched: EnrichedRow[]; manifest: Record<string, string[]> }
const TTL_MS = 60_000
let _cache: { ts: number; data: CachedAll } | null = null
let _inflight: Promise<CachedAll> | null = null

async function _loadAllInternal(): Promise<CachedAll> {
  const [rowsRes, manifest, devMap] = await Promise.all([
    sb.from('raw_apartments').select('airtable_id, data').limit(1000),
    loadJson<Record<string, string[]>>(PHOTO_MANIFEST_URL, {}),
    loadJson<Record<string, string>>(DEV_LOOKUP_URL, {}),
  ])
  const rows = (rowsRes.data ?? []) as Row[]
  const enriched = rows
    .filter(r => r.data?.['Опубликовать'] === true)
    .map(r => enrich(r, devMap))
  return { enriched, manifest }
}

export async function loadAll(): Promise<CachedAll> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  if (_inflight) return _inflight
  _inflight = _loadAllInternal()
    .then(data => { _cache = { ts: Date.now(), data }; return data })
    .finally(() => { _inflight = null })
  return _inflight
}

// Returns ALL cards (post-filter, post-search, post-dedupe, post-sort) — used
// when callers need the full set (map view, total counts, facets).
export function buildAllCards(
  enriched: EnrichedRow[],
  manifest: Record<string, string[]>,
  filters: FilterState,
): Card[] {
  let filtered = enriched.filter(e => passes(e, filters))
  const isSearch = filters.q.trim().length > 0
  if (isSearch) filtered = applySearch(filtered, filters.q)

  if (!isSearch) {
    // Sort by price-update recency (newest first); fall back to price desc
    // when neither row has a parseable date so behaviour stays sensible
    // for legacy rows.
    filtered = [...filtered].sort((a, b) => {
      const ta = priceUpdatedMs(a.data)
      const tb = priceUpdatedMs(b.data)
      if (ta !== tb) return tb - ta
      return (b.priceUsd ?? 0) - (a.priceUsd ?? 0)
    })
  }

  const sorted = filtered
    .map(e => toCard(e, manifest))
    .filter((c): c is Card => c !== null)

  const seen = new Set<string>()
  const out: Card[] = []
  for (const c of sorted) {
    if (seen.has(c.slug)) continue
    seen.add(c.slug)
    out.push(c)
  }
  return out
}

// Paginated slice of the catalog (PAGE_SIZE items). Pages are 1-indexed.
export async function loadCatalogPage(
  filters: FilterState,
  page: number,
): Promise<CatalogPage & { options: ReturnType<typeof buildOptions> }> {
  const safePage = Math.max(1, Math.floor(page))
  const { enriched, manifest } = await loadAll()
  const options = buildOptions(enriched, filters)
  const all = buildAllCards(enriched, manifest, filters)
  const totalCount = all.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const start = (safePage - 1) * PAGE_SIZE
  const cards = all.slice(start, start + PAGE_SIZE)
  return {
    cards,
    page: safePage,
    totalPages,
    totalCount,
    hasMore: start + cards.length < totalCount,
    options,
  }
}

// === Heading / metadata builders ===

function fmtUsd(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}

export function hasAnyFilter(f: FilterState): boolean {
  return (
    f.q.trim().length > 0 ||
    f.priceMin != null ||
    f.priceMax != null ||
    f.district.length > 0 ||
    f.bedrooms.length > 0 ||
    f.floor.length > 0 ||
    f.developer.length > 0 ||
    f.status.length > 0 ||
    f.permit.length > 0
  )
}

export function buildHeading(f: FilterState): string {
  const adj: string[] = []
  if (f.status.length === 1) {
    adj.push(f.status[0] === 'building' ? 'Строящиеся' : 'Готовые')
  }
  if (f.bedrooms.length > 0) {
    const sorted = [...f.bedrooms].sort()
    adj.push(sorted.join('-, ') + '-комнатные')
  }

  const base = hasAnyFilter(f) ? 'апартаменты' : 'Апартаменты и квартиры'
  let s = adj.length ? adj.join(' ') + ' ' + base : base

  if (f.district.length === 1) s += ` в районе ${f.district[0]}`
  else if (f.district.length > 1) s += ` в районах ${f.district.join(', ')}`
  else s += ' на Бали'

  if (f.developer.length === 1) s += ` от застройщика ${f.developer[0]}`

  if (f.priceMin != null && f.priceMax != null) s += ` за ${fmtUsd(f.priceMin)} – ${fmtUsd(f.priceMax)}`
  else if (f.priceMax != null) s += ` до ${fmtUsd(f.priceMax)}`
  else if (f.priceMin != null) s += ` от ${fmtUsd(f.priceMin)}`

  if (f.permit.length === 1) s += ` с разрешением ${f.permit[0]}`

  if (f.floor.length === 1) {
    const fl = f.floor[0]
    s += fl === '0' ? ' (цокольный этаж)' : ` (${fl} этаж)`
  }

  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function buildTitle(f: FilterState): string {
  return buildHeading(f) + ' | Balinsky'
}

export function buildDescription(f: FilterState): string {
  const bits: string[] = []
  bits.push(buildHeading(f))
  bits.push('Каталог с фото, ценами, застройщиками и характеристиками')
  if (f.bedrooms.length > 1) bits.push(`спальни: ${f.bedrooms.join(', ')}`)
  if (f.floor.length > 1) bits.push(`этажи: ${f.floor.map(x => x === '0' ? 'цоколь' : x).join(', ')}`)
  if (f.developer.length > 1) bits.push(`застройщики: ${f.developer.slice(0, 5).join(', ')}${f.developer.length > 5 ? '…' : ''}`)
  if (f.permit.length > 1) bits.push(`разрешения: ${f.permit.join(', ')}`)
  return bits.join('. ') + '.'
}

export function buildMetadata(f: FilterState, opts: { canonicalPath: string; noIndex: boolean }) {
  const title = buildTitle(f)
  const description = buildDescription(f)
  return {
    title,
    description,
    alternates: { canonical: opts.canonicalPath },
    robots: opts.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: { title, description, type: 'website' as const, url: opts.canonicalPath },
    twitter: { card: 'summary_large_image' as const, title, description },
  }
}
