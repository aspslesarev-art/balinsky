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

const TTL_MS = 10 * 60 * 1000
let _cache: { ts: number; data: NewsItem[] } | null = null
let _inflight: Promise<NewsItem[]> | null = null

export async function loadAllNews(): Promise<NewsItem[]> {
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

export async function loadNewsBySlug(slug: string): Promise<NewsItem | null> {
  const all = await loadAllNews()
  return all.find(n => n.slug === slug) ?? null
}

export async function loadNewsByDeveloperSlug(devSlug: string, limit = 12): Promise<NewsItem[]> {
  const all = await loadAllNews()
  return all.filter(n => n.developers.some(d => d.slug === devSlug)).slice(0, limit)
}
