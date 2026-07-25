// Investment signals for a residential complex (ЖК) — a compact synthesis
// of data that already lives elsewhere on the page, framed for a buyer:
//   1. gross rental yield  (RevPAR×365 ÷ median unit price)   — ROI
//   2. beach zone          (nearest-beach distance → walk band) — price driver
//   3. occupancy vs district median                            — demand
//   4. completion timing   (readiness + year + status)         — when income starts
//
// Signal "1" on the page (developer reliability) is rendered separately.
//
// The pure compute takes already-extracted primitives so it never re-reads the
// DB or duplicates the detail page's readiness logic. The one thing that needs
// its own read — the per-district occupancy median — is a small, cached loader.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type BeachZone = 'beachfront' | 'walking' | 'scooter' | 'inland'
type UnitKind = 'villa' | 'apartment'

export type YieldSignal = { pct: number; kind: UnitKind }
export type ZoneSignal = {
  zone: BeachZone
  walkingMinutes: number | null
  beachName: string | null
  km: number
}
export type OccupancySignal = {
  pct: number
  districtMedian: number
  deltaPp: number // percentage points vs district median
  kind: UnitKind
}
export type TimingSignal = {
  state: 'ready' | 'soon' | 'building'
  year: number | null
}

export type ComplexSignals = {
  yield: YieldSignal | null
  zone: ZoneSignal | null
  occupancy: OccupancySignal | null
  timing: TimingSignal | null
}

// A Bali-property USD price band. Guards the yield median against RUB-only
// prices leaking in (loadUnitsInComplex collapses price_usd ?? price_rub, so a
// unit priced only in roubles would otherwise poison the median with a
// billions-sized number). Median is robust; the band is belt-and-suspenders.
const USD_PRICE_MIN = 30_000
const USD_PRICE_MAX = 4_000_000
// Straight-line → walking distance fudge + walking speed. Mirrors
// lib/investment/zones.ts thresholds so the two surfaces agree.
const HAVERSINE_TO_WALK = 1.3
const WALK_METERS_PER_MIN = 80
// A district needs at least this many measured complexes for its occupancy
// median to be worth comparing against.
const MIN_DISTRICT_SAMPLES = 3
// Plausible gross-yield band; anything outside is almost certainly a data
// error (missing/foreign-currency price, stale RevPAR) — drop it rather than
// print a number an investor would rightly distrust.
const YIELD_MIN_PCT = 1
const YIELD_MAX_PCT = 40

function median(nums: number[]): number | null {
  const s = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (s.length === 0) return null
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function classifyZone(km: number): BeachZone {
  const meters = km * 1000 * HAVERSINE_TO_WALK
  if (meters <= 100) return 'beachfront'
  if (meters <= 500) return 'walking'
  if (meters <= 1500) return 'scooter'
  return 'inland'
}

type MarketStatsLike = {
  villa_count: number
  villa_occupancy_pct: number | null
  villa_revpar_usd: number | null
  apartment_count: number
  apartment_occupancy_pct: number | null
  apartment_revpar_usd: number | null
} | null

type AccessLike = {
  nearest_beach_name: string | null
  nearest_beach_km: number | null
} | null

export type DistrictOccupancy = {
  villa: number | null
  villaN: number
  apartment: number | null
  apartmentN: number
}

export type ComputeInput = {
  units: { kind: UnitKind; priceUsd: number | null }[]
  marketStats: MarketStatsLike
  access: AccessLike
  districtMedians: DistrictOccupancy | null
  readinessPct: number
  year: number | null
  status: string | null
  currentYear: number
}

// Gross yield for a segment: annual RevPAR ÷ median unit price of that kind.
// Both sides must be the same segment (villa RevPAR vs villa prices) or the
// number is meaningless.
function yieldFor(
  kind: UnitKind,
  revpar: number | null,
  units: ComputeInput['units'],
): YieldSignal | null {
  if (revpar == null || revpar <= 0) return null
  const prices = units
    .filter((u) => u.kind === kind && u.priceUsd != null)
    .map((u) => Number(u.priceUsd))
    .filter((n) => Number.isFinite(n) && n >= USD_PRICE_MIN && n <= USD_PRICE_MAX)
  const med = median(prices)
  if (med == null || med <= 0) return null
  const pct = Math.round(((revpar * 365) / med) * 1000) / 10
  if (pct < YIELD_MIN_PCT || pct > YIELD_MAX_PCT) return null
  return { pct, kind }
}

function computeYield(input: ComputeInput): YieldSignal | null {
  const ms = input.marketStats
  if (!ms) return null
  const villa = yieldFor('villa', ms.villa_revpar_usd, input.units)
  const apt = yieldFor('apartment', ms.apartment_revpar_usd, input.units)
  if (villa && apt) {
    // Prefer the segment with more priced units backing the median.
    const villaN = input.units.filter((u) => u.kind === 'villa' && u.priceUsd != null).length
    const aptN = input.units.filter((u) => u.kind === 'apartment' && u.priceUsd != null).length
    return villaN >= aptN ? villa : apt
  }
  return villa ?? apt
}

function computeZone(access: AccessLike): ZoneSignal | null {
  if (!access || access.nearest_beach_km == null) return null
  const km = access.nearest_beach_km
  const zone = classifyZone(km)
  const walkingMinutes =
    zone === 'inland'
      ? null
      : Math.max(1, Math.round((km * 1000 * HAVERSINE_TO_WALK) / WALK_METERS_PER_MIN))
  return { zone, walkingMinutes, beachName: access.nearest_beach_name, km: Math.round(km * 10) / 10 }
}

function computeOccupancy(input: ComputeInput): OccupancySignal | null {
  const ms = input.marketStats
  const dm = input.districtMedians
  if (!ms || !dm) return null
  // Match the segment to whichever has both a complex occupancy and a district
  // median with enough samples; prefer the segment with more listings here.
  const candidates: { kind: UnitKind; occ: number | null; median: number | null; n: number; count: number }[] = [
    { kind: 'villa', occ: ms.villa_occupancy_pct, median: dm.villa, n: dm.villaN, count: ms.villa_count },
    { kind: 'apartment', occ: ms.apartment_occupancy_pct, median: dm.apartment, n: dm.apartmentN, count: ms.apartment_count },
  ]
  const usable = candidates
    .filter((c) => c.occ != null && c.median != null && c.n >= MIN_DISTRICT_SAMPLES)
    .sort((a, b) => b.count - a.count)
  const best = usable[0]
  if (!best) return null
  const occ = Math.round(best.occ! * 10) / 10
  const med = Math.round(best.median! * 10) / 10
  return { pct: occ, districtMedian: med, deltaPp: Math.round((occ - med) * 10) / 10, kind: best.kind }
}

function computeTiming(input: ComputeInput): TimingSignal | null {
  const status = (input.status ?? '').toLowerCase()
  const isBuilt = status.includes('построен') || status.includes('сдан') || status.includes('готов')
  if (isBuilt || input.readinessPct >= 100) return { state: 'ready', year: input.year }
  if (input.readinessPct >= 90 || (input.year != null && input.year <= input.currentYear)) {
    return { state: 'soon', year: input.year }
  }
  if (input.year == null && input.readinessPct <= 0) return null
  return { state: 'building', year: input.year }
}

export function computeComplexSignals(input: ComputeInput): ComplexSignals {
  return {
    yield: computeYield(input),
    zone: computeZone(input.access),
    occupancy: computeOccupancy(input),
    timing: computeTiming(input),
  }
}

export function hasAnySignal(s: ComplexSignals): boolean {
  return !!(s.yield || s.zone || s.occupancy || s.timing)
}

// ---- District occupancy medians -------------------------------------------
// complex_market_stats is small (one row per complex) and doesn't carry the
// district, so we join it to the public complexes index (a tiny Storage JSON,
// CDN-cached). Grouped medians are memoised in-process for 30 min — the source
// data is synced monthly, so this is plenty fresh and avoids per-render reads.
const COMPLEX_INDEX_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feeds/_complexes-index.json`
const MEDIAN_TTL_MS = 30 * 60 * 1000

type IndexEntry = { id: string; district: string | null }
const _medianCache: { ts: number; map: Map<string, DistrictOccupancy> | null } = { ts: 0, map: null }

export async function loadDistrictOccupancyMedians(): Promise<Map<string, DistrictOccupancy>> {
  if (_medianCache.map && Date.now() - _medianCache.ts < MEDIAN_TTL_MS) return _medianCache.map

  const [{ data: rows }, index] = await Promise.all([
    sb.from('complex_market_stats').select('airtable_id, villa_occupancy_pct, apartment_occupancy_pct'),
    fetch(COMPLEX_INDEX_URL, { next: { revalidate: 600 } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j: { items?: IndexEntry[] }) => j.items ?? [])
      .catch(() => [] as IndexEntry[]),
  ])

  const districtById = new Map<string, string>()
  for (const e of index) if (e.district) districtById.set(e.id, e.district)

  const villaByDistrict = new Map<string, number[]>()
  const aptByDistrict = new Map<string, number[]>()
  for (const r of rows ?? []) {
    const district = districtById.get(r.airtable_id as string)
    if (!district) continue
    if (r.villa_occupancy_pct != null) {
      const arr = villaByDistrict.get(district) ?? []
      arr.push(Number(r.villa_occupancy_pct))
      villaByDistrict.set(district, arr)
    }
    if (r.apartment_occupancy_pct != null) {
      const arr = aptByDistrict.get(district) ?? []
      arr.push(Number(r.apartment_occupancy_pct))
      aptByDistrict.set(district, arr)
    }
  }

  const map = new Map<string, DistrictOccupancy>()
  const districts = new Set<string>([...villaByDistrict.keys(), ...aptByDistrict.keys()])
  for (const d of districts) {
    const villas = villaByDistrict.get(d) ?? []
    const apts = aptByDistrict.get(d) ?? []
    map.set(d, {
      villa: median(villas),
      villaN: villas.length,
      apartment: median(apts),
      apartmentN: apts.length,
    })
  }

  _medianCache.ts = Date.now()
  _medianCache.map = map
  return map
}
