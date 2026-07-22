// Records written by hand in /admin/data only carry the fields the editor
// actually filled in, so an optional list can simply be absent — the Airtable
// sync used to guarantee every key existed. One manager saved without
// developers took every /zastrojshhiki/<slug> page down with a 500.
function asList<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : []
}

export type ManagerItem = {
  id: string
  name: string
  // EN counterparts populated from `Name En` / `Языки En` in Airtable.
  // Null / empty array when the editor hasn't filled them in yet — the
  // UI falls back to the RU values.
  nameEn?: string | null
  photo: string | null
  telegram: string | null
  telegramHandle: string | null
  whatsapp: string | null
  botRequest: string | null
  rating: number | null
  languages: string[]
  languagesEn?: string[]
  developerSlugs: string[]
  developerNames: string[]
  // Free-text credentials line ("Сертифицированный агент, 5 лет на
  // Бали") shown under the manager's name on the contact card.
  regalia?: string | null
}
type Manifest = { generatedAt: string; count: number; items: ManagerItem[] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/managers/_managers.json`

export async function loadAllManagers(): Promise<ManagerItem[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 600, tags: ['content:managers'] } })
    if (!r.ok) return []
    const j = (await r.json()) as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}

// Returns every manager linked to the given developer slug, sorted by
// rating descending (ties: leave Airtable order). Empty array when
// none. Detail pages render a card per manager — many developers have
// 2–3 people on rotation and the visitor should see all of them.
export async function loadManagersByDeveloperSlug(devSlug: string | null | undefined): Promise<ManagerItem[]> {
  if (!devSlug) return []
  const all = await loadAllManagers()
  return sortByRating(all.filter(m => asList(m.developerSlugs).includes(devSlug)))
}

export async function loadManagersByDeveloperName(devName: string | null | undefined): Promise<ManagerItem[]> {
  if (!devName) return []
  const lc = devName.trim().toLowerCase()
  if (!lc) return []
  const all = await loadAllManagers()
  return sortByRating(all.filter(m => asList(m.developerNames).some(n => n.toLowerCase() === lc)))
}

function sortByRating(matches: ManagerItem[]): ManagerItem[] {
  return [...matches].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
}
