import { applyManifestTranslation, loadTranslations } from '@/lib/en-translations'
import type { Lang } from '@/lib/i18n'
import { enKnowledgeSlug } from '@/lib/knowledge-en-slugs'
import { normalizeSlug } from '@/lib/slug-normalize'

export type KnowledgeAudience = 'investor' | 'agent' | 'life'

export type KnowledgeAuthor = {
  name: string
  role: string | null
  photo: string | null
  slug: string | null
}

export type KnowledgeItem = {
  id: string
  slug: string
  title: string
  body: string
  audience?: KnowledgeAudience[]
  photo: string | null
  externalUrl: string | null
  createdTime: string | null
  // Airtable record timestamps. `createdTime` is the publish moment we
  // already render. `lastModifiedTime` (when sync exports it) drives the
  // "Обновлено" line. Both surface in Article JSON-LD too.
  lastModifiedTime?: string | null
  // Editorial byline. Filled in Airtable per-article — when missing,
  // the page falls back to a generic Balinsky redaktsiya block.
  author?: KnowledgeAuthor | null
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
    if (!Array.isArray(j.items)) return []
    // Normalize slugs: a few article slugs carry trailing/double dashes from
    // truncated titles. The route resolves the normalized form, so the raw
    // slug in the sitemap/canonical 301s → GSC "Page with redirect". Cleaning
    // here makes sitemap, canonical and lookup agree. Map keys in
    // enKnowledgeSlug are already dash-clean, so this doesn't disturb EN slugs.
    return j.items.map(it => ({ ...it, slug: normalizeSlug(it.slug) }))
  } catch {
    return []
  }
}

export async function loadAllKnowledge(lang: Lang = 'ru'): Promise<KnowledgeItem[]> {
  const items = await loadRawKnowledge()
  if (lang === 'ru' || items.length === 0) return items
  const cache = await loadTranslations('knowledge', lang)
  return items.map(item => applyManifestTranslation(item, cache, EN_FIELDS))
}

export async function loadKnowledgeBySlug(slug: string, lang: Lang = 'ru'): Promise<KnowledgeItem | null> {
  const all = await loadAllKnowledge(lang)
  // On /en, resolve by the English-facing slug; also accept the old shared
  // (transliterated) slug so legacy URLs still render before middleware 301s
  // them to the English one.
  const target = normalizeSlug(slug)
  if (lang !== 'ru') {
    return all.find(k => enKnowledgeSlug(k.slug) === slug || k.slug === target) ?? null
  }
  return all.find(k => k.slug === target) ?? null
}
