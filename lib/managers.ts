export type ManagerItem = {
  id: string
  name: string
  photo: string | null
  telegram: string | null
  telegramHandle: string | null
  whatsapp: string | null
  botRequest: string | null
  rating: number | null
  languages: string[]
  developerSlugs: string[]
  developerNames: string[]
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

// Returns the highest-rated manager for the given developer slug, or any one
// if ratings are missing. Null when no manager is linked to that developer.
export async function loadManagerByDeveloperSlug(devSlug: string | null | undefined): Promise<ManagerItem | null> {
  if (!devSlug) return null
  const all = await loadAllManagers()
  return pickBest(all.filter(m => m.developerSlugs.includes(devSlug)))
}

export async function loadManagerByDeveloperName(devName: string | null | undefined): Promise<ManagerItem | null> {
  if (!devName) return null
  const lc = devName.trim().toLowerCase()
  if (!lc) return null
  const all = await loadAllManagers()
  return pickBest(all.filter(m => m.developerNames.some(n => n.toLowerCase() === lc)))
}

function pickBest(matches: ManagerItem[]): ManagerItem | null {
  if (matches.length === 0) return null
  return [...matches].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
}
