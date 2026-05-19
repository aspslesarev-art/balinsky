import { applyManifestTranslation, loadEnTranslations } from '@/lib/en-translations'
import type { Lang } from '@/lib/i18n'

export type NewsDeveloper = { name: string; slug: string | null }

export type NewsItem = {
  id: string
  slug: string
  // Legacy / cross-lang slugs. On /ru this is empty (or holds the
  // editor's SEO:Slug if it differs). On /en this holds the RU
  // transliterated slug so old links still resolve via 301.
  aliases?: string[]
  title: string
  seoDescription: string | null
  body: string | null
  date: string | null
  // Airtable record creation timestamp — drives the sort order. The
  // `date` field above is editor-set and may be backdated.
  createdAt?: string | null
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

// Slugify an English string: lowercase, ASCII alnum + hyphen, capped.
function slugifyEn(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function loadAllNews(lang: Lang = 'ru'): Promise<NewsItem[]> {
  const items = await loadRawNews()
  if (lang === 'ru' || items.length === 0) return items
  const cache = await loadEnTranslations('news')
  return items.map(item => {
    const translated = applyManifestTranslation(item, cache, EN_FIELDS)
    // When we have an EN title, derive an English-friendly slug from it
    // and keep the original transliterated RU slug as an alias. That
    // gives Google an English URL on /en (good for SEO) while the RU
    // slug still 301-redirects on the EN tree for any existing inbound
    // link.
    if (translated.title && translated.title !== item.title) {
      const enSlug = slugifyEn(translated.title)
      if (enSlug && enSlug !== translated.slug) {
        const aliases = Array.from(new Set([item.slug, ...(item.aliases ?? [])]))
          .filter(s => s && s !== enSlug)
        return { ...translated, slug: enSlug, aliases }
      }
    }
    return translated
  })
}

export async function loadNewsBySlug(slug: string, lang: Lang = 'ru'): Promise<NewsItem | null> {
  const all = await loadAllNews(lang)
  return all.find(n => n.slug === slug || (n.aliases?.includes(slug) ?? false)) ?? null
}

export async function loadNewsByDeveloperSlug(devSlug: string, limit = 12, lang: Lang = 'ru'): Promise<NewsItem[]> {
  const all = await loadAllNews(lang)
  return all.filter(n => n.developers.some(d => d.slug === devSlug)).slice(0, limit)
}
