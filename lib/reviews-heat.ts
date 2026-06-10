import { unstable_cache } from 'next/cache'
import { loadCompetitors } from './competitors'

// One weighted point for the Google Maps heatmap: a ~0.5 km grid cell with the
// total Google review count of the tourist POIs that fall in it.
export type HeatCell = { lat: number; lng: number; weight: number }
export type ReviewHeat = { cells: HeatCell[]; max: number }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
// Pre-aggregated by scripts/build-heat-pois.mjs from the Google Places POIs in
// _nearby_places (restaurants / bars / attractions / wellness / beach clubs,
// mid-price and up — local warungs filtered out). This is the "where it's
// lively for tourists" signal, island-wide and far better covered than the
// rental-competitor reviews (which are blank in Ubud/Sanur).
const POIS_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_heat_pois.json`

const CELL = 0.0045

// Fallback: aggregate the rental-competitor manifest directly. Only used if the
// pre-built POI file is missing, so the map still shows something.
async function buildFromCompetitors(): Promise<ReviewHeat> {
  const comps = await loadCompetitors()
  const grid = new Map<string, { latSum: number; lngSum: number; weight: number; n: number }>()
  for (const c of comps) {
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') continue
    const w = c.reviews ?? 0
    if (w <= 0) continue
    const k = `${Math.round(c.lat / CELL)}:${Math.round(c.lng / CELL)}`
    let cell = grid.get(k)
    if (!cell) { cell = { latSum: 0, lngSum: 0, weight: 0, n: 0 }; grid.set(k, cell) }
    cell.latSum += c.lat; cell.lngSum += c.lng; cell.weight += w; cell.n++
  }
  const cells: HeatCell[] = []
  for (const c of grid.values()) cells.push({ lat: c.latSum / c.n, lng: c.lngSum / c.n, weight: c.weight })
  const sorted = cells.map(c => c.weight).sort((a, b) => a - b)
  const max = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.92)] : 1
  return { cells, max: Math.max(1, max) }
}

async function build(): Promise<ReviewHeat> {
  try {
    const r = await fetch(POIS_URL, { next: { revalidate: 3600 } })
    if (r.ok) {
      const j = (await r.json()) as { cells?: HeatCell[]; max?: number }
      if (Array.isArray(j.cells) && j.cells.length > 0) {
        return { cells: j.cells, max: Math.max(1, j.max ?? 1) }
      }
    }
  } catch {
    // fall through to the competitor-based fallback
  }
  return buildFromCompetitors()
}

export const loadReviewHeat = unstable_cache(build, ['reviews-heat-v3-allbali'], {
  revalidate: 3600,
  tags: ['content:competitors'],
})
