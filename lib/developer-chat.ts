import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Resolve which Telegram chat a website lead should go to. A developer's chat
// id lives in raw_developers.telegram_chat_id (set via /admin/data). Leads that
// arrive with only listing context (villa/apartment/complex slug) get their
// developer resolved from the listing first, then mapped to that chat.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

const norm = (s: string) => s.trim().toLowerCase()

// Cached index: developer name (lowercased) and slug → telegram_chat_id.
// Only developers with a non-empty chat id are included.
const loadChatIndex = unstable_cache(
  async (): Promise<{ byName: Record<string, string>; bySlug: Record<string, string> }> => {
    const { data, error } = await sb
      .from('raw_developers')
      .select(`
        telegram_chat_id,
        name:data->Developer,
        slug:data->"SEO:Slug"
      `)
      .not('telegram_chat_id', 'is', null)
      .limit(500)
    if (error) throw new Error(`raw_developers chat index: ${error.message}`)
    const rows = (data ?? []) as { telegram_chat_id: string | null; name: string | null; slug: string | null }[]
    const byName: Record<string, string> = {}
    const bySlug: Record<string, string> = {}
    for (const r of rows) {
      const chat = (r.telegram_chat_id ?? '').trim()
      if (!chat) continue
      const name = firstString(r.name)
      const slug = firstString(r.slug)
      if (name && !(norm(name) in byName)) byName[norm(name)] = chat
      if (slug && !(slug in bySlug)) bySlug[slug] = chat
    }
    return { byName, bySlug }
  },
  ['developer-lead-chat-index-v1'],
  { revalidate: 300, tags: ['content:developers'] },
)

/** Telegram chat id for a developer identified by name and/or slug, or null. */
export async function developerChatId(dev: { name?: string | null; slug?: string | null }): Promise<string | null> {
  if (!dev.name && !dev.slug) return null
  try {
    const { byName, bySlug } = await loadChatIndex()
    if (dev.slug && bySlug[dev.slug.trim()]) return bySlug[dev.slug.trim()]
    if (dev.name && byName[norm(dev.name)]) return byName[norm(dev.name)]
    return null
  } catch {
    return null
  }
}

const LISTING_TABLE: Record<string, string> = {
  villa: 'raw_villas',
  apartment: 'raw_apartments',
  complex: 'raw_complexes',
}

// Resolve the developer name for a listing (by kind + slug), so a lead placed
// on a listing page routes to that listing's developer. Complexes carry the
// slug in a real column; villas/apartments keep it in data."SEO:Slug".
export async function resolveListingDeveloperName(
  kind: string | null | undefined,
  slug: string | null | undefined,
): Promise<string | null> {
  if (!kind || !slug) return null
  const table = LISTING_TABLE[kind]
  if (!table) return null
  try {
    const sel = `dev1:data->Developer1, dev:data->Developer`
    const base = sb.from(table).select(sel)
    const { data, error } =
      kind === 'complex'
        ? await base.eq('slug', slug).limit(1).maybeSingle()
        : await base.eq('data->>"SEO:Slug"', slug).limit(1).maybeSingle()
    if (error || !data) return null
    const row = data as { dev1: unknown; dev: unknown }
    return firstString(row.dev1) ?? firstString(row.dev)
  } catch {
    return null
  }
}
