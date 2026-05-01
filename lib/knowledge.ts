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

export async function loadAllKnowledge(): Promise<KnowledgeItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:knowledge'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}
export async function loadKnowledgeBySlug(slug: string): Promise<KnowledgeItem | null> {
  const all = await loadAllKnowledge()
  return all.find(k => k.slug === slug) ?? null
}
