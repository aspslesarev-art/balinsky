export type KnowledgeItem = {
  id: string
  slug: string
  title: string
  body: string
  photo: string | null
  externalUrl: string | null
  createdTime: string | null
}
type Manifest = { generatedAt: string; count: number; items: KnowledgeItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/knowledge/_knowledge.json`

const TTL_MS = 10 * 60 * 1000
let _cache: { ts: number; data: KnowledgeItem[] } | null = null
let _inflight: Promise<KnowledgeItem[]> | null = null

export async function loadAllKnowledge(): Promise<KnowledgeItem[]> {
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
export async function loadKnowledgeBySlug(slug: string): Promise<KnowledgeItem | null> {
  const all = await loadAllKnowledge()
  return all.find(k => k.slug === slug) ?? null
}
