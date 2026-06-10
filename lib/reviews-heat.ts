import { unstable_cache } from 'next/cache'
import { loadCompetitors } from './competitors'

// One weighted point for the Google Maps heatmap: a ~0.5 km grid cell with
// the total Google review count of every listing that falls in it.
export type HeatCell = { lat: number; lng: number; weight: number }
export type ReviewHeat = { cells: HeatCell[]; max: number }

// ~0.0045° ≈ 500 m. Coarse enough to keep the payload tiny (a few hundred
// cells island-wide) and let the heatmap's own blur do the smoothing.
const CELL = 0.0045

// Aggregate the island-wide competitor manifest (lat/lng + review count) into
// a grid. The heatmap then reads "popularity": clusters of well-reviewed
// rentals glow red, quiet areas stay blue. Cheap — runs off the already-cached
// competitors manifest and the small result is itself cached.
async function build(): Promise<ReviewHeat> {
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
  for (const c of grid.values()) {
    cells.push({ lat: c.latSum / c.n, lng: c.lngSum / c.n, weight: c.weight })
  }
  // Cap intensity at a high percentile so one mega-cluster doesn't wash the
  // rest of the map blue — anything at/above this is full red.
  const sorted = cells.map(c => c.weight).sort((a, b) => a - b)
  const max = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.92)] : 1
  return { cells, max: Math.max(1, max) }
}

export const loadReviewHeat = unstable_cache(build, ['reviews-heat-v1'], {
  revalidate: 3600,
  tags: ['content:competitors'],
})
