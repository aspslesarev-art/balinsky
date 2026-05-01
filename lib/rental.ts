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
export async function loadRentalBySlug(slug: string): Promise<RentalItem | null> {
  const all = await loadAllRental()
  return all.find(r => r.slug === slug) ?? null
}
