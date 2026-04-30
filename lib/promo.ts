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

const TTL_MS = 10 * 60 * 1000
let _cache: { ts: number; data: PromoItem[] } | null = null
let _inflight: Promise<PromoItem[]> | null = null

export async function loadAllPromo(): Promise<PromoItem[]> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      const r = await fetch(MANIFEST_URL, { next: { revalidate: 600 } })
      if (!r.ok) return []
      const j = (await r.json()) as Manifest
      const items = Array.isArray(j.items) ? j.items : []
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
export async function loadPromoBySlug(slug: string): Promise<PromoItem | null> {
  const all = await loadAllPromo()
  return all.find(p => p.slug === slug) ?? null
}
