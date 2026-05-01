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

export async function loadAllEvents(): Promise<EventItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:events'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}
export async function loadEventBySlug(slug: string): Promise<EventItem | null> {
  const all = await loadAllEvents()
  return all.find(e => e.slug === slug) ?? null
}
