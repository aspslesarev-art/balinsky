import { createClient } from '@supabase/supabase-js'
import Fuse from 'fuse.js'
import type { ComplexCardData } from '@/components/ComplexCard'
import type { Option } from '@/components/filters/MultiSelectFilter'
import { translit, hasCyrillic } from '@/lib/translit'
import { loadEnTranslations, mergeEnTranslations } from '@/lib/en-translations'
import { getDistrictCommercialMeta } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { enLabel, type FilterDim } from '@/lib/filter-i18n'
import { isTopBlacklisted } from '@/lib/top-blacklist'
import { cdnRewriteManifest, cdnManifestUrl } from '@/lib/photo-cdn'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

async function loadJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { next: { revalidate: 60 } })
    if (!r.ok) return fallback
    return (await r.json()) as T
  } catch {
    return fallback
  }
}

const CURRENT_YEAR = 2026
export const PAGE_SIZE = 12
export const LAZY_CHUNK = 4

export type ComplexFilterState = {
  q: string
  district: string[]
  types: string[]
  status: string[]
  permit: string[]
  year: string[]
  developer: string[]
}

export type ComplexFilterOptions = {
  district: Option[]
  types: Option[]
  status: Option[]
  permit: Option[]
  year: Option[]
  developer: Option[]
}

export type Row = {
  airtable_id: string
  data: Record<string, unknown>
  slug: string | null
  cover_url: string | null
}

export type ComplexCard = ComplexCardData & {
  id: string; lat: number | null; lng: number | null
  // Editorial pin — TOP-flagged complexes float to the top of the
  // catalog. `topRank` (when present) orders within the pinned
  // group; lower number wins.
  isTop: boolean
  topRank: number | null
}

export type CatalogPage = {
  cards: ComplexCard[]
  page: number
  totalPages: number
  totalCount: number
  hasMore: boolean
  options: ComplexFilterOptions
}

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

export const EMPTY_FILTERS: ComplexFilterState = {
  q: '',
  district: [],
  types: [],
  status: [],
  permit: [],
  year: [],
  developer: [],
}

// === helpers ===

function asArray(v: unknown): string[] {
  if (typeof v !== 'string') return []
  return v.split(',').map(x => x.trim()).filter(Boolean)
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
export function strList(v: unknown): string[] {
  // "Виллы, Апартаменты" → ['Виллы', 'Апартаменты'], also handles arrays
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
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

export function parseQueryFilters(sp: Record<string, string | undefined>): ComplexFilterState {
  return {
    q: typeof sp.q === 'string' ? sp.q.trim() : '',
    district: asArray(sp.district),
    types: asArray(sp.types),
    status: asArray(sp.status),
    permit: asArray(sp.permit),
    year: asArray(sp.year),
    developer: asArray(sp.developer),
  }
}

export function hasAnyFilter(f: ComplexFilterState): boolean {
  return (
    f.q.trim().length > 0 ||
    f.district.length > 0 ||
    f.types.length > 0 ||
    f.status.length > 0 ||
    f.permit.length > 0 ||
    f.year.length > 0 ||
    f.developer.length > 0
  )
}

// === enrichment & filtering ===

export type EnrichedRow = {
  id: string
  data: Record<string, unknown>
  slug: string | null
  coverUrl: string | null
  name: string | null
  district: string | null
  types: string[]
  status: string | null
  permit: string | null
  // Sales status from Airtable's «Статус продаж» field. Editors mark
  // a complex as «Продано» when every unit is sold and we render a
  // red badge on the card + detail hero. Independent from construction
  // `Статус` ('Строится' / 'Построен' / 'Под заказ').
  salesStatus: string | null
  year: string | null
  developerName: string | null
  lat: number | null
  lng: number | null
  photoCount: number
  // Editorial pin — true when Airtable's `ТОП` checkbox or `TOP`
  // numeric is set. Pinned complexes float to the top of the
  // catalog regardless of the active sort.
  isTop: boolean
  // Optional manual rank (1, 2, 3…) within the pinned group.
  // Lower number wins — Airtable's `TOP` field carries this when
  // it's a number; checkbox-only pins arrive as null and tie-break
  // by name afterwards.
  topRank: number | null
}

function enrich(r: Row): EnrichedRow {
  const d = r.data
  const photos = d['Opt photos']
  const photoCount = Array.isArray(photos) && photos.length > 0 ? photos.length : 1
  const yearRaw = firstString(d['Year of completion ']) ?? firstString(d['Year of completion'])
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? yearRaw : null
  return {
    id: r.airtable_id,
    data: d,
    slug: r.slug,
    coverUrl: r.cover_url,
    name: firstString(d['Project']),
    district: firstString(d['Location 2']) ?? firstString(d['Location']),
    types: strList(d['Типы юнитов']),
    status: firstString(d['Статус']),
    permit: firstString(d['Разрешительные документы']),
    salesStatus: firstString(d['Статус продаж']),
    year,
    developerName: firstString(d['Developer1']) ?? firstString(d['Варианты поиска застройщика']),
    lat: parseGeo(d['Geo']),
    lng: parseGeo(d['Geo 2']),
    photoCount,
    // Two parallel fields exist in Airtable: `ТОП` (cyrillic
    // checkbox) for the pin flag, and `TOP` (latin) which is
    // either a number-rank or sometimes a checkbox boolean. We
    // honour any truthy value as a pin; numeric values double as
    // the rank within the pinned group.
    isTop: (d['ТОП'] === true || d['TOP'] === true || typeof d['TOP'] === 'number')
      && !isTopBlacklisted(
        firstString(d['Developer1']),
        firstString(d['Варианты поиска застройщика']),
        firstString(d['Project']),
        firstString(d['Варианты поиска комлпекса']),
      ),
    topRank: typeof d['TOP'] === 'number' ? d['TOP'] : null,
  }
}

export function passes(e: EnrichedRow, f: ComplexFilterState): boolean {
  if (f.district.length > 0 && (!e.district || !f.district.includes(e.district))) return false
  if (f.types.length > 0 && !e.types.some(t => f.types.includes(t))) return false
  if (f.status.length > 0) {
    const wanted = f.status.map(s => URL_TO_STATUS[s] ?? s)
    if (!e.status || !wanted.includes(e.status)) return false
  }
  if (f.permit.length > 0 && (!e.permit || !f.permit.includes(e.permit))) return false
  if (f.year.length > 0 && (!e.year || !f.year.includes(e.year))) return false
  if (f.developer.length > 0 && (!e.developerName || !f.developer.includes(e.developerName))) return false
  return true
}

// === fuzzy search (transliterated) ===

export function applySearch(rows: EnrichedRow[], rawQuery: string): EnrichedRow[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return rows
  const queries = [q]
  if (hasCyrillic(q)) queries.push(translit(q))

  type Item = { id: string; row: EnrichedRow; haystack: string }
  const items: Item[] = rows.map(r => {
    const parts = [
      r.name ?? '',
      r.district ?? '',
      r.types.join(' '),
      r.developerName ?? '',
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

// === filter options (facet counts excluding self-dim) ===

// Build a value→EN-translation map by walking rows. For each unique RU
// value of `colRu`, the first row that also has a non-empty `colEn` wins.
// When the column-pair isn't filled in Airtable, the map stays empty
// and consumers fall back to the literal "<colRu> EN" placeholder.
function buildLabelMap(rows: EnrichedRow[], colRu: string, colEn: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const r of rows) {
    const ruRaw = r.data[colRu]
    const enRaw = r.data[colEn]
    const ru = Array.isArray(ruRaw) ? ruRaw.map(String) : [firstString(ruRaw) ?? '']
    const en = Array.isArray(enRaw) ? enRaw.map(String) : [firstString(enRaw) ?? '']
    if (ru.length === en.length) {
      for (let i = 0; i < ru.length; i++) {
        const k = ru[i]?.trim(); const v = en[i]?.trim()
        if (k && v && !out.has(k)) out.set(k, v)
      }
    } else if (ru.length === 1 && en[0]?.trim()) {
      const k = ru[0]?.trim(); const v = en[0]?.trim()
      if (k && v && !out.has(k)) out.set(k, v)
    }
  }
  return out
}

export function buildOptions(
  allRows: EnrichedRow[],
  current: ComplexFilterState,
  lang: 'ru' | 'en' = 'ru',
): ComplexFilterOptions {
  // Per-filter EN translation maps. Add a `<RU column> EN` column in
  // Airtable to translate filter labels — until then EN catalogues
  // render the literal column name as a placeholder so editors can
  // see what to create.
  const enMap = lang === 'en' ? {
    district:  buildLabelMap(allRows, 'Location 2', 'Location 2 EN'),
    types:     buildLabelMap(allRows, 'Типы юнитов', 'Типы юнитов EN'),
    status:    buildLabelMap(allRows, 'Статус', 'Статус EN'),
    permit:    buildLabelMap(allRows, 'Разрешительные документы', 'Разрешительные документы EN'),
    developer: new Map<string, string>(), // brand names — keep as-is
  } : null

  const DIM_TO_FILTER: Partial<Record<string, FilterDim>> = {
    status: 'status', permit: 'permit', types: 'type',
  }
  function tr(dim: 'district' | 'types' | 'status' | 'permit' | 'developer', value: string, _ruCol: string): string {
    if (!enMap) return value
    if (dim === 'developer') return value
    const en = enMap[dim].get(value)
    if (en) return en
    const filterDim = DIM_TO_FILTER[dim]
    return filterDim ? enLabel(filterDim, value) : value
  }

  function countsExcludingDim(
    dim: keyof ComplexFilterState,
    picker: (e: EnrichedRow) => string | string[] | null,
  ): Map<string, number> {
    const cleared: ComplexFilterState = { ...current, [dim]: [] }
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
    dim: keyof ComplexFilterState,
    picker: (e: EnrichedRow) => string | string[] | null,
    sortBy: 'count' | 'value' = 'count',
  ): Option[] {
    const all = [...distinct(picker)]
    const counts = countsExcludingDim(dim, picker)
    const arr: Option[] = all.map(value => ({ value, label: value, count: counts.get(value) ?? 0 }))
    if (sortBy === 'count') {
      arr.sort((a, b) => (b.count! - a.count!) || a.label.localeCompare(b.label, 'ru'))
    } else {
      arr.sort((a, b) => a.value.localeCompare(b.value))
    }
    return arr
  }

  const districtRaw  = build('district', e => e.district)
  const typesRaw     = build('types', e => e.types)
  const year         = build('year', e => e.year, 'value')
  const permitRaw    = build('permit', e => e.permit)
  const developerRaw = build('developer', e => e.developerName)

  // status: counts keyed by Russian name, options keyed by URL slug.
  const statusCounts = countsExcludingDim('status', e => e.status)
  const statusRaw: Option[] = []
  for (const [name, key] of Object.entries(STATUS_TO_URL)) {
    const c = statusCounts.get(name) ?? 0
    if (c > 0) statusRaw.push({ value: key, label: name, count: c })
  }

  // Apply EN translation pass — keep `value` (URL slug / RU value) so
  // existing URLs and filter matching keep working; only the `label`
  // changes for display.
  const district  = districtRaw.map(o  => ({ ...o, label: tr('district',  o.label, 'Location 2') }))
  const types     = typesRaw.map(o     => ({ ...o, label: tr('types',     o.label, 'Типы юнитов') }))
  const permit    = permitRaw.map(o    => ({ ...o, label: tr('permit',    o.label, 'Разрешительные документы') }))
  const developer = developerRaw // brand names — no translation
  const status    = statusRaw.map(o    => ({ ...o, label: tr('status',    o.label, 'Статус') }))

  return { district, types, status, permit, year, developer }
}

// === card mapping ===

function readinessOf(e: EnrichedRow): number {
  // Editorial source-of-truth: «Готовность» в Airtable, число 0..1.
  const raw = e.data['Готовность']
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const pct = raw <= 1 ? raw * 100 : raw
    return Math.max(0, Math.min(100, Math.round(pct)))
  }
  const status = (e.status ?? '').toLowerCase()
  if (status.includes('построен')) return 100
  if (status.includes('заказ')) return 10
  const yr = e.year ? Number(e.year) : null
  if (yr != null) {
    const delta = yr - CURRENT_YEAR
    if (delta <= 0) return 95
    if (delta === 1) return 70
    if (delta === 2) return 45
    if (delta === 3) return 30
    return 20
  }
  return 50
}

export function toCard(
  e: EnrichedRow,
  manifest: Record<string, string[]>,
  prices?: Map<string, ComplexPrices>,
): ComplexCard | null {
  if (!e.slug || !e.name) return null
  const photos = manifest[e.id] ?? []
  const p = prices?.get(e.id)
  return {
    id: e.id,
    slug: e.slug,
    name: e.name,
    location: e.district,
    types: e.types.length > 0 ? e.types.join(', ') : null,
    permit: e.permit,
    readiness: readinessOf(e),
    coverUrl: e.coverUrl,
    photos,
    photoCount: photos.length || e.photoCount,
    lat: e.lat,
    lng: e.lng,
    villaPriceFrom: p?.villas?.from ?? null,
    villaPriceTo: p?.villas?.to ?? null,
    aptPriceFrom: p?.apartments?.from ?? null,
    aptPriceTo: p?.apartments?.to ?? null,
    isSold: e.salesStatus === 'Продано',
    isTop: e.isTop,
    topRank: e.topRank,
  }
}

// === data load ===

// Module-level cache — same reason as villas/apartments _lib.ts.
type PriceRange = { from: number; to: number; count: number }
type ComplexPrices = { villas?: PriceRange; apartments?: PriceRange }
type CachedAll = {
  enriched: EnrichedRow[]
  manifest: Record<string, string[]>
  prices: Map<string, ComplexPrices>
}
// 10 мин (раньше 60с) — 10x reduction. Module cache живёт ~15 мин на
// инстанс Vercel, поэтому 10 мин ≈ один fetch за процесс. Свежесть
// гарантирует Airtable webhook через revalidatePath (для ISR-страниц);
// для самого module-cache актуальность догоняет за TTL.
const TTL_MS = 600_000
let _cache: { ts: number; data: CachedAll } | null = null
let _inflight: Promise<CachedAll> | null = null

function priceOf(d: Record<string, unknown>): number | null {
  const candidates = [d['price_usd'], d['price'], d['Цена']]
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
    if (typeof v === 'string') {
      const n = Number(v.replace(/\s/g, ''))
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return null
}

// Slim-форма того что buildPriceIndex реально использует от raw_villas /
// raw_apartments: только title + цена. Раньше тащили `data` целиком
// (36+33 МБ за загрузку каталога), теперь — несколько килобайт.
type PriceRow = {
  title: string | null
  ai_name: string | null
  name: string | null
  price: number | null
  price_usd: number | null
  price_rub: number | null
}
function priceOfRow(r: PriceRow): number | null {
  const candidates = [r.price_usd, r.price, r.price_rub]
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
    if (typeof v === 'string') {
      const n = Number((v as string).replace(/\s/g, ''))
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return null
}

// Match villa/apartment titles to complexes by longest-substring match on
// the complex's Project name. Same heuristic the detail pages use.
function buildPriceIndex(complexes: EnrichedRow[], villas: PriceRow[], apts: PriceRow[]): Map<string, ComplexPrices> {
  const projects: { id: string; lower: string; len: number }[] = []
  for (const c of complexes) {
    const name = c.name?.toLowerCase()
    if (!name || name.length < 4) continue
    projects.push({ id: c.id, lower: name, len: name.length })
  }
  // Longest project name first so a villa whose title matches both
  // "Karma" and "Karma Royal Sanur" picks the longer one.
  projects.sort((a, b) => b.len - a.len)

  const byComplex = new Map<string, { villas: number[]; apartments: number[] }>()
  const tally = (id: string, kind: 'villas' | 'apartments', price: number) => {
    let entry = byComplex.get(id)
    if (!entry) { entry = { villas: [], apartments: [] }; byComplex.set(id, entry) }
    entry[kind].push(price)
  }

  for (const v of villas) {
    const price = priceOfRow(v)
    if (price == null) continue
    const title = (v.title ?? v.ai_name ?? v.name ?? '').toLowerCase()
    if (!title) continue
    const match = projects.find(p => title.includes(p.lower))
    if (match) tally(match.id, 'villas', price)
  }
  for (const a of apts) {
    const price = priceOfRow(a)
    if (price == null) continue
    const title = (a.title ?? a.ai_name ?? a.name ?? '').toLowerCase()
    if (!title) continue
    const match = projects.find(p => title.includes(p.lower))
    if (match) tally(match.id, 'apartments', price)
  }

  const out = new Map<string, ComplexPrices>()
  for (const [id, lists] of byComplex.entries()) {
    const item: ComplexPrices = {}
    if (lists.villas.length > 0) {
      item.villas = { from: Math.min(...lists.villas), to: Math.max(...lists.villas), count: lists.villas.length }
    }
    if (lists.apartments.length > 0) {
      item.apartments = { from: Math.min(...lists.apartments), to: Math.max(...lists.apartments), count: lists.apartments.length }
    }
    out.set(id, item)
  }
  return out
}

async function _loadAllInternal(): Promise<CachedAll> {
  // Slim-проекция для buildPriceIndex: вместо `data` целиком (~70 МБ
  // на оба запроса вместе) тянем 6 полей × 1100 строк ≈ ~300 КБ.
  // raw_complexes пока не слимим — enrich использует ~25 полей.
  const slimPriceFields = `
    title:data->"SEO:Title",
    ai_name:data->"ИИ Имя",
    name:data->Name,
    price:data->price,
    price_usd:data->price_usd,
    price_rub:data->"Цена"
  `
  const [rowsRes, manifestRaw, villasRes, aptsRes, enCache] = await Promise.all([
    sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').limit(500),
    loadJson<Record<string, string[]>>(cdnManifestUrl(PHOTO_MANIFEST_URL, 600), {}),
    sb.from('raw_villas').select(slimPriceFields).limit(3000),
    sb.from('raw_apartments').select(slimPriceFields).limit(3000),
    loadEnTranslations('complexes'),
  ])
  const manifest = cdnRewriteManifest(manifestRaw)
  const enriched = ((rowsRes.data ?? []) as Row[])
    .map(r => ({ ...r, data: mergeEnTranslations(r.data, r.airtable_id, enCache) }))
    .map(enrich)
  const prices = buildPriceIndex(
    enriched,
    (villasRes.data ?? []) as PriceRow[],
    (aptsRes.data ?? []) as PriceRow[],
  )
  return { enriched, manifest, prices }
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
  filters: ComplexFilterState,
  prices?: Map<string, ComplexPrices>,
): ComplexCard[] {
  let filtered = enriched.filter(e => passes(e, filters))
  const isSearch = filters.q.trim().length > 0
  if (isSearch) filtered = applySearch(filtered, filters.q)
  const mapped = filtered
    .map(e => toCard(e, manifest, prices))
    .filter((c): c is ComplexCard => c !== null)
  if (isSearch) return mapped
  // Default ordering: TOP-pinned first (Airtable `ТОП` checkbox or
  // `TOP` numeric rank), then alphabetical by name. Within the
  // pinned group, lower `topRank` wins; null ranks tie-break by
  // name, so a checkbox-only pin still sorts deterministically.
  return [...mapped].sort((a, b) => {
    if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
    if (a.isTop && b.isTop) {
      const ra = a.topRank ?? Number.POSITIVE_INFINITY
      const rb = b.topRank ?? Number.POSITIVE_INFINITY
      if (ra !== rb) return ra - rb
    }
    return a.name.localeCompare(b.name, 'ru')
  })
}

export async function loadCatalogPage(
  filters: ComplexFilterState,
  page: number,
  lang: 'ru' | 'en' = 'ru',
): Promise<CatalogPage> {
  const safePage = Math.max(1, Math.floor(page))
  const { enriched, manifest, prices } = await loadAll()
  const options = buildOptions(enriched, filters, lang)
  const all = buildAllCards(enriched, manifest, filters, prices)
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

export function buildHeading(f: ComplexFilterState): string {
  const adj: string[] = []
  if (f.status.length === 1) {
    const s = f.status[0]
    adj.push(s === 'building' ? 'Строящиеся' : s === 'built' ? 'Готовые' : 'Планируемые')
  }
  const noun = adj.length || hasAnyFilter(f) ? 'жилые комплексы' : 'Жилые комплексы'
  let s = adj.length ? adj.join(' ') + ' ' + noun : noun

  if (f.types.length === 1) s += ` (${f.types[0].toLowerCase()})`

  if (f.district.length === 1) s += ` в районе ${f.district[0]}`
  else if (f.district.length > 1) s += ` в районах ${f.district.join(', ')}`
  else s += ' на Бали'

  if (f.developer.length === 1) s += ` от застройщика ${f.developer[0]}`
  if (f.year.length === 1) s += ` со сдачей в ${f.year[0]}`
  if (f.permit.length === 1) s += ` с разрешением ${f.permit[0]}`

  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function buildTitle(f: ComplexFilterState): string {
  return buildHeading(f) + ' | Balinsky'
}

// English-language counterpart of buildHeading. Mirrors the same shape:
// status adjective + noun + (type) + district + developer + year +
// permit. Kept as a parallel function rather than parameterising
// buildHeading so RU pages stay 100% byte-identical to before.
export function buildHeadingEn(f: ComplexFilterState): string {
  const adj: string[] = []
  if (f.status.length === 1) {
    const s = f.status[0]
    adj.push(s === 'building' ? 'Under construction' : s === 'built' ? 'Completed' : 'Planned')
  }
  const noun = adj.length || hasAnyFilter(f) ? 'residential complexes' : 'Residential complexes'
  let s = adj.length ? adj.join(' ') + ' ' + noun : noun

  if (f.types.length === 1) s += ` (${f.types[0].toLowerCase()})`

  if (f.district.length === 1) s += ` in ${f.district[0]}`
  else if (f.district.length > 1) s += ` in ${f.district.join(', ')}`
  else s += ' in Bali'

  if (f.developer.length === 1) s += ` by ${f.developer[0]}`
  if (f.year.length === 1) s += `, completion ${f.year[0]}`
  if (f.permit.length === 1) s += `, permit ${f.permit[0]}`

  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function buildTitleEn(f: ComplexFilterState): string {
  return buildHeadingEn(f) + ' | Balinsky'
}

export function buildDescriptionEn(f: ComplexFilterState, totalCount?: number): string {
  const where =
    f.district.length === 1 ? `in ${f.district[0]}`
    : f.district.length > 1 ? `in ${f.district.join(', ')}`
    : 'in Bali'
  const countPart = typeof totalCount === 'number' && totalCount > 0
    ? `${totalCount} residential complexes` : 'Residential complexes'
  let s = `${countPart} ${where}`
  if (f.types.length === 1) s += `, type: ${f.types[0]}`
  if (f.year.length === 1) s += `, completion ${f.year[0]}`
  return `${s}. Photos, developer pricing, completion dates, permits and contacts.`
}

export function buildMetadataEn(
  f: ComplexFilterState,
  opts: { canonicalPath: string; noIndex: boolean; totalCount?: number },
) {
  const isSectionRoot = opts.canonicalPath === '/en/complexes'
  const singleDistrict = !isSectionRoot
    && f.district.length === 1
    && f.types.length === 0
    && f.status.length === 0
    && f.permit.length === 0
    && f.year.length === 0
    && f.developer.length === 0
    && f.q.trim().length === 0
  const districtSlug = singleDistrict
    ? (DISTRICT_TO_SLUG[f.district[0]] ?? f.district[0].toLowerCase())
    : null
  const districtMeta = districtSlug
    ? getDistrictCommercialMeta(districtSlug, 'en', 'complex', opts.totalCount)
    : null
  const title = districtMeta?.title
    ?? (isSectionRoot && opts.totalCount
      ? `Bali Residential Complexes — ${opts.totalCount} new developments by trusted builders | Balinsky`
      : buildTitleEn(f))
  const description = districtMeta?.description ?? buildDescriptionEn(f, opts.totalCount)
  return {
    title,
    description,
    alternates: isSectionRoot
      ? {
        canonical: opts.canonicalPath,
        languages: {
          ru: '/ru/zhilye-kompleksy',
          en: '/en/complexes',
          'x-default': '/ru/zhilye-kompleksy',
        },
      }
      : { canonical: opts.canonicalPath },
    robots: opts.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description, type: 'website' as const, url: opts.canonicalPath },
    twitter: { card: 'summary_large_image' as const, title, description },
  }
}

// Per-filter unique meta-description so combinatorial pages don't share
// one generic line (Google folds duplicate-meta pages).
export function buildDescription(f: ComplexFilterState, totalCount?: number): string {
  const where =
    f.district.length === 1 ? `в районе ${f.district[0]}`
    : f.district.length > 1 ? `в районах ${f.district.join(', ')}`
    : 'на Бали'
  const countPart = typeof totalCount === 'number' && totalCount > 0
    ? `${totalCount} жилых комплексов` : 'Жилые комплексы'
  let s = `${countPart} ${where}`
  if (f.types.length === 1) s += `, тип: ${f.types[0]}`
  if (f.year.length === 1) s += `, сдача в ${f.year[0]}`
  return `${s}. Фото, цены от застройщика, сроки сдачи, разрешения и контакты.`
}

export function buildMetadata(
  f: ComplexFilterState,
  opts: { canonicalPath: string; noIndex: boolean; totalCount?: number },
) {
  const isSectionRoot = opts.canonicalPath === '/ru/zhilye-kompleksy'
  const singleDistrict = !isSectionRoot
    && f.district.length === 1
    && f.types.length === 0
    && f.status.length === 0
    && f.permit.length === 0
    && f.year.length === 0
    && f.developer.length === 0
    && f.q.trim().length === 0
  const districtSlug = singleDistrict
    ? (DISTRICT_TO_SLUG[f.district[0]] ?? f.district[0].toLowerCase())
    : null
  const districtMeta = districtSlug
    ? getDistrictCommercialMeta(districtSlug, 'ru', 'complex', opts.totalCount)
    : null
  const title = districtMeta?.title
    ?? (isSectionRoot && opts.totalCount
      ? `Жилые комплексы на Бали — ${opts.totalCount} новостроек от застройщиков | Balinsky`
      : buildTitle(f))
  const description = districtMeta?.description ?? buildDescription(f, opts.totalCount)
  return {
    title,
    description,
    alternates: isSectionRoot
      ? {
        canonical: opts.canonicalPath,
        languages: {
          ru: '/ru/zhilye-kompleksy',
          en: '/en/complexes',
          'x-default': '/ru/zhilye-kompleksy',
        },
      }
      : { canonical: opts.canonicalPath },
    robots: opts.noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: { title, description, type: 'website' as const, url: opts.canonicalPath },
    twitter: { card: 'summary_large_image' as const, title, description },
  }
}
