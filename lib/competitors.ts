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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_competitors.json`

const TTL_MS = 10 * 60 * 1000
let _cache: { ts: number; data: Competitor[] } | null = null
let _inflight: Promise<Competitor[]> | null = null

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
      // no-store: this manifest is ~14 MB. Next.js' fetch cache rejects
      // payloads >2 MB and surfaces the failure as an unhandledRejection
      // (→ 500 on Vercel). The module-level _cache above handles dedup;
      // we don't need Next's data cache too.
      const r = await fetch(MANIFEST_URL, { cache: 'no-store' })
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

export async function loadNearby(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<CompetitorWithDistance[]> {
  const all = await loadCompetitors()
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  const out: CompetitorWithDistance[] = []
  for (const c of all) {
    if (c.lat < lat - dLat || c.lat > lat + dLat) continue
    if (c.lng < lng - dLng || c.lng > lng + dLng) continue
    const d = distanceKm(lat, lng, c.lat, c.lng)
    if (d <= radiusKm) out.push({ ...c, distanceKm: d })
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm)
  return out
}
