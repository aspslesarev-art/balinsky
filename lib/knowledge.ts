import { applyManifestTranslation, loadEnTranslations } from '@/lib/en-translations'
import type { Lang } from '@/lib/i18n'

export type KnowledgeAudience = 'investor' | 'agent'

export type KnowledgeItem = {
  id: string
  slug: string
  title: string
  body: string
  audience?: KnowledgeAudience[]
  photo: string | null
  externalUrl: string | null
  createdTime: string | null
}
type Manifest = { generatedAt: string; count: number; items: KnowledgeItem[] }

function audienceOf(item: KnowledgeItem): KnowledgeAudience[] {
  const a = item.audience
  if (Array.isArray(a) && a.length) return a
  return ['investor']
}

export function filterByAudience(items: KnowledgeItem[], audience: KnowledgeAudience): KnowledgeItem[] {
  return items.filter(i => audienceOf(i).includes(audience))
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/knowledge/_knowledge.json`

const EN_FIELDS = ['title', 'body'] as const

async function loadRawKnowledge(): Promise<KnowledgeItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:knowledge'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}

export async function loadAllKnowledge(lang: Lang = 'ru'): Promise<KnowledgeItem[]> {
  const items = await loadRawKnowledge()
  if (lang === 'ru' || items.length === 0) return items
  const cache = await loadEnTranslations('knowledge')
  return items.map(item => applyManifestTranslation(item, cache, EN_FIELDS))
}

export async function loadKnowledgeBySlug(slug: string, lang: Lang = 'ru'): Promise<KnowledgeItem | null> {
  const all = await loadAllKnowledge(lang)
  return all.find(k => k.slug === slug) ?? null
}
