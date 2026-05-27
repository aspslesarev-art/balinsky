import {
  type Competitor,
  type CompetitorWithDistance,
  distanceKm,
} from './competitor-utils'

export {
  type Competitor,
  type CompetitorWithDistance,
  type CompetitorGroup,
  type CompetitorStats,
  type SimilarStats,
  distanceKm,
  median,
  groupByLocation,
  summarize,
  summarizeSimilar,
} from './competitor-utils'

type Manifest = { generatedAt: string; count: number; items: Competitor[] }
type CellIndex = { generatedAt: string; cellDeg: number; cells: string[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_competitors.json`
const CELLS_INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_cells.json`
const CELL_URL = (k: string) => `${SUPABASE_URL}/storage/v1/object/public/competitors/_cells/${k}.json`

const TTL_MS = 10 * 60 * 1000
let _cache: { ts: number; data: Competitor[] } | null = null
let _inflight: Promise<Competitor[]> | null = null

// Per-cell cache (5.5 km tiles). loadNearby resolves 1-4 cells per request,
// so snapshot egress drops from 10.5 MB (full manifest) to ~280 KB.
let _cellIndex: { ts: number; data: CellIndex } | null = null
const _cellCache = new Map<string, { ts: number; data: Competitor[] }>()

function dedupCompetitors(items: Competitor[]): Competitor[] {
  // Один Booking-объект иногда лежит несколько раз (разные даты сбора).
  // Ключ: URL, иначе complex|name|price|bedrooms.
  const seen = new Map<string, Competitor>()
  for (const c of items) {
    const key = c.url
      ? `u:${c.url}`
      : `n:${c.complex ?? ''}|${c.name ?? ''}|${c.price}|${c.bedrooms ?? ''}`
    const prev = seen.get(key)
    if (!prev) { seen.set(key, c); continue }
    const score = (x: Competitor) =>
      (x.photo ? 4 : 0) + (x.date ? 2 : 0) + (x.reviews ?? 0) / 1000
    if (score(c) > score(prev)) seen.set(key, c)
  }
  return [...seen.values()]
}

export async function loadCompetitors(): Promise<Competitor[]> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      const r = await fetch(MANIFEST_URL, { next: { revalidate: 600 } })
      if (!r.ok) return []
      const j = (await r.json()) as Manifest
      const items = Array.isArray(j.items) ? dedupCompetitors(j.items) : []
      _cache = { ts: Date.now(), data: items }
      return items
    } catch {
      return _cache?.data ?? []
    } finally {
      _inflight = null
    }
  })()
  return _inflight
}

async function loadCellIndex(): Promise<CellIndex | null> {
  if (_cellIndex && Date.now() - _cellIndex.ts < TTL_MS) return _cellIndex.data
  try {
    const r = await fetch(CELLS_INDEX_URL, { next: { revalidate: 600 } })
    if (!r.ok) return null
    const j = (await r.json()) as CellIndex
    _cellIndex = { ts: Date.now(), data: j }
    return j
  } catch {
    return _cellIndex?.data ?? null
  }
}

async function loadCell(key: string): Promise<Competitor[]> {
  const hit = _cellCache.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data
  try {
    const r = await fetch(CELL_URL(key), { next: { revalidate: 600 } })
    if (!r.ok) return []
    const data = (await r.json()) as Competitor[]
    _cellCache.set(key, { ts: Date.now(), data })
    return data
  } catch {
    return hit?.data ?? []
  }
}

export async function loadNearby(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<CompetitorWithDistance[]> {
  const idx = await loadCellIndex()
  if (!idx) {
    // Fallback to full manifest if cells haven't been generated yet
    // (first deploy after sync hasn't run). Removed once cells are live.
    const all = await loadCompetitors()
    return filterByRadius(all, lat, lng, radiusKm)
  }
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  const cell = idx.cellDeg
  const minCellLat = Math.floor((lat - dLat) / cell)
  const maxCellLat = Math.floor((lat + dLat) / cell)
  const minCellLng = Math.floor((lng - dLng) / cell)
  const maxCellLng = Math.floor((lng + dLng) / cell)
  const existing = new Set(idx.cells)
  const wantedKeys: string[] = []
  for (let i = minCellLat; i <= maxCellLat; i++) {
    for (let j = minCellLng; j <= maxCellLng; j++) {
      const k = `${i}_${j}`
      if (existing.has(k)) wantedKeys.push(k)
    }
  }
  const cells = await Promise.all(wantedKeys.map(loadCell))
  const merged = cells.flat()
  return filterByRadius(dedupCompetitors(merged), lat, lng, radiusKm)
}

function filterByRadius(items: Competitor[], lat: number, lng: number, radiusKm: number): CompetitorWithDistance[] {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  const out: CompetitorWithDistance[] = []
  for (const c of items) {
    if (c.lat < lat - dLat || c.lat > lat + dLat) continue
    if (c.lng < lng - dLng || c.lng > lng + dLng) continue
    const d = distanceKm(lat, lng, c.lat, c.lng)
    if (d <= radiusKm) out.push({ ...c, distanceKm: d })
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm)
  return out
}
