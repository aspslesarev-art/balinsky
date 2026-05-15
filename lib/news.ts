import { applyManifestTranslation, loadEnTranslations } from '@/lib/en-translations'
import type { Lang } from '@/lib/i18n'

export type NewsDeveloper = { name: string; slug: string | null }

export type NewsItem = {
  id: string
  slug: string
  title: string
  seoDescription: string | null
  body: string | null
  date: string | null
  photo: string | null
  externalUrl: string | null
  videoUrl: string | null
  pinned: boolean
  complexNames: string[]
  developers: NewsDeveloper[]
}

type Manifest = { generatedAt: string; count: number; items: NewsItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/news/_news.json`

// Fields that get translated to English. Mirrored in scripts/translate-missing-en.mjs.
const EN_FIELDS = ['title', 'seoDescription', 'body'] as const

async function loadRawNews(): Promise<NewsItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:news'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}

export async function loadAllNews(lang: Lang = 'ru'): Promise<NewsItem[]> {
  const items = await loadRawNews()
  if (lang === 'ru' || items.length === 0) return items
  const cache = await loadEnTranslations('news')
  return items.map(item => applyManifestTranslation(item, cache, EN_FIELDS))
}

export async function loadNewsBySlug(slug: string, lang: Lang = 'ru'): Promise<NewsItem | null> {
  const all = await loadAllNews(lang)
  return all.find(n => n.slug === slug) ?? null
}

export async function loadNewsByDeveloperSlug(devSlug: string, limit = 12, lang: Lang = 'ru'): Promise<NewsItem[]> {
  const all = await loadAllNews(lang)
  return all.filter(n => n.developers.some(d => d.slug === devSlug)).slice(0, limit)
}
