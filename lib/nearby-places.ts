export type NearbyPlace = {
  id: string
  name: string | null
  rating: number | null
  reviews: number | null
  primaryType: string | null
  types: string[]
  priceLevel: string | null
  address: string | null
  mapsUrl: string | null
  lat: number
  lng: number
  distanceKm: number
}

export type NearbyCategory = { key: string; title: string }

type Manifest = {
  generatedAt: string
  categories: NearbyCategory[]
  villas: Record<string, Record<string, NearbyPlace[]>>
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places.json`

const TTL_MS = 30 * 60 * 1000
let _cache: { ts: number; data: Manifest } | null = null
let _inflight: Promise<Manifest | null> | null = null

async function loadManifest(): Promise<Manifest | null> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      // no-store: manifest is ~54 MB, well above Next.js' 2 MB data
      // cache cap. The module-level _cache above handles dedup.
      const r = await fetch(MANIFEST_URL, { cache: 'no-store' })
      if (!r.ok) return null
      const j = (await r.json()) as Manifest
      _cache = { ts: Date.now(), data: j }
      return j
    } catch {
      return _cache?.data ?? null
    } finally {
      _inflight = null
    }
  })()
  return _inflight
}

export async function loadNearbyPlaces(
  villaId: string,
): Promise<{ categories: NearbyCategory[]; byCategory: Record<string, NearbyPlace[]> } | null> {
  const m = await loadManifest()
  if (!m) return null
  const byCategory = m.villas[villaId]
  if (!byCategory) return null
  return { categories: m.categories, byCategory }
}
