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
  /** Минут на машине (Google Maps), где измерено — для далёких мест вроде пляжа. */
  driveMin?: number | null
}

export type NearbyCategory = { key: string; title: string }

type Index = {
  generatedAt: string
  categories: NearbyCategory[]
  ids: string[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places.json`
const LISTING_URL = (id: string) =>
  // ?v= — смена ключа кэша после правки файлов (17.10.2026, 10.11.2026 — места рядом для CITRINE).
  `${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places/${id}.json?v=20261110b`

const TTL_MS = 30 * 60 * 1000
let _index: { ts: number; data: Index } | null = null
let _indexInflight: Promise<Index | null> | null = null

async function loadIndex(): Promise<Index | null> {
  if (_index && Date.now() - _index.ts < TTL_MS) return _index.data
  if (_indexInflight) return _indexInflight
  _indexInflight = (async () => {
    try {
      const r = await fetch(INDEX_URL, { next: { revalidate: 604800, tags: ['nearby:places'] } })
      if (!r.ok) return null
      const j = (await r.json()) as Index
      _index = { ts: Date.now(), data: j }
      return j
    } catch {
      return _index?.data ?? null
    } finally {
      _indexInflight = null
    }
  })()
  return _indexInflight
}

export async function loadNearbyPlaces(
  villaId: string,
): Promise<{ categories: NearbyCategory[]; byCategory: Record<string, NearbyPlace[]> } | null> {
  const idx = await loadIndex()
  if (!idx) return null
  if (!idx.ids.includes(villaId)) return null
  try {
    const r = await fetch(LISTING_URL(villaId), { next: { revalidate: 604800, tags: ['nearby:places'] } })
    if (!r.ok) return null
    const byCategory = (await r.json()) as Record<string, NearbyPlace[]>
    return { categories: idx.categories, byCategory }
  } catch {
    return null
  }
}
