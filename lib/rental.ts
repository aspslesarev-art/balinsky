export type RentalItem = {
  id: string
  slug: string
  title: string
  type: string | null
  bedrooms: number | null
  location: string | null
  priceMonthUsd: number
  priceSegment: string | null
  notes: string | null
  telegram: string | null
  photos: string[]
  createdTime: string | null
  updatedAt: string | null
}
type Manifest = { generatedAt: string; count: number; items: RentalItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/rental/_rental.json`

// Listings older than this drop out of the public rental section
// (catalog + detail page). The villa-page rental-compare block keeps
// the full set — old prices are still valuable as benchmarks.
const FRESH_WINDOW_DAYS = 30

function isFresh(item: RentalItem, now: number): boolean {
  if (!item.createdTime) return false
  const t = Date.parse(item.createdTime)
  if (!Number.isFinite(t)) return false
  return now - t <= FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

// Returns every rental in the manifest, including ones added long ago.
// Use for analytics / comparison contexts where stale data is still useful.
export async function loadAllRental(): Promise<RentalItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:rental'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}

// Listings created within FRESH_WINDOW_DAYS — for the user-facing rental
// catalog and detail pages.
export async function loadFreshRental(): Promise<RentalItem[]> {
  const all = await loadAllRental()
  const now = Date.now()
  return all.filter(it => isFresh(it, now))
}

export async function loadRentalBySlug(slug: string): Promise<RentalItem | null> {
  const fresh = await loadFreshRental()
  return fresh.find(r => r.slug === slug) ?? null
}
