import { createClient } from '@supabase/supabase-js'
import Fuse from 'fuse.js'
import type { Option } from '@/components/filters/MultiSelectFilter'
import { translit, hasCyrillic } from '@/lib/translit'
import { loadVillaStyles } from '@/lib/villa-styles'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

export const PAGE_SIZE = 12
export const LAZY_CHUNK = 4

async function loadJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { next: { revalidate: 60 } })
    if (!r.ok) return fallback
    return (await r.json()) as T
  } catch {
    return fallback
  }
}

export type VillaFilterState = {
  q: string
  priceMin: number | null
  priceMax: number | null
  district: string[]
  bedrooms: string[]
  status: string[]
  permit: string[]
  year: string[]
  developer: string[]
  style: string[]
  // 'invest' = land color is anything but Yellow (Pink/Tourism/C1/Orange/etc.) —
  // only zones where short-term tourist rental is legal.
  // 'live'   = land color is Yellow (residential) plus a minimum livable area.
  goal: 'invest' | 'live' | null
}

export type VillaFilterOptions = {
  district: Option[]
  bedrooms: Option[]
  status: Option[]
  permit: Option[]
  year: Option[]
  developer: Option[]
  style: Option[]
}

export type Row = { airtable_id: string; data: Record<string, unknown> }

export type VillaCard = {
  id: string
  slug: string
  title: string
  priceUsd: number | null
  bedrooms: number | null
  area: number | null
  land: number | null
  district: string | null
  status: string | null
  photos: string[]
  lat: number | null
  lng: number | null
  investmentScore: number | null
}

export type SortOrder = 'price-desc' | 'investment-desc'

export const STATUS_TO_URL: Record<string, string> = {
  Строится: 'building',
  Построен: 'built',
  'Под заказ': 'planned',
}
export const URL_TO_STATUS: Record<string, string> = {
  building: 'Строится',
  built: 'Построен',
  planned: 'Под заказ',
}

export const EMPTY_FILTERS: VillaFilterState = {
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
  goal: null,
}

// === helpers ===

function asArray(v: unknown): string[] {
  if (typeof v !== 'string') return []
  return v.split(',').map(x => x.trim()).filter(Boolean)
}
function asNumber(v: string | undefined | null): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
export function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  // Airtable "computed field" wrappers come through as
  // { state: 'generated' | 'error', value: string | null }
  if (v && typeof v === 'object' && 'value' in v) {
    return firstString((v as { value: unknown }).value)
  }
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
function parseGeo(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeo(v[0])
  return null
}

export function parseQueryFilters(sp: Record<string, string | undefined>): VillaFilterState {
  return {
    q: typeof sp.q === 'string' ? sp.q.trim() : '',
    priceMin: asNumber(sp.price_min),
    priceMax: asNumber(sp.price_max),
    district: asArray(sp.district),
    bedrooms: asArray(sp.bedrooms),
    status: asArray(sp.status),
    permit: asArray(sp.permit),
    year: asArray(sp.year),
    developer: asArray(sp.developer),
    style: asArray(sp.style),
    goal: sp.goal === 'invest' || sp.goal === 'live' ? sp.goal : null,
  }
}

export function hasAnyFilter(f: VillaFilterState): boolean {
  return (
    f.q.trim().length > 0 ||
    f.priceMin != null ||
    f.priceMax != null ||
    f.district.length > 0 ||
    f.bedrooms.length > 0 ||
    f.status.length > 0 ||
    f.permit.length > 0 ||
    f.year.length > 0 ||
    f.developer.length > 0 ||
    f.style.length > 0 ||
    f.goal != null
  )
}

// Parse "Land color" string into a normalised bucket. Yellow zones are
// residential (legal to live in, not legal for short-term rental). Pink /
// Tourism / C1 / C2 / Orange are commercial / tourism — short-term rental
// is allowed there. Empty / unknown stays neutral so a missing field
// doesn't accidentally exclude a listing from either bucket.
type LandBucket = 'residential' | 'tourism' | 'unknown'
function landBucket(s: string | null): LandBucket {
  if (!s) return 'unknown'
  const lower = s.toLowerCase()
  if (lower.includes('yellow')) return 'residential'
  if (lower.includes('pink') || lower.includes('tourism') || lower.includes('orange')
   || /\bc-?\d\b/.test(lower) || lower.includes('commercial')) return 'tourism'
  return 'unknown'
}

const LIVE_MIN_AREA_SQM = 60

// === enrichment & filter ===

export type EnrichedRow = {
  id: string
  data: Record<string, unknown>
  district: string | null
  bedrooms: string | null
  status: string | null
  permit: string | null
  year: string | null
  developerName: string | null
  priceUsd: number | null
  area: number | null
  land: number | null
  lat: number | null
  lng: number | null
  style: string | null
  landBucket: LandBucket
}

export type StylesMap = Record<string, { style: string | null }>

export function enrich(r: Row, styles: StylesMap = {}): EnrichedRow {
  const d = r.data
  const yearRaw = firstString(d['Year of completion'])
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? yearRaw : null
  return {
    id: r.airtable_id,
    data: d,
    district: firstString(d['Location 2']) ?? firstString(d['Location']),
    bedrooms: firstString(d['Комнаты']),
    status: firstString(d['Статус']),
    permit: firstString(d['Разрешение']),
    year,
    developerName: firstString(d['Developer1']) ?? firstString(d['Developer']),
    priceUsd: numberOrNull(d['price']) ?? numberOrNull(d['Цена']),
    area: numberOrNull(d['Площадь']),
    land: numberOrNull(d['Земля']),
    lat: parseGeo(d['Geo']),
    lng: parseGeo(d['Geo 2']),
    style: styles[r.airtable_id]?.style ?? null,
    landBucket: landBucket(firstString(d['Land color'])),
  }
}

export function passes(e: EnrichedRow, f: VillaFilterState): boolean {
  if (f.priceMin != null && (e.priceUsd == null || e.priceUsd < f.priceMin)) return false
  if (f.priceMax != null && (e.priceUsd == null || e.priceUsd > f.priceMax)) return false
  if (f.district.length > 0 && (!e.district || !f.district.includes(e.district))) return false
  if (f.bedrooms.length > 0 && (!e.bedrooms || !f.bedrooms.includes(e.bedrooms))) return false
  if (f.status.length > 0) {
    const wanted = f.status.map(s => URL_TO_STATUS[s] ?? s)
    if (!e.status || !wanted.includes(e.status)) return false
  }
  if (f.permit.length > 0 && (!e.permit || !f.permit.includes(e.permit))) return false
  if (f.year.length > 0 && (!e.year || !f.year.includes(e.year))) return false
  if (f.developer.length > 0 && (!e.developerName || !f.developer.includes(e.developerName))) return false
  if (f.style.length > 0 && (!e.style || !f.style.includes(e.style))) return false
  if (f.goal === 'invest') {
    // Tourism / commercial zoning only — Yellow is illegal for short-term
    // rental in Bali, so it's the wrong land for an investment buyer.
    if (e.landBucket === 'residential') return false
  }
  if (f.goal === 'live') {
    // Yellow zoning + at least a livable area. A 20 m² studio isn't a
    // home; nobody serious about moving in wants that.
    if (e.landBucket === 'tourism') return false
    if (e.area != null && e.area < LIVE_MIN_AREA_SQM) return false
  }
  return true
}

// === fuzzy search ===

export function applySearch(rows: EnrichedRow[], rawQuery: string): EnrichedRow[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return rows
  const queries = [q]
  if (hasCyrillic(q)) queries.push(translit(q))

  type Item = { id: string; row: EnrichedRow; haystack: string }
  const items: Item[] = rows.map(r => {
    const titleClean = (firstString(r.data['SEO:Title']) ?? '')
      .replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    const parts = [
      titleClean,
      r.district ?? '',
      r.developerName ?? '',
      firstString(r.data['Notes']) ?? '',
    ].filter(Boolean).join(' ')
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

// === options (facet counts) ===

export function buildOptions(allRows: EnrichedRow[], current: VillaFilterState): VillaFilterOptions {
  function countsExcludingDim(
    dim: keyof VillaFilterState,
    picker: (e: EnrichedRow) => string | string[] | null,
  ): Map<string, number> {
    const cleared: VillaFilterState = { ...current, [dim]: dim === 'priceMin' || dim === 'priceMax' ? null : [] } as VillaFilterState
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
    dim: keyof VillaFilterState,
    picker: (e: EnrichedRow) => string | string[] | null,
    sortBy: 'count' | 'value' = 'count',
  ): Option[] {
    const all = [...distinct(picker)]
    const counts = countsExcludingDim(dim, picker)
    const arr: Option[] = all.map(value => ({ value, label: value, count: counts.get(value) ?? 0 }))
    if (sortBy === 'count') arr.sort((a, b) => (b.count! - a.count!) || a.label.localeCompare(b.label, 'ru'))
    else arr.sort((a, b) => Number(a.value) - Number(b.value) || a.value.localeCompare(b.value))
    return arr
  }

  const district = build('district', e => e.district)
  const bedrooms = build('bedrooms', e => e.bedrooms, 'value')
  const year = build('year', e => e.year, 'value')
  const permit = build('permit', e => e.permit)
  const developer = build('developer', e => e.developerName)
  const style = build('style', e => e.style)
  const statusCounts = countsExcludingDim('status', e => e.status)
  const status: Option[] = []
  for (const [name, key] of Object.entries(STATUS_TO_URL)) {
    const c = statusCounts.get(name) ?? 0
    if (c > 0) status.push({ value: key, label: name, count: c })
  }

  return { district, bedrooms, status, permit, year, developer, style }
}

// === card mapping ===

export function toCard(e: EnrichedRow, manifest: Record<string, string[]>): VillaCard | null {
  const d = e.data
  const slug = firstString(d['SEO:Slug'])
  if (!slug || slug.startsWith('-')) return null
  const titleRaw =
    cleanTitle(firstString(d['SEO:Title'])) ??
    firstString(d['ИИ Имя']) ??
    firstString(d['Имя ENG']) ??
    firstString(d['Name'])
  if (!titleRaw) return null
  return {
    id: e.id,
    slug,
    title: titleRaw,
    priceUsd: e.priceUsd,
    bedrooms: e.bedrooms ? Number(e.bedrooms) : null,
    area: e.area,
    land: e.land,
    district: e.district,
    status: e.status,
    photos: manifest[e.id] ?? [],
    lat: e.lat,
    lng: e.lng,
    investmentScore: null,
  }
}

// === data load ===

// Module-level cache. unstable_cache can't hold villa data — exceeds the 2MB
// per-cache-item limit and silently fails (catalog renders empty).
type CachedAll = { enriched: EnrichedRow[]; manifest: Record<string, string[]> }
const TTL_MS = 60_000
let _cache: { ts: number; data: CachedAll } | null = null
let _inflight: Promise<CachedAll> | null = null

async function _loadAllInternal(): Promise<CachedAll> {
  const [rowsRes, manifest, styles] = await Promise.all([
    sb.from('raw_villas').select('airtable_id, data').limit(1000),
    loadJson<Record<string, string[]>>(PHOTO_MANIFEST_URL, {}),
    loadVillaStyles(),
  ])
  const rows = (rowsRes.data ?? []) as Row[]
  const enriched = rows
    .filter(r => r.data?.['Опубликовать'] === true)
    .map(r => enrich(r, styles))
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

export function buildAllCards(
  enriched: EnrichedRow[],
  manifest: Record<string, string[]>,
  filters: VillaFilterState,
  scores?: Map<string, { composite: number }>,
  sort: SortOrder = 'investment-desc',
): VillaCard[] {
  let filtered = enriched.filter(e => passes(e, filters))
  const isSearch = filters.q.trim().length > 0
  if (isSearch) filtered = applySearch(filtered, filters.q)
  const mapped = filtered.map(e => toCard(e, manifest)).filter((c): c is VillaCard => c !== null)
  if (scores) for (const c of mapped) c.investmentScore = scores.get(c.id)?.composite ?? null
  let sorted: VillaCard[]
  if (isSearch) sorted = mapped
  else if (sort === 'investment-desc') sorted = [...mapped].sort((a, b) => (b.investmentScore ?? -1) - (a.investmentScore ?? -1))
  else sorted = [...mapped].sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0))
  // Dedupe by airtable id only. Same slug across rows is a real case
  // (multiple physical units of one project type with different prices/land
  // sizes) — they should each show as a card.
  const seen = new Set<string>()
  const out: VillaCard[] = []
  for (const c of sorted) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
  }
  return out
}

export type CatalogPage = {
  cards: VillaCard[]
  page: number
  totalPages: number
  totalCount: number
  hasMore: boolean
  options: VillaFilterOptions
}

export async function loadCatalogPage(
  filters: VillaFilterState,
  page: number,
  sort: SortOrder = 'investment-desc',
): Promise<CatalogPage> {
  const safePage = Math.max(1, Math.floor(page))
  const { enriched, manifest } = await loadAll()
  const options = buildOptions(enriched, filters)
  const scores = sort === 'investment-desc'
    ? await (await import('@/lib/investment/batch-scores')).loadAllVillaScores().catch(() => undefined)
    : undefined
  const all = buildAllCards(enriched, manifest, filters, scores, sort)
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

// === heading & metadata ===

function fmtUsd(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}

export function buildHeading(f: VillaFilterState): string {
  const adj: string[] = []
  if (f.status.length === 1) {
    const s = f.status[0]
    adj.push(s === 'building' ? 'Строящиеся' : s === 'built' ? 'Готовые' : 'Планируемые')
  }
  if (f.bedrooms.length > 0) {
    const sorted = [...f.bedrooms].sort()
    adj.push(sorted.join('-, ') + '-комнатные')
  }
  const noun = adj.length || hasAnyFilter(f) ? 'виллы и дома' : 'Виллы и дома'
  let s = adj.length ? adj.join(' ') + ' ' + noun : noun

  if (f.district.length === 1) s += ` в районе ${f.district[0]}`
  else if (f.district.length > 1) s += ` в районах ${f.district.join(', ')}`
  else s += ' на Бали'

  if (f.developer.length === 1) s += ` от застройщика ${f.developer[0]}`
  if (f.style.length === 1) s += ` в стиле ${f.style[0]}`
  else if (f.style.length > 1) s += ` в стилях ${f.style.join(', ')}`
  if (f.priceMin != null && f.priceMax != null) s += ` за ${fmtUsd(f.priceMin)} – ${fmtUsd(f.priceMax)}`
  else if (f.priceMax != null) s += ` до ${fmtUsd(f.priceMax)}`
  else if (f.priceMin != null) s += ` от ${fmtUsd(f.priceMin)}`
  if (f.permit.length === 1) s += ` с разрешением ${f.permit[0]}`
  if (f.year.length === 1) s += ` со сдачей в ${f.year[0]}`

  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function buildTitle(f: VillaFilterState): string {
  return buildHeading(f) + ' | Balinsky'
}

// Build a unique meta-description per filter combination so 5–15K filter
// pages don't share one generic line (Google folds duplicate-meta pages).
// Mentions count when known, district, bedrooms, style, price range —
// every input narrows the line further.
export function buildDescription(f: VillaFilterState, totalCount?: number): string {
  const noun =
    f.bedrooms.length === 1 ? `${f.bedrooms[0]}-комнатных вилл и домов`
    : 'вилл и домов'
  const where =
    f.district.length === 1 ? `в районе ${f.district[0]}`
    : f.district.length > 1 ? `в районах ${f.district.join(', ')}`
    : 'на Бали'
  const countPart = typeof totalCount === 'number' && totalCount > 0
    ? `${totalCount} ${noun}` : noun.charAt(0).toUpperCase() + noun.slice(1)
  let s = `${countPart} ${where}`
  if (f.style.length === 1) s += ` в стиле ${f.style[0]}`
  if (f.status.length === 1) {
    const lbl = f.status[0] === 'building' ? 'строящихся'
      : f.status[0] === 'built' ? 'готовых' : 'на стадии планирования'
    s += `, ${lbl}`
  }
  if (f.priceMin != null && f.priceMax != null) s += `, цены ${fmtUsd(f.priceMin)}–${fmtUsd(f.priceMax)}`
  else if (f.priceMax != null) s += `, до ${fmtUsd(f.priceMax)}`
  else if (f.priceMin != null) s += `, от ${fmtUsd(f.priceMin)}`
  return `${s}. Фото, актуальные цены, разрешения, контакты застройщиков.`
}

export function buildMetadata(
  f: VillaFilterState,
  opts: { canonicalPath: string; noIndex: boolean; totalCount?: number },
) {
  const title = buildTitle(f)
  const description = buildDescription(f, opts.totalCount)
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
