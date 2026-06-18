import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { type CompetitorWithDistance, distanceKm } from '@/lib/competitor-utils'
import { loadCompetitors } from '@/lib/competitors'
import type { NearbyPlace } from '@/lib/nearby-places'
import { regionFor } from './regions'
import { matchCompetitors, type MatchResult } from './matching'
import { adrPercentiles, computeEconomics } from './economics'
import { scoreInfra } from './infra-score'
import { isDailyRentalRestricted } from '@/lib/land-use'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Row = { airtable_id: string; data: Record<string, unknown> }

// buildOneScore reads only these villa fields. Projecting them out of `data`
// (~33MB for the full column across 2000 villas — it was timing out 520/500)
// drops the response to a few hundred KB and makes the cache below viable.
// `->` returns the raw JSON value, so the reconstructed `data` is identical.
const VILLA_SCORE_SELECT =
  'airtable_id,' +
  'pub:data->"Опубликовать",geo:data->Geo,geo2:data->"Geo 2",' +
  'rooms:data->"Комнаты",area:data->"Площадь",' +
  'price:data->price,price_ru:data->"Цена",' +
  'lh:data->Leasehold,lh2:data->Leashold,' +
  'pool:data->Pool,pool_ru:data->"Бассейн",' +
  'land_color:data->"Land color"'

type VillaScoreRow = {
  airtable_id: string
  pub: unknown; geo: unknown; geo2: unknown; rooms: unknown; area: unknown
  price: unknown; price_ru: unknown; lh: unknown; lh2: unknown; pool: unknown; pool_ru: unknown
  land_color: unknown
}

// Cross-instance cache of the slim rows (the module-level _cache below is only
// per-warm-instance). Collapses the raw_villas scan to ~hourly.
const _loadVillaScoreRows = unstable_cache(
  async (): Promise<Row[]> => {
    const { data } = await sb.from('raw_villas').select(VILLA_SCORE_SELECT).limit(2000)
    return ((data ?? []) as unknown as VillaScoreRow[]).map(r => ({
      airtable_id: r.airtable_id,
      data: {
        'Опубликовать': r.pub, 'Geo': r.geo, 'Geo 2': r.geo2,
        'Комнаты': r.rooms, 'Площадь': r.area, 'price': r.price, 'Цена': r.price_ru,
        'Leasehold': r.lh, 'Leashold': r.lh2, 'Pool': r.pool, 'Бассейн': r.pool_ru,
        'Land color': r.land_color,
      } as Record<string, unknown>,
    }))
  },
  // v2: added "Land color" to the projection (yellow-land rental gate).
  ['villa-score-rows-v2'],
  { revalidate: 3600 },
)

function fs1(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return fs1(v[0])
  if (v && typeof v === 'object' && 'value' in v) return fs1((v as { value: unknown }).value)
  return null
}
function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/\s/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length > 0) return num(v[0])
  if (v && typeof v === 'object' && 'value' in v) return num((v as { value: unknown }).value)
  return null
}
function detectPool(d: Record<string, unknown>): boolean | null {
  const explicit = fs1(d['Бассейн']) ?? fs1(d['Pool'])
  if (explicit) {
    if (/нет|no/i.test(explicit)) return false
    if (/[а-яa-z]/i.test(explicit)) return true
  }
  return null
}

export type VillaScore = {
  villaId: string
  composite: number   // 0..100
  capRate: number | null      // median scenario (p50 ADR × 65% occupancy)
  goodCapRate: number | null  // optimistic scenario (p75 ADR × 85% occupancy)
  infra: number       // 0..100
  confidence: 'high' | 'medium' | 'low'
  noi: number | null
  matches: number
  hasScenarios: boolean
  leaseholdRisk: boolean
  // True when the land is residential (yellow) — daily rental is illegal,
  // so capRate/goodCapRate are left null and the listing carries no
  // daily-rental investment score. Callers use this to drop it out of the
  // yield-ranked catalog ordering.
  rentalRestricted: boolean
}

const TTL_MS = 60 * 60 * 1000
let _cache: { ts: number; data: Map<string, VillaScore> } | null = null
let _inflight: Promise<Map<string, VillaScore>> | null = null

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)) }

function buildOneScore(
  row: Row,
  loadCompForVilla: (lat: number, lng: number) => CompetitorWithDistance[],
  byPlaces: Record<string, NearbyPlace[]> | null,
): VillaScore | null {
  const d = row.data
  if (d?.['Опубликовать'] !== true) return null
  const lat = num(d['Geo']); const lng = num(d['Geo 2'])
  if (lat == null || lng == null) return null
  const bedrooms = num(d['Комнаты']); const area = num(d['Площадь'])
  const askingPrice = num(d['price'] ?? d['Цена'])
  const leaseholdYearsLeft = num(d['Leasehold'] ?? d['Leashold'])
  const hasPool = detectPool(d)
  const region = regionFor(lat, lng)

  const beaches = byPlaces?.beach ?? []
  const inRadius = loadCompForVilla(lat, lng)
  const matchResult: MatchResult = matchCompetitors(inRadius, { lat, lng, bedrooms, area, hasPool }, beaches)

  // Residential (yellow) land — daily/short-term rental is illegal there, so
  // a daily-rental cap rate is meaningless. Skip the rental economics
  // entirely: no capRate, no scenarios, and the composite falls back to the
  // infra-only score so the listing isn't boosted into the yield-ranked TOP.
  const rentalRestricted = isDailyRentalRestricted(fs1(d['Land color']))

  let capRate: number | null = null
  let goodCapRate: number | null = null
  let noi: number | null = null
  let leaseholdRisk = false
  let hasScenarios = false
  if (!rentalRestricted && matchResult.mode !== 'references') {
    const pcts = adrPercentiles(matchResult.matches)
    const median = computeEconomics({
      adr: pcts.p50, occupancy: region.occupancyByScenario.median,
      area, askingPrice, leaseholdYearsLeft, region,
    })
    const bad = computeEconomics({
      adr: pcts.p25, occupancy: region.occupancyByScenario.bad,
      area, askingPrice, leaseholdYearsLeft, region,
    })
    const good = computeEconomics({
      adr: pcts.p75, occupancy: region.occupancyByScenario.good,
      area, askingPrice, leaseholdYearsLeft, region,
    })
    capRate = median.capRate
    goodCapRate = good.capRate
    noi = median.noi
    leaseholdRisk = bad.leaseholdRisk || median.leaseholdRisk
    hasScenarios = true
  }

  const infraResult = byPlaces ? scoreInfra(byPlaces) : null
  const infra = infraResult?.composite ?? 0

  // Composite: 60% economics, 40% infra, multiplied by confidence and leasehold penalty.
  const capRateScore = capRate != null ? clamp01(capRate / 0.08) * 100 : 0
  const confidence = matchResult.mode === 'standard' ? 'high' : matchResult.mode === 'reduced' ? 'medium' : 'low'
  const confMult = confidence === 'high' ? 1 : confidence === 'medium' ? 0.85 : 0.65
  const leaseholdMult = leaseholdRisk ? 0.75 : 1
  // If no scenarios — score relies only on infra, with low confidence
  const composite = hasScenarios
    ? Math.round((capRateScore * 0.6 + infra * 0.4) * confMult * leaseholdMult)
    : Math.round(infra * 0.6 * confMult)

  return {
    villaId: row.airtable_id,
    composite: Math.max(0, Math.min(100, composite)),
    capRate,
    goodCapRate,
    infra,
    confidence,
    noi,
    matches: matchResult.matches.length,
    hasScenarios,
    leaseholdRisk,
    rentalRestricted,
  }
}

async function loadAllScoresInternal(): Promise<Map<string, VillaScore>> {
  const [rows, allComps, placesManifest] = await Promise.all([
    _loadVillaScoreRows(),
    loadCompetitors(),
    fetchPlacesManifest(),
  ])
  // Pre-bucketize competitors by lat/lng cell for faster lookup
  // Cell size ~0.05° (~5km), villa needs only 2km radius
  type Cell = CompetitorWithDistance[]
  const cells = new Map<string, Cell>()
  const CELL = 0.05
  for (const c of allComps) {
    const key = `${Math.floor(c.lat / CELL)},${Math.floor(c.lng / CELL)}`
    const arr = cells.get(key) ?? []
    arr.push({ ...c, distanceKm: 0 })
    cells.set(key, arr)
  }

  function loadCompForVilla(lat: number, lng: number): CompetitorWithDistance[] {
    const out: CompetitorWithDistance[] = []
    const baseX = Math.floor(lat / CELL), baseY = Math.floor(lng / CELL)
    const dLat = 2 / 111
    const dLng = 2 / (111 * Math.cos((lat * Math.PI) / 180))
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = cells.get(`${baseX + dx},${baseY + dy}`)
        if (!list) continue
        for (const c of list) {
          if (c.lat < lat - dLat || c.lat > lat + dLat) continue
          if (c.lng < lng - dLng || c.lng > lng + dLng) continue
          const d = distanceKm(lat, lng, c.lat, c.lng)
          if (d <= 2) out.push({ ...c, distanceKm: d })
        }
      }
    }
    out.sort((a, b) => a.distanceKm - b.distanceKm)
    return out
  }

  const map = new Map<string, VillaScore>()
  for (const row of (rows ?? []) as Row[]) {
    const places = placesManifest?.villas?.[row.airtable_id] ?? null
    const score = buildOneScore(row, loadCompForVilla, places)
    if (score) map.set(row.airtable_id, score)
  }
  return map
}

export async function loadAllVillaScores(): Promise<Map<string, VillaScore>> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  if (_inflight) return _inflight
  _inflight = loadAllScoresInternal()
    .then(data => { _cache = { ts: Date.now(), data }; return data })
    .catch(err => { console.error('[batch-scores] failed:', err); return new Map() })
    .finally(() => { _inflight = null })
  return _inflight
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PLACES_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places.json`
async function fetchPlacesManifest(): Promise<{ villas: Record<string, Record<string, NearbyPlace[]>> } | null> {
  try {
    const r = await fetch(PLACES_MANIFEST_URL, { next: { revalidate: 1800 } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}
