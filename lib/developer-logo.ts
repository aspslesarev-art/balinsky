import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Developer logo lookup by SEO:Slug. News / promo / event items already carry
// the developer's name + route slug in their manifest; this only fills in the
// logo so a content page can render the same rich developer card the complex
// page shows. Egress-light: projects slug + logo_url + published only.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

const loadLogoIndex = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await sb
      .from('raw_developers')
      .select(`
        logo_url,
        slug:data->"SEO:Slug",
        published:data->"Публикация"
      `)
      .limit(300)
    if (error) throw new Error(`raw_developers logo index: ${error.message}`)
    const rows = (data ?? []) as { logo_url: string | null; slug: string | null; published: boolean | null }[]
    if (rows.length === 0) throw new Error('raw_developers returned 0 rows — refusing to cache empty')
    const map: Record<string, string> = {}
    for (const r of rows) {
      if (r.published !== true || !r.slug || !r.logo_url) continue
      if (!(r.slug in map)) map[r.slug] = r.logo_url
    }
    return map
  },
  ['developer-logo-by-slug-v1'],
  { revalidate: 600 },
)

/** Resolve a developer route slug to its logo URL, or null. */
export async function developerLogoBySlug(slug: string | null | undefined): Promise<string | null> {
  if (!slug || !slug.trim()) return null
  try {
    const map = await loadLogoIndex()
    return map[slug.trim()] ?? null
  } catch {
    return null
  }
}
