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

type Index = {
  generatedAt: string
  categories: NearbyCategory[]
  ids: string[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places.json`
const LISTING_URL = (id: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/competitors/_nearby_places/${id}.json`

const TTL_MS = 30 * 60 * 1000
let _index: { ts: number; data: Index } | null = null
let _indexInflight: Promise<Index | null> | null = null

async function loadIndex(): Promise<Index | null> {
  if (_index && Date.now() - _index.ts < TTL_MS) return _index.data
  if (_indexInflight) return _indexInflight
  _indexInflight = (async () => {
    try {
      const r = await fetch(INDEX_URL, { next: { revalidate: 1800 } })
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
    const r = await fetch(LISTING_URL(villaId), { next: { revalidate: 1800 } })
    if (!r.ok) return null
    const byCategory = (await r.json()) as Record<string, NearbyPlace[]>
    return { categories: idx.categories, byCategory }
  } catch {
    return null
  }
}
