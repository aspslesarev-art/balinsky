import { createClient } from '@supabase/supabase-js'
import { loadNearby } from '../competitors'
import { loadNearbyPlaces, type NearbyPlace } from '../nearby-places'
import { regionFor, type RegionDefaults } from './regions'
import { classifyZone, type BeachZone, zoneTitle } from './zones'
import { matchCompetitors, type MatchMode } from './matching'
import { adrPercentiles, buildScenarios, type ScenarioBundle } from './economics'
import { scoreInfra, type InfraScore } from './infra-score'
import { isDailyRentalRestricted } from '@/lib/land-use'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Row = { airtable_id: string; data: Record<string, unknown> }

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}
function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/\s/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length > 0) return numberOrNull(v[0])
  if (v && typeof v === 'object' && 'value' in v) return numberOrNull((v as { value: unknown }).value)
  return null
}

export type Confidence = 'high' | 'medium' | 'low'

export type InvestmentSnapshot = {
  villaId: string
  generatedAt: string
  villa: {
    title: string
    lat: number
    lng: number
    bedrooms: number | null
    area: number | null
    askingPrice: number | null
    leaseholdYearsLeft: number | null
    hasPool: boolean | null
    district: string | null
    photo: string | null
  }
  region: RegionDefaults
  zone: { applied: BeachZone; raw: BeachZone; title: string; expanded: boolean; nearestBeach: NearbyPlace | null; walkingMeters: number | null }
  mode: MatchMode
  confidence: Confidence
  matchSampleSize: number
  scenarios: ScenarioBundle | null
  references: NearbyMatchCard[] | null
  competitors: NearbyMatchCard[]
  mapCompetitors: MapCompetitor[]
  totalCompetitorsInRadius: number
  infra: InfraScore
  anchors: NearbyPlace[]
  nearbyByCategory: Record<string, NearbyPlace[]>
  flags: { emergingMarket: boolean; weakPerformance: boolean; leaseholdRisk: boolean; isLuxury: boolean; expandedZone: boolean; rentalRestricted: boolean }
}

export type MapCompetitor = {
  id: string
  lat: number
  lng: number
  adr: number
  bedrooms: number | null
  isMatch: boolean
}

export type NearbyMatchCard = {
  id: string
  name: string
  complex: string | null
  url: string | null
  photo: string | null
  rating: number | null
  reviews: number | null
  bedrooms: number | null
  area: number | null
  adr: number
  distanceKm: number
  lat: number
  lng: number
}

function detectPool(d: Record<string, unknown>): boolean | null {
  const explicit = firstString(d['Бассейн']) ?? firstString(d['Pool'])
  if (explicit) {
    if (/нет|no/i.test(explicit)) return false
    if (/[а-яa-z]/i.test(explicit)) return true
  }
  return null
}

export type ListingKind = 'villa' | 'apartment'

export async function buildSnapshot(villaId: string, kind: ListingKind = 'villa'): Promise<InvestmentSnapshot | null> {
  const table = kind === 'apartment' ? 'raw_apartments' : 'raw_villas'
  const { data: rows, error } = await sb.from(table).select('airtable_id, data').eq('airtable_id', villaId).limit(1)
  if (error) { console.error('[investment] db error:', error.message); return null }
  const row = (rows?.[0] as Row | undefined)
  if (!row) return null
  const d = row.data
  if (d?.['Опубликовать'] !== true) return null

  const lat = numberOrNull(d['Geo'])
  const lng = numberOrNull(d['Geo 2'])
  if (lat == null || lng == null) return null

  const title = firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя']) ?? villaId
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  const askingPrice = numberOrNull(d['price'] ?? d['Цена'])
  const leaseholdYearsLeft = numberOrNull(d['Leasehold'] ?? d['Leashold'])
  const hasPool = detectPool(d)
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])

  const region = regionFor(lat, lng)

  // Pull data: 2km competitors + nearby places + baliforum curated places
  const [allInRadius, places, baliforum] = await Promise.all([
    loadNearby(lat, lng, 2),
    loadNearbyPlaces(villaId),
    loadBaliforumNearby(lat, lng, 1.5),
  ])
  const beaches = places?.byCategory.beach ?? []
  const zoneInfo = classifyZone(beaches)
  const matchResult = matchCompetitors(allInRadius, { lat, lng, bedrooms, area, hasPool }, beaches)

  // EMERGING_MARKET proxy: <30 listings within 1km radius
  const within1km = allInRadius.filter(c => c.distanceKm <= 1).length
  const emergingMarket = within1km < 30

  // Residential (yellow) land — daily/short-term tourist rental is illegal,
  // so a daily-rental yield calculator is misleading. Skip the scenarios and
  // the rental references; the widget shows an explanatory note instead.
  const rentalRestricted = isDailyRentalRestricted(firstString(d['Land color']))

  let scenarios: ScenarioBundle | null = null
  let references: NearbyMatchCard[] | null = null
  if (rentalRestricted) {
    // leave scenarios + references null
  } else if (matchResult.mode === 'references') {
    references = matchResult.matches.slice(0, 5).map(toCard)
  } else {
    const pcts = adrPercentiles(matchResult.matches)
    scenarios = buildScenarios(
      pcts,
      { area, askingPrice, leaseholdYearsLeft, region },
      region.occupancyByScenario,
    )
  }

  const confidence: Confidence = matchResult.mode === 'standard' ? 'high' : matchResult.mode === 'reduced' ? 'medium' : 'low'
  const weakPerformance = scenarios != null && scenarios.bad.capRate != null && scenarios.bad.capRate < region.capRateThresholdWeak
  const leaseholdRisk = scenarios != null && (scenarios.bad.leaseholdRisk || scenarios.median.leaseholdRisk)

  const competitors = matchResult.matches.slice(0, 50).map(toCard)
  const matchIds = new Set(matchResult.matches.map(m => m.id))
  // Группируем все объекты в радиусе по координатам, чтобы не плодить маркеры на одной точке
  const groupedMap = new Map<string, { lat: number; lng: number; adrs: number[]; beds: number[]; ids: string[]; matchAny: boolean }>()
  for (const c of allInRadius) {
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`
    const g = groupedMap.get(key) ?? { lat: c.lat, lng: c.lng, adrs: [], beds: [], ids: [], matchAny: false }
    g.adrs.push(c.price)
    if (c.bedrooms != null) g.beds.push(c.bedrooms)
    g.ids.push(c.id)
    if (matchIds.has(c.id)) g.matchAny = true
    groupedMap.set(key, g)
  }
  const mapCompetitors: MapCompetitor[] = [...groupedMap.values()].map(g => ({
    id: g.ids[0],
    lat: g.lat,
    lng: g.lng,
    adr: Math.round(g.adrs.reduce((s, v) => s + v, 0) / g.adrs.length),
    bedrooms: g.beds.length ? Math.round(g.beds.reduce((s, v) => s + v, 0) / g.beds.length) : null,
    isMatch: g.matchAny,
  })).slice(0, 250)
  // Merge baliforum curated places into byCategory under their mapped category
  // keys before scoring. They appear with the same NearbyPlace shape so the
  // existing anchor selectors pick them up without further glue.
  const byCategoryEnriched = mergeBaliforumIntoCategories(places?.byCategory ?? {}, baliforum)
  const infra = places || baliforum.length
    ? scoreInfra(byCategoryEnriched)
    : { metrics: { premiumRestaurants: 0, beachClubs: 0, topCafes: 0, fitness: 0, nightclubs: 0, avgRating: null, reviewDensity: 0, totalAnchors: 0 }, composite: 0, anchors: [] }

  // Photo from corresponding photos manifest (best-effort)
  const photo = await firstPhoto(villaId, kind)

  return {
    villaId,
    generatedAt: new Date().toISOString(),
    villa: { title, lat, lng, bedrooms, area, askingPrice, leaseholdYearsLeft, hasPool, district, photo },
    region,
    zone: {
      applied: matchResult.appliedZone,
      raw: matchResult.rawZone,
      title: zoneTitle(matchResult.appliedZone),
      expanded: matchResult.expanded,
      nearestBeach: zoneInfo.nearestBeach,
      walkingMeters: zoneInfo.walkingMeters,
    },
    mode: matchResult.mode,
    confidence,
    matchSampleSize: matchResult.matches.length,
    scenarios,
    references,
    competitors,
    mapCompetitors,
    totalCompetitorsInRadius: allInRadius.length,
    infra,
    anchors: infra.anchors,
    nearbyByCategory: byCategoryEnriched,
    flags: {
      emergingMarket,
      weakPerformance,
      leaseholdRisk,
      isLuxury: matchResult.isLuxury,
      expandedZone: matchResult.expanded,
      rentalRestricted,
    },
  }
}

// Baliforum-curated places are stored in public.baliforum_places (see migration
// 036). The list is hand-picked by Russian-speaking community moderators, so
// it doubles as a third-party "is this address actually nice?" signal alongside
// Google rating counts. We pull a small bounding-box slice per snapshot and
// merge into the existing category map so the anchor selector reuses them.
type BaliforumRow = {
  slug: string
  name: string | null
  category: string | null
  lat: number
  lng: number
  rating: number | null
  reviews: number | null
  google_place_id: string | null
  address: string | null
  url: string | null
  photo: string | null
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function loadBaliforumNearby(lat: number, lng: number, radiusKm: number): Promise<NearbyPlace[]> {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  const { data, error } = await sb
    .from('baliforum_places')
    .select('slug,name,category,lat,lng,rating,reviews,google_place_id,address,url,photo')
    .gte('lat', lat - dLat).lte('lat', lat + dLat)
    .gte('lng', lng - dLng).lte('lng', lng + dLng)
    .limit(200)
  if (error) {
    // Don't blow the snapshot if the table is missing/empty — fall through
    // to the Google-only path. Errors in this path are non-fatal.
    return []
  }
  const out: NearbyPlace[] = []
  for (const r of (data ?? []) as BaliforumRow[]) {
    const d = distanceKm(lat, lng, r.lat, r.lng)
    if (d > radiusKm) continue
    out.push({
      id: r.google_place_id ?? `baliforum:${r.slug}`,
      name: r.name,
      rating: r.rating,
      reviews: r.reviews,
      primaryType: r.category,
      types: r.category ? [r.category, 'baliforum'] : ['baliforum'],
      priceLevel: null,
      address: r.address,
      mapsUrl: r.url,
      lat: r.lat,
      lng: r.lng,
      distanceKm: d,
    })
  }
  return out
}

function mergeBaliforumIntoCategories(
  byCategory: Record<string, NearbyPlace[]>,
  baliforum: NearbyPlace[],
): Record<string, NearbyPlace[]> {
  if (baliforum.length === 0) return byCategory
  const out: Record<string, NearbyPlace[]> = { ...byCategory }
  for (const p of baliforum) {
    const cat = p.primaryType || 'baliforum'
    const existing = out[cat] ?? []
    // Dedupe by Google place_id when both Google sync and Baliforum found
    // the same spot — keep whichever entry was already there (Google's data
    // tends to have more accurate review counts).
    if (existing.some(e => e.id === p.id)) continue
    out[cat] = [...existing, p]
  }
  return out
}

function toCard(m: import('../competitor-utils').CompetitorWithDistance): NearbyMatchCard {
  return {
    id: m.id,
    name: m.name,
    complex: m.complex,
    url: m.url,
    photo: m.photo,
    rating: m.rating,
    reviews: m.reviews,
    bedrooms: m.bedrooms,
    area: m.area,
    adr: m.price,
    distanceKm: m.distanceKm,
    lat: m.lat,
    lng: m.lng,
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URLS: Record<ListingKind, string> = {
  villa: `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`,
  apartment: `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`,
}
const _photoCache: Partial<Record<ListingKind, { ts: number; data: Record<string, string[]> }>> = {}
async function firstPhoto(villaId: string, kind: ListingKind): Promise<string | null> {
  const cached = _photoCache[kind]
  if (!cached || Date.now() - cached.ts > 60 * 60 * 1000) {
    try {
      const r = await fetch(PHOTO_MANIFEST_URLS[kind], { next: { revalidate: 1800 } })
      if (r.ok) _photoCache[kind] = { ts: Date.now(), data: await r.json() }
    } catch { /* ignore */ }
  }
  return _photoCache[kind]?.data[villaId]?.[0] ?? null
}
