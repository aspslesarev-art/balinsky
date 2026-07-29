import { asList } from '@/lib/as-list'
import { applyManifestTranslation, loadTranslations } from '@/lib/en-translations'
import { slugifyTitle, uniqueSlug } from '@/lib/slugify'
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

// Guarantee every item has a usable slug. The admin adapter stamps one on
// save, but a record can still reach the manifest without it (hand-edited
// JSON, a restored backup, an import). Without this the listing renders
// `/ru/novosti/undefined` and the detail page 404s, so the URL is derived
// here as well — same transliteration, so a record repaired at rest keeps
// the URL it was already being served under.
//
// Items that already carry a slug keep it untouched: it is their indexed URL.
function withDerivedSlugs(items: NewsItem[]): NewsItem[] {
  if (items.every(n => n.slug)) return items
  const taken = new Set<string>()
  for (const n of items) {
    if (n.slug) taken.add(n.slug)
    for (const a of n.aliases ?? []) if (a) taken.add(a)
  }
  return items.map(n => {
    if (n.slug) return n
    const slug = uniqueSlug(slugifyTitle(n.title), taken)
    if (!slug) return n
    taken.add(slug)
    return { ...n, slug }
  })
}

// Slugify an English string: lowercase, ASCII alnum + hyphen, capped.
function slugifyEn(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function loadAllNews(lang: Lang = 'ru'): Promise<NewsItem[]> {
  const items = withDerivedSlugs(await loadRawNews())
  if (items.length === 0) return items
  // RU also loads the EN translation cache — not to translate, but to know
  // the English-derived slug and stash it in aliases. Without this, the
  // language switch on /en/news/<en-slug> sends users to
  // /ru/novosti/<en-slug>, which 404s because the RU manifest only knows
  // the Cyrillic-transliterated slug. With the alias in place, RU lookup
  // resolves the EN slug just like the EN tree resolves the RU one.
  const cache = await loadTranslations('news', lang)
  return items.map(item => {
    const translated = lang !== 'ru' ? applyManifestTranslation(item, cache, EN_FIELDS) : item
    // Compute the EN-derived slug from whatever EN title we have in cache —
    // even on the RU branch, where we'll only stash it into aliases.
    const enTitle = cache[item.id]?.title
    const enSlug = enTitle ? slugifyEn(enTitle) : ''
    if (lang !== 'ru' && enSlug && enSlug !== translated.slug) {
      const aliases = Array.from(new Set([item.slug, ...(item.aliases ?? [])]))
        .filter(s => s && s !== enSlug)
      return { ...translated, slug: enSlug, aliases }
    }
    if (lang === 'ru' && enSlug && enSlug !== item.slug && !(item.aliases ?? []).includes(enSlug)) {
      return { ...item, aliases: [...(item.aliases ?? []), enSlug] }
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
  return all.filter(n => asList(n.developers).some(d => d.slug === devSlug)).slice(0, limit)
}
