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

// Listings older than this drop out of the catalog and the rental-compare
// block on villa/apartment pages — keeps results actually current.
const FRESH_WINDOW_DAYS = 30

function isFresh(item: RentalItem, now: number): boolean {
  if (!item.createdTime) return false
  const t = Date.parse(item.createdTime)
  if (!Number.isFinite(t)) return false
  return now - t <= FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

export async function loadAllRental(): Promise<RentalItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:rental'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    const items = Array.isArray(j.items) ? j.items : []
    const now = Date.now()
    return items.filter(it => isFresh(it, now))
  } catch {
    return []
  }
}
export async function loadRentalBySlug(slug: string): Promise<RentalItem | null> {
  const all = await loadAllRental()
  return all.find(r => r.slug === slug) ?? null
}
