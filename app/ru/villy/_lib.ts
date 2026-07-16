import { createClient } from '@supabase/supabase-js'
import Fuse from 'fuse.js'
import type { Option } from '@/components/filters/MultiSelectFilter'
import { translit, hasCyrillic } from '@/lib/translit'
import { loadVillaStyles } from '@/lib/villa-styles'
import { loadFeatureFlagsMap, FEATURE_FLAGS, FEATURE_LABELS } from '@/lib/listing-features'
import { normalizeSlug } from '@/lib/slug-normalize'
import { loadAllTranslations, mergeAllTranslations } from '@/lib/en-translations'
import { getDistrictCommercialMeta } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { facetLabel, type FilterDim } from '@/lib/filter-i18n'
import { isTopBlacklisted } from '@/lib/top-blacklist'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { loadViewCounts, smartSort } from '@/lib/catalog-rank'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { cdnRewriteManifest } from '@/lib/photo-cdn'
import { pickCopy, type Lang } from '@/lib/i18n'

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
  // Vision-derived feature flags (pool, infinity_pool, ocean_view, …).
  features: string[]
  // 'invest' = land color is anything but Yellow (Pink/Tourism/C1/Orange/etc.) —
  // only zones where short-term tourist rental is legal.
  // 'live'   = land color is Yellow (residential) plus a minimum livable area.
  goal: 'invest' | 'live' | null
  // 'primary' = sold by the developer (default).
  // 'resale' / 'secondary' = sold by an owner / agent.
  // Stored as string[] so VillaMultiSelect's StringArrayKey constraint
  // accepts it; values are validated in passes().
  dealType: string[]
}

export type VillaFilterOptions = {
  district: Option[]
  bedrooms: Option[]
  status: Option[]
  permit: Option[]
  year: Option[]
  developer: Option[]
  style: Option[]
  features: Option[]
  dealType: Option[]
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
  dealType: 'resale' | 'secondary' | null
  developerName: string | null
  developerCompletedCount: number | null
  developerInProgressCount: number | null
  pricePerSqmUsd: number | null
  pricePerSqmYearUsd: number | null
  leaseYears: number | null
  permit: string | null
  completionYear: string | null
  claimedYieldPct: number | null
  bestCapRate: number | null
  interiorStyle: string | null
  airtableId: string | null
  // Editorial pin — surfaced at the top of the catalog regardless of
  // sort. Sourced from the Airtable "TOP" checkbox in raw_villas.
  isTop: boolean
  // Yellow (residential) land — daily rental is illegal, so it's not an
  // investment object. In the default investment-ranked order these are
  // demoted below every investable villa (they're still reachable via the
  // "goal=live" filter and on later pages).
  rentalRestricted: boolean
  // Page-view tally (last ~4 months) — a signal in the smart default sort.
  views?: number
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
  features: [],
  goal: null,
  dealType: [],
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
    features: asArray(sp.features).filter(v => (FEATURE_FLAGS as readonly string[]).includes(v)),
    goal: sp.goal === 'invest' || sp.goal === 'live' ? sp.goal : null,
    dealType: asArray(sp.deal).filter(v => v === 'primary' || v === 'resale' || v === 'secondary'),
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
    f.features.length > 0 ||
    f.goal != null ||
    f.dealType.length > 0
  )
}

// Maps the free-form "Тип сделки" Airtable string to our normalised
// enum. "Перепродажа" / "Resale" / "Перепродать" → resale.
// "Вторичка" / "Secondary" → secondary. Anything else (or empty) → primary.
type DealType = 'primary' | 'resale' | 'secondary'
function dealFromString(s: string | null): DealType {
  if (!s) return 'primary'
  const lower = s.toLowerCase()
  if (/перепрод|resale/.test(lower)) return 'resale'
  if (/вторич|secondary/.test(lower)) return 'secondary'
  return 'primary'
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
  features: string[]
  landBucket: LandBucket
  dealType: DealType
  // Editorial pin — the "TOP" checkbox in Airtable. Pinned listings
  // bubble to the top of the catalog regardless of the active sort,
  // so promoted developers / hand-picked listings appear first.
  isTop: boolean
  views?: number
}

export type StylesMap = Record<string, { style: string | null }>

export function enrich(r: Row, styles: StylesMap = {}, featuresMap: Record<string, string[]> = {}): EnrichedRow {
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
    features: featuresMap[r.airtable_id] ?? [],
    landBucket: landBucket(firstString(d['Land color'])),
    dealType: dealFromString(firstString(d['Тип сделки'])),
    // TOP flag respects an explicit developer blacklist — historically Bali
    // Baza objects had TOP=true in Airtable but they should no longer surface
    // in any top section. See lib/top-blacklist.ts.
    isTop: d['TOP'] === true && !isTopBlacklisted(
      firstString(d['Developer1']),
      firstString(d['Developer']),
      firstString(d['SEO:Title']),
      firstString(d['ИИ Имя']),
    ),
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
  if (f.features.length > 0 && !f.features.every(fl => e.features.includes(fl))) return false
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
  if (f.dealType.length > 0 && !f.dealType.includes(e.dealType)) return false
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
      // Airtable ID — lets agents paste a code from a saved PDF
      // ("rec…") into the catalog search and land on the listing.
      r.id,
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

// Translation map RU value → EN value sourced from `<col> EN` columns.
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
  current: VillaFilterState,
  lang: Lang = 'ru',
): VillaFilterOptions {
  // Per-filter EN translation maps. Add `<RU column> EN` columns in
  // Airtable to translate filter labels — until then EN catalogues
  // render the literal column name as a placeholder.
  const enMap = lang !== 'ru' ? {
    district:  buildLabelMap(allRows, 'Location 2', 'Location 2 EN'),
    bedrooms:  new Map<string, string>(), // numbers, no translation
    status:    buildLabelMap(allRows, 'Статус', 'Статус EN'),
    permit:    buildLabelMap(allRows, 'Разрешение', 'Разрешение EN'),
    developer: new Map<string, string>(), // brand names — keep as-is
    style:     buildLabelMap(allRows, 'Стиль интерьера', 'Стиль интерьера EN'),
  } : null
  const DIM_TO_FILTER: Partial<Record<string, FilterDim>> = {
    status: 'status', permit: 'permit', style: 'style',
  }
  function tr(dim: 'district' | 'status' | 'permit' | 'developer' | 'style' | 'bedrooms', value: string, _ruCol: string): string {
    if (!enMap) return value
    if (dim === 'developer' || dim === 'bedrooms') return value
    const en = enMap[dim].get(value)
    if (en) return en
    const filterDim = DIM_TO_FILTER[dim]
    return filterDim ? facetLabel(filterDim, value, lang) : value
  }

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

  const districtRaw  = build('district', e => e.district)
  const bedrooms     = build('bedrooms', e => e.bedrooms, 'value')
  const year         = build('year', e => e.year, 'value')
  const permitRaw    = build('permit', e => e.permit)
  const developer    = build('developer', e => e.developerName) // brand names
  const styleRaw     = build('style', e => e.style)
  const statusCounts = countsExcludingDim('status', e => e.status)
  const statusRaw: Option[] = []
  for (const [name, key] of Object.entries(STATUS_TO_URL)) {
    const c = statusCounts.get(name) ?? 0
    if (c > 0) statusRaw.push({ value: key, label: name, count: c })
  }

  // Deal type — counts derived directly so the chip shows
  // "Перепродажа · 12" etc.
  const dealCounts = countsExcludingDim('dealType', e => e.dealType)
  const DEAL_LABELS: Record<Lang, Record<string, string>> = {
    ru: { primary: 'От застройщика', resale: 'Перепродажа', secondary: 'Вторичка' },
    en: { primary: 'From developer', resale: 'Resale',      secondary: 'Secondary' },
    id: { primary: 'Dari pengembang', resale: 'Jual kembali', secondary: 'Sekunder' },
    fr: { primary: 'Du promoteur',   resale: 'Revente',     secondary: 'Seconde main' },
  }
  const dealType: Option[] = (['primary', 'resale', 'secondary'] as const)
    .map(v => ({ value: v, label: pickCopy(DEAL_LABELS, lang)[v], count: dealCounts.get(v) ?? 0 }))
    .filter(o => o.count > 0)

  // Vision feature flags — fixed vocabulary, localized labels, count > 0 only.
  const featureCounts = countsExcludingDim('features', e => e.features)
  const features: Option[] = FEATURE_FLAGS
    .map(fl => ({ value: fl, label: pickCopy(FEATURE_LABELS[fl], lang), count: featureCounts.get(fl) ?? 0 }))
    .filter(o => o.count > 0)

  // Apply EN-translation pass — `value` keeps its original (URL slug or
  // RU value) so existing URLs and filter matching keep working; only
  // visible labels change for EN catalogues.
  const district = districtRaw.map(o => ({ ...o, label: tr('district', o.label, 'Location 2') }))
  const permit   = permitRaw  .map(o => ({ ...o, label: tr('permit',   o.label, 'Разрешение') }))
  const style    = styleRaw   .map(o => ({ ...o, label: tr('style',    o.label, 'Стиль интерьера') }))
  const status   = statusRaw  .map(o => ({ ...o, label: tr('status',   o.label, 'Статус') }))

  return { district, bedrooms, status, permit, year, developer, style, features, dealType }
}

// === card mapping ===

export function toCard(
  e: EnrichedRow,
  manifest: Record<string, string[]>,
  devStats?: Map<string, { ready: number; total: number }>,
  lang: Lang = 'ru',
): VillaCard | null {
  const d = e.data
  // Canonicalise the Airtable slug at the catalog level so internal
  // links emit the clean URL (no GSC churn from dirty slugs).
  const slug = normalizeSlug(firstString(d['SEO:Slug']))
  if (!slug || slug.startsWith('-')) return null
  // Title lookup is lang-aware. For EN we prefer the `<field> EN` slots
  // (either Airtable's own EN column or the Azure translation cache
  // already merged into data via mergeEnTranslations). Without the EN
  // branch, /en/villas would surface «Вилла Origins в Nyanyi» on cards
  // while the RU detail page renders the same listing as English.
  const titleRaw = lang === 'ru'
    ? (cleanTitle(firstString(d['SEO:Title'])) ??
       firstString(d['ИИ Имя']) ??
       firstString(d['Имя ENG']) ??
       firstString(d['Name']))
    : (cleanTitle(firstString(d['SEO:Title EN'])) ??
       firstString(d['ИИ Имя EN']) ??
       firstString(d['Имя ENG']) ??
       cleanTitle(firstString(d['SEO:Title'])) ??
       firstString(d['ИИ Имя']) ??
       firstString(d['Name']))
  if (!titleRaw) return null
  // Optional investor-relevant fields piped into the wishlist snapshot
  // at heart-tap. Read directly off the raw row — the catalog already
  // has them in scope, no extra fetch.
  const priceM2     = numberOrNull(d['Цена м²'])
  const priceM2Year = numberOrNull(d['Цена м² в год'])
  const leaseRaw    = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const leaseYears  = leaseRaw ? Number(leaseRaw) || null : null
  const permitRaw   = firstString(d['Разрешение'])
  const permit      = permitRaw && permitRaw.toLowerCase() !== 'нет' ? permitRaw : null
  const yieldRaw    = numberOrNull(d['Заявленная доходность'])
  const claimedYieldPct = yieldRaw != null ? Math.round(yieldRaw * 1000) / 10 : null

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
    dealType: e.dealType === 'primary' ? null : e.dealType,
    developerName: e.developerName,
    developerCompletedCount: (() => {
      if (!devStats || !e.developerName) return null
      const s = devStats.get(e.developerName.trim())
      return s ? s.ready : null
    })(),
    developerInProgressCount: (() => {
      if (!devStats || !e.developerName) return null
      const s = devStats.get(e.developerName.trim())
      return s ? Math.max(0, s.total - s.ready) : null
    })(),
    pricePerSqmUsd: priceM2,
    pricePerSqmYearUsd: priceM2Year,
    leaseYears,
    permit,
    completionYear: e.year,
    claimedYieldPct,
    bestCapRate: null,
    interiorStyle: e.style,
    airtableId: e.id,
    isTop: e.isTop,
    rentalRestricted: e.landBucket === 'residential',
    views: e.views ?? 0,
  }
}

// === data load ===

// Module-level cache. unstable_cache can't hold villa data — exceeds the 2MB
// per-cache-item limit and silently fails (catalog renders empty).
// TTL: 10 минут. Раньше было 60с, что приводило к перерасходу Supabase
// egress (~36МБ raw_villas × ~каждую минуту на каждом warm instance).
// Vercel function instance живёт ~15 мин, так что 10 мин ≈ ~1 fetch
// за всё время жизни процесса. Свежесть данных гарантирует Airtable
// webhook — он зовёт revalidatePath для каталогов, но module-cache он
// не очищает, поэтому до 10 мин юзер видит stale цены/статусы. Для
// прайса вилл это приемлемо.
type CachedAll = { enriched: EnrichedRow[]; manifest: Record<string, string[]> }
const TTL_MS = 600_000
let _cache: { ts: number; data: CachedAll } | null = null
let _inflight: Promise<CachedAll> | null = null

// Slim JSONB projection. Pulling full `data` from raw_villas was 568 rows ×
// ~51 KB ≈ 29 MB per warm-instance refresh — biggest single egress source
// after the competitors manifest. enrich() touches only ~30 named keys so
// we hand them back as `data` and the rest of the loader code is unchanged.
const SLIM_VILLA_FIELDS = [
  ['Опубликовать', 'pub'],
  ['SEO:Title', 'seo_title'],
  ['SEO:Title EN', 'seo_title_en'],
  ['SEO:Slug', 'seo_slug'],
  ['ИИ Имя', 'ai_name'],
  ['ИИ Имя EN', 'ai_name_en'],
  ['Имя ENG', 'imya_eng'],
  ['Name', 'name'],
  ['Notes', 'notes'],
  ['Year of completion', 'year'],
  ['Location', 'loc'],
  ['Location 2', 'loc2'],
  ['Комнаты', 'rooms'],
  ['Статус', 'status'],
  ['Разрешение', 'permit'],
  ['Тип сделки', 'deal'],
  ['TOP', 'top'],
  ['Developer', 'dev'],
  ['Developer1', 'dev1'],
  ['price', 'price'],
  ['Цена', 'price_rub'],
  ['Площадь', 'area'],
  ['Земля', 'land'],
  ['Geo', 'geo'],
  ['Geo 2', 'geo2'],
  ['Land color', 'land_color'],
  ['Leasehold', 'leasehold'],
  ['Leashold', 'leashold'],
  ['Цена м²', 'price_m2'],
  ['Цена м² в год', 'price_m2_y'],
  ['Заявленная доходность', 'yield_decl'],
] as const

const VILLA_SELECT = ['airtable_id', ...SLIM_VILLA_FIELDS.map(([k, a]) => `${a}:data->"${k}"`)].join(',')

function reassembleVilla(raw: Record<string, unknown>): Row {
  const data: Record<string, unknown> = {}
  for (const [k, a] of SLIM_VILLA_FIELDS) data[k] = raw[a]
  return { airtable_id: raw.airtable_id as string, data }
}

async function _loadAllInternal(): Promise<CachedAll> {
  const [rowsRes, manifestRaw, styles, enCache, viewCounts, featuresMap] = await Promise.all([
    sb.from('raw_villas').select(VILLA_SELECT).limit(1000),
    loadJson<Record<string, string[]>>(cdnManifestUrl(PHOTO_MANIFEST_URL, 600), {}),
    loadVillaStyles(),
    loadAllTranslations('villas'),
    loadViewCounts('villa'),
    loadFeatureFlagsMap('villa'),
  ])
  // Rewrite manifest URLs to the Bunny/Cloudflare CDN host at runtime so we
  // don't have to wait for the next sync-heavy to re-emit URLs.
  const manifest = cdnRewriteManifest(manifestRaw)
  const rows = ((rowsRes.data ?? []) as unknown as Record<string, unknown>[]).map(reassembleVilla)
  const enriched = rows
    .filter(r => r.data?.['Опубликовать'] === true)
    .filter(r => !isHiddenDeveloper(firstString(r.data['Developer1']), firstString(r.data['Developer'])))
    .map(r => ({ ...r, data: mergeAllTranslations(r.data, r.airtable_id, enCache) }))
    .map(r => enrich(r, styles, featuresMap))
    .map(e => ({ ...e, views: viewCounts[e.id] ?? 0 }))
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
  scores?: Map<string, { composite: number; goodCapRate: number | null; rentalRestricted?: boolean }>,
  sort: SortOrder = 'investment-desc',
  devStats?: Map<string, { ready: number; total: number }>,
  lang: Lang = 'ru',
): VillaCard[] {
  let filtered = enriched.filter(e => passes(e, filters))
  const isSearch = filters.q.trim().length > 0
  if (isSearch) filtered = applySearch(filtered, filters.q)
  const mapped = filtered.map(e => toCard(e, manifest, devStats, lang)).filter((c): c is VillaCard => c !== null)
  if (scores) for (const c of mapped) {
    const s = scores.get(c.id)
    // Yellow (residential) land can't be daily-rented, so it gets no
    // daily-rental investment score — leave it out of the yield-ranked
    // ordering (smartSort treats null as a neutral mid score) and don't
    // pipe a meaningless cap rate into the comparison snapshot.
    c.investmentScore = s && !s.rentalRestricted ? s.composite : null
    c.bestCapRate = s?.goodCapRate ?? null
  }
  let sorted: VillaCard[]
  if (isSearch) sorted = mapped
  else if (sort === 'investment-desc') sorted = smartSort(mapped, c => ({ id: c.id, investmentScore: c.investmentScore, views: c.views, hasPhoto: c.photos.length > 0 }))
  else sorted = [...mapped].sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0))
  // Yellow-land demotion: in the default investment-ranked order, residential
  // (yellow) land can't be daily-rented, so it's not an investment object —
  // push every such villa below all investable ones. Nulling its score only
  // made it neutral, so a popular yellow villa still floated into the TOP
  // (Cassandra 4 was #1). A stable tier sort keeps the smart order within
  // each tier. Only for investment-desc — when the user explicitly sorts by
  // price, yellow listings stay in their price position.
  if (!isSearch && sort === 'investment-desc') {
    sorted = [...sorted].sort((a, b) => (a.rentalRestricted ? 1 : 0) - (b.rentalRestricted ? 1 : 0))
  }
  // Editorial pin pass: TOP-flagged listings bubble to the top of
  // the catalog regardless of the active sort. Stable within both
  // groups (pinned/unpinned), so the existing sort order is
  // preserved as the secondary key. Skipped during search — a
  // search hit shouldn't be pushed past unrelated pinned listings.
  if (!isSearch) {
    sorted = [...sorted].sort((a, b) => (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0))
  }
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
  lang: Lang = 'ru',
  sort: SortOrder = 'investment-desc',
): Promise<CatalogPage> {
  const safePage = Math.max(1, Math.floor(page))
  const { enriched, manifest } = await loadAll()
  const options = buildOptions(enriched, filters, lang)
  // Always load scores — even when sorting by price we still want
  // bestCapRate piped into the wishlist snapshot so a heart-tap from
  // the catalog carries the projected ROI to the comparison view.
  const [scores, devStats] = await Promise.all([
    (await import('@/lib/investment/batch-scores')).loadAllVillaScores().catch(() => undefined),
    (await import('@/lib/developer-stats')).loadAllDeveloperStats().catch(() => undefined),
  ])
  const all = buildAllCards(enriched, manifest, filters, scores, sort, devStats, lang)
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

// English mirrors of the heading / title / description / metadata
// builders above. Kept as parallel functions rather than parameterising
// the RU ones so the RU pages stay byte-identical.
export function buildHeadingEn(f: VillaFilterState): string {
  const adj: string[] = []
  if (f.status.length === 1) {
    const s = f.status[0]
    adj.push(s === 'building' ? 'Under construction' : s === 'built' ? 'Completed' : 'Planned')
  }
  if (f.bedrooms.length > 0) {
    const sorted = [...f.bedrooms].sort()
    adj.push(`${sorted.join('-, ')}-bedroom`)
  }
  const noun = adj.length || hasAnyFilter(f) ? 'villas and houses' : 'Villas and houses'
  let s = adj.length ? adj.join(' ') + ' ' + noun : noun

  if (f.district.length === 1) s += ` in ${f.district[0]}`
  else if (f.district.length > 1) s += ` in ${f.district.join(', ')}`
  else s += ' in Bali'

  if (f.developer.length === 1) s += ` by ${f.developer[0]}`
  if (f.style.length === 1) s += ` in ${f.style[0]} style`
  else if (f.style.length > 1) s += ` in ${f.style.join(', ')} style`
  if (f.priceMin != null && f.priceMax != null) s += `, $${Math.round(f.priceMin).toLocaleString('en-US')} – $${Math.round(f.priceMax).toLocaleString('en-US')}`
  else if (f.priceMax != null) s += `, up to $${Math.round(f.priceMax).toLocaleString('en-US')}`
  else if (f.priceMin != null) s += `, from $${Math.round(f.priceMin).toLocaleString('en-US')}`
  if (f.permit.length === 1) s += `, permit ${f.permit[0]}`
  if (f.year.length === 1) s += `, completion ${f.year[0]}`

  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function buildTitleEn(f: VillaFilterState): string { return buildHeadingEn(f) + ' | Balinsky' }
export function buildDescriptionEn(f: VillaFilterState, totalCount?: number): string {
  const noun = f.bedrooms.length === 1 ? `${f.bedrooms[0]}-bedroom villas and houses` : 'villas and houses'
  const where =
    f.district.length === 1 ? `in ${f.district[0]}`
    : f.district.length > 1 ? `in ${f.district.join(', ')}`
    : 'in Bali'
  const countPart = typeof totalCount === 'number' && totalCount > 0
    ? `${totalCount} ${noun}` : noun.charAt(0).toUpperCase() + noun.slice(1)
  let s = `${countPart} ${where}`
  if (f.style.length === 1) s += `, ${f.style[0]} style`
  if (f.status.length === 1) {
    const lbl = f.status[0] === 'building' ? 'under construction'
      : f.status[0] === 'built' ? 'completed' : 'planned'
    s += `, ${lbl}`
  }
  if (f.priceMin != null && f.priceMax != null) s += `, prices $${Math.round(f.priceMin).toLocaleString('en-US')}–$${Math.round(f.priceMax).toLocaleString('en-US')}`
  else if (f.priceMax != null) s += `, up to $${Math.round(f.priceMax).toLocaleString('en-US')}`
  else if (f.priceMin != null) s += `, from $${Math.round(f.priceMin).toLocaleString('en-US')}`
  return `${s}. Photos, current prices, permits, developer contacts.`
}
export function buildMetadataEn(
  f: VillaFilterState,
  opts: { canonicalPath: string; noIndex: boolean; totalCount?: number },
) {
  const isSectionRoot = opts.canonicalPath === '/en/villas'
  const singleDistrict = !isSectionRoot
    && f.district.length === 1
    && f.bedrooms.length === 0
    && f.status.length === 0
    && f.style.length === 0
    && f.permit.length === 0
    && f.year.length === 0
    && f.developer.length === 0
    && f.priceMin == null && f.priceMax == null
    && f.q.trim().length === 0
  const districtSlug = singleDistrict
    ? (DISTRICT_TO_SLUG[f.district[0]] ?? f.district[0].toLowerCase())
    : null
  const districtMeta = districtSlug
    ? getDistrictCommercialMeta(districtSlug, 'en', 'villa', opts.totalCount)
    : null
  const title = districtMeta?.title
    ?? (isSectionRoot && opts.totalCount
      ? `Bali Villas for Sale — ${opts.totalCount} houses with prices, photos & yields | Balinsky`
      : buildTitleEn(f))
  const description = districtMeta?.description ?? buildDescriptionEn(f, opts.totalCount)
  return {
    title, description,
    alternates: isSectionRoot
      ? {
        canonical: opts.canonicalPath,
        languages: {
          ru: '/ru/villy',
          en: '/en/villas',
          'x-default': '/ru/villy',
        },
      }
      : { canonical: opts.canonicalPath },
    robots: opts.noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description, type: 'website' as const, url: opts.canonicalPath },
    twitter: { card: 'summary_large_image' as const, title, description },
  }
}

// Build a unique meta-description per filter combination so 5–15K filter
// pages don't share one generic line (Google folds duplicate-meta pages).
// Mentions count when known, district, bedrooms, style, price range —
// every input narrows the line further.
export function buildDescription(f: VillaFilterState, totalCount?: number): string {
  // Genitive form for «N вилл и домов» (uses N), nominative for the
  // no-count fallback («Виллы и дома») — capitalising the genitive
  // produced grammatically broken «Вилл и домов» on hub pages.
  const nounGen =
    f.bedrooms.length === 1 ? `${f.bedrooms[0]}-комнатных вилл и домов`
    : 'вилл и домов'
  const nounNom =
    f.bedrooms.length === 1 ? `${f.bedrooms[0]}-комнатные виллы и дома`
    : 'Виллы и дома'
  const where =
    f.district.length === 1 ? `в районе ${f.district[0]}`
    : f.district.length > 1 ? `в районах ${f.district.join(', ')}`
    : 'на Бали'
  const countPart = typeof totalCount === 'number' && totalCount > 0
    ? `${totalCount} ${nounGen}` : nounNom
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
  const isSectionRoot = opts.canonicalPath === '/ru/villy'
  // Single-district hub (e.g. /ru/villy/canggu) → commercial pattern with
  // RU district name, count, price-from, yield, leasehold/freehold —
  // pulled from the editorial district copy in lib/districts.
  const singleDistrict = !isSectionRoot
    && f.district.length === 1
    && f.bedrooms.length === 0
    && f.status.length === 0
    && f.style.length === 0
    && f.permit.length === 0
    && f.year.length === 0
    && f.developer.length === 0
    && f.priceMin == null && f.priceMax == null
    && f.q.trim().length === 0
  const districtSlug = singleDistrict
    ? (DISTRICT_TO_SLUG[f.district[0]] ?? f.district[0].toLowerCase())
    : null
  const districtMeta = districtSlug
    ? getDistrictCommercialMeta(districtSlug, 'ru', 'villa', opts.totalCount)
    : null
  const title = districtMeta?.title
    ?? (isSectionRoot && opts.totalCount
      ? `Купить виллу на Бали — ${opts.totalCount} вилл и домов с фото и ценами | Balinsky`
      : buildTitle(f))
  const description = districtMeta?.description ?? buildDescription(f, opts.totalCount)
  return {
    title,
    description,
    alternates: isSectionRoot
      ? {
        canonical: opts.canonicalPath,
        languages: {
          ru: '/ru/villy',
          en: '/en/villas',
          'x-default': '/ru/villy',
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
