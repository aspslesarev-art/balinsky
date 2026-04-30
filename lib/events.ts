export type EventDev = { name: string; slug: string | null }
export type EventItem = {
  id: string
  slug: string
  title: string
  seoDescription: string | null
  body: string | null
  startsAt: string | null
  endsAt: string | null
  photo: string | null
  format: string | null
  locationUrl: string | null
  registerUrl: string | null
  videoUrl: string | null
  pinned: boolean
  developers: EventDev[]
}
type Manifest = { generatedAt: string; count: number; items: EventItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/events/_events.json`

const TTL_MS = 10 * 60 * 1000
let _cache: { ts: number; data: EventItem[] } | null = null
let _inflight: Promise<EventItem[]> | null = null

export async function loadAllEvents(): Promise<EventItem[]> {
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
export async function loadEventBySlug(slug: string): Promise<EventItem | null> {
  const all = await loadAllEvents()
  return all.find(e => e.slug === slug) ?? null
}
