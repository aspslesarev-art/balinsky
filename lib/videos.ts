export type VideoLink = { name: string; slug: string | null }
export type VideoItem = {
  id: string
  name: string | null
  url: string
  embedUrl: string | null
  addedAt: string | null
  developers: VideoLink[]
  complexes: VideoLink[]
}
type Manifest = { generatedAt: string; count: number; items: VideoItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_videos.json`

const TTL_MS = 30 * 60 * 1000
let _cache: { ts: number; data: VideoItem[] } | null = null
let _inflight: Promise<VideoItem[]> | null = null

export async function loadAllVideos(): Promise<VideoItem[]> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      const r = await fetch(MANIFEST_URL, { next: { revalidate: 1800 } })
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

export async function loadVideosByDeveloperSlug(slug: string, limit = 12): Promise<VideoItem[]> {
  const all = await loadAllVideos()
  return all.filter(v => v.developers.some(d => d.slug === slug)).slice(0, limit)
}
export async function loadVideosByComplexSlug(slug: string, limit = 6): Promise<VideoItem[]> {
  const all = await loadAllVideos()
  return all.filter(v => v.complexes.some(c => c.slug === slug)).slice(0, limit)
}
// Inheritance: developer page also shows videos of all this developer's complexes.
export async function loadVideosByDeveloperWithComplexes(
  developerSlug: string,
  complexSlugsOfDeveloper: string[],
  limit = 12,
): Promise<VideoItem[]> {
  const all = await loadAllVideos()
  const complexSet = new Set(complexSlugsOfDeveloper)
  const seen = new Set<string>()
  const out: VideoItem[] = []
  for (const v of all) {
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
