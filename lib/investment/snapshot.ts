import { createClient } from '@supabase/supabase-js'
import { loadNearby } from '../competitors'
import { loadNearbyPlaces, type NearbyPlace } from '../nearby-places'
import { regionFor, type RegionDefaults } from './regions'
import { classifyZone, type BeachZone, zoneTitle } from './zones'
import { matchCompetitors, type MatchMode } from './matching'
import { adrPercentiles, buildScenarios, type ScenarioBundle } from './economics'
import { scoreInfra, type InfraScore } from './infra-score'

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
  flags: { emergingMarket: boolean; weakPerformance: boolean; leaseholdRisk: boolean; isLuxury: boolean; expandedZone: boolean }
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

export async function buildSnapshot(villaId: string): Promise<InvestmentSnapshot | null> {
  const { data: rows, error } = await sb.from('raw_villas').select('airtable_id, data').eq('airtable_id', villaId).limit(1)
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

  // Pull data: 2km competitors + nearby places
  const [allInRadius, places] = await Promise.all([
    loadNearby(lat, lng, 2),
    loadNearbyPlaces(villaId),
  ])
  const beaches = places?.byCategory.beach ?? []
  const zoneInfo = classifyZone(beaches)
  const matchResult = matchCompetitors(allInRadius, { lat, lng, bedrooms, area, hasPool }, beaches)

  // EMERGING_MARKET proxy: <30 listings within 1km radius
  const within1km = allInRadius.filter(c => c.distanceKm <= 1).length
  const emergingMarket = within1km < 30

  let scenarios: ScenarioBundle | null = null
  let references: NearbyMatchCard[] | null = null
  if (matchResult.mode === 'references') {
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
  const infra = places ? scoreInfra(places.byCategory) : { metrics: { premiumRestaurants: 0, beachClubs: 0, topCafes: 0, fitness: 0, nightclubs: 0, avgRating: null, reviewDensity: 0, totalAnchors: 0 }, composite: 0, anchors: [] }

  // Photo from villa-photos manifest (best-effort)
  const photo = await firstPhoto(villaId)

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
    nearbyByCategory: places?.byCategory ?? {},
    flags: {
      emergingMarket,
      weakPerformance,
      leaseholdRisk,
      isLuxury: matchResult.isLuxury,
      expandedZone: matchResult.expanded,
    },
  }
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
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
let _photoCache: { ts: number; data: Record<string, string[]> } | null = null
async function firstPhoto(villaId: string): Promise<string | null> {
  if (!_photoCache || Date.now() - _photoCache.ts > 60 * 60 * 1000) {
    try {
      const r = await fetch(PHOTO_MANIFEST_URL, { next: { revalidate: 1800 } })
      if (r.ok) _photoCache = { ts: Date.now(), data: await r.json() }
    } catch { /* ignore */ }
  }
  return _photoCache?.data[villaId]?.[0] ?? null
}
