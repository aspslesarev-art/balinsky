import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Lightweight complex name → slug index. News items reference a complex only
// by display name (complexNames), with no slug — this resolves that name to
// the complex card slug so a news page can canonical to it (TASK-13a).
// Egress-light: projects slug + name only. Cached 10 min.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

// One cached query, both directions: name→slug (for canonical/link
// resolution) and slug→name (so a resolved slug can be turned back into
// the true `Project` name to match units by — complexNames often carries
// a developer name, so the slug is the reliable anchor). Egress-light:
// projects slug + name only. Cached 10 min.
const loadComplexIndex = unstable_cache(
  async (): Promise<{ nameToSlug: Record<string, string>; slugToName: Record<string, string> }> => {
    const { data, error } = await sb
      .from('raw_complexes')
      .select('slug, name:data->Project')
      .limit(500)
    if (error) throw new Error(`raw_complexes name index: ${error.message}`)
    const rows = (data ?? []) as { slug: string | null; name: string | null }[]
    if (rows.length === 0) throw new Error('raw_complexes returned 0 rows — refusing to cache empty')
    const nameToSlug: Record<string, string> = {}
    const slugToName: Record<string, string> = {}
    for (const r of rows) {
      if (!r.slug || !r.name) continue
      const key = r.name.trim().toLowerCase()
      if (!(key in nameToSlug)) nameToSlug[key] = r.slug
      if (!(r.slug in slugToName)) slugToName[r.slug] = r.name.trim()
    }
    return { nameToSlug, slugToName }
  },
  ['complex-index-v3'],
  { revalidate: 600, tags: ['content:complexes'] },
)

async function loadComplexNameToSlug(): Promise<Record<string, string>> {
  return (await loadComplexIndex()).nameToSlug
}

/** Resolve a complex display name to its card slug (exact, case-insensitive). */
export async function complexSlugByName(name: string | null | undefined): Promise<string | null> {
  if (!name || !name.trim()) return null
  try {
    const map = await loadComplexNameToSlug()
    return map[name.trim().toLowerCase()] ?? null
  } catch {
    return null
  }
}

/**
 * Resolve free text (e.g. a news title) to a complex slug by finding the
 * longest complex name that appears as a substring — same logic villa pages
 * use for findParentComplex. More reliable for news than the complexNames
 * field, which often carries developer names. Length-guarded (≥5 chars) to
 * avoid spurious matches; returns null when nothing confident matches, so a
 * canonical is only ever set to a genuine parent.
 */
export async function complexSlugForText(...texts: (string | null | undefined)[]): Promise<string | null> {
  const hay = texts.filter(Boolean).join(' ').toLowerCase()
  if (!hay) return null
  try {
    const map = await loadComplexNameToSlug()
    let best: { slug: string; len: number } | null = null
    for (const [name, slug] of Object.entries(map)) {
      if (name.length < 5) continue
      if (hay.includes(name) && (!best || name.length > best.len)) best = { slug, len: name.length }
    }
    return best?.slug ?? null
  } catch {
    return null
  }
}

/** Resolve a complex card slug back to its canonical `Project` display name. */
export async function complexNameBySlug(slug: string | null | undefined): Promise<string | null> {
  if (!slug || !slug.trim()) return null
  try {
    const { slugToName } = await loadComplexIndex()
    return slugToName[slug.trim()] ?? null
  } catch {
    return null
  }
}
