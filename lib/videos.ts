import type { Lang } from './i18n'
import { revisionedCache } from './revisioned-cache'

export type VideoLink = { name: string; slug: string | null }
export type VideoItem = {
  id: string
  name: string | null
  url: string
  embedUrl: string | null
  addedAt: string | null
  // Languages this video is for: 'ru', 'en'. Empty array = applies to
  // both (default for un-tagged legacy rows so they stay visible while
  // editors backfill).
  languages: string[]
  developers: VideoLink[]
  complexes: VideoLink[]
}
type Manifest = { generatedAt: string; count: number; items: VideoItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_videos.json`

const TTL_MS = 30 * 60 * 1000
let _lastGood: VideoItem[] = []

// YouTube watch/short link → embed form. Editors paste the address straight
// from the browser, so deriving this beats asking them for it; an explicit
// embedUrl on the record still wins.
function ytEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

// revisionedCache: editing a video in /admin/data bumps the `videos`
// revision, which is the only thing that can clear this in-process cache.
export const loadAllVideos = revisionedCache(['videos'], TTL_MS, async (): Promise<VideoItem[]> => {
  try {
    // Tagged fetch so SSG pages (developer, complex, villa, apt detail) stay
    // statically generated — an admin edit invalidates the tag. Plain
    // cache: 'no-store' would mark this revalidate: 0, forcing every page
    // that uses it dynamic and breaking generateStaticParams.
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 1800, tags: ['content:videos'] } })
    if (!r.ok) return _lastGood
    const j = (await r.json()) as Manifest
    const raw = Array.isArray(j.items) ? j.items : []
    const items = raw.map(v => ({ ...v, embedUrl: v.embedUrl || ytEmbed(v.url) }))
    if (items.length) _lastGood = items
    return items
  } catch {
    return _lastGood
  }
})

// A video is shown on a given site language if it's tagged for that
// language, or if it has no language tag at all (treated as universal
// — keeps un-tagged legacy rows visible).
export function matchesLang(v: VideoItem, lang: Lang | undefined): boolean {
  if (!lang) return true
  if (!Array.isArray(v.languages) || v.languages.length === 0) return true
  return v.languages.includes(lang)
}

export async function loadVideosByDeveloperSlug(slug: string, limit = 12, lang?: Lang): Promise<VideoItem[]> {
  const all = await loadAllVideos()
  return all.filter(v => v.developers.some(d => d.slug === slug) && matchesLang(v, lang)).slice(0, limit)
}
export async function loadVideosByComplexSlug(slug: string, limit = 6, lang?: Lang): Promise<VideoItem[]> {
  const all = await loadAllVideos()
  return all.filter(v => v.complexes.some(c => c.slug === slug) && matchesLang(v, lang)).slice(0, limit)
}
// Inheritance: developer page also shows videos of all this developer's complexes.
export async function loadVideosByDeveloperWithComplexes(
  developerSlug: string,
  complexSlugsOfDeveloper: string[],
  limit = 12,
  lang?: Lang,
): Promise<VideoItem[]> {
  const all = await loadAllVideos()
  const complexSet = new Set(complexSlugsOfDeveloper)
  const seen = new Set<string>()
  const out: VideoItem[] = []
  for (const v of all) {
    if (!matchesLang(v, lang)) continue
    const matchDev = v.developers.some(d => d.slug === developerSlug)
    const matchComplex = v.complexes.some(c => c.slug && complexSet.has(c.slug))
    if (!matchDev && !matchComplex) continue
    if (seen.has(v.id)) continue
    seen.add(v.id)
    out.push(v)
    if (out.length >= limit) break
  }
  return out
}
