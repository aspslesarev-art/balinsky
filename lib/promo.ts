export type PromoDev = { name: string; slug: string | null }
export type PromoItem = {
  id: string
  slug: string
  title: string
  seoDescription: string | null
  body: string | null
  expiresAt: string | null
  photo: string | null
  externalUrl: string | null
  pinned: boolean
  top10: boolean
  complexNames: string[]
  developers: PromoDev[]
}
type Manifest = { generatedAt: string; count: number; items: PromoItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/promo/_promo.json`

export async function loadAllPromo(): Promise<PromoItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:promo'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}
export async function loadPromoBySlug(slug: string): Promise<PromoItem | null> {
  const all = await loadAllPromo()
  return all.find(p => p.slug === slug) ?? null
}
