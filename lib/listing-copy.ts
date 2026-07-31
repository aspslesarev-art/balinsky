// Generated listing copy (scripts/kb-text-regen.mjs → <bucket>/_texts.json):
// SEO title/meta plus a lead, body paragraphs and FAQ, grounded in the row
// facts and in what the vision pass saw in the photos.
//
// Mirrors lib/listing-features.ts: same bucket map, same ISR + in-process cache
// shape, and the same "never throw, fall back to the previous value" policy —
// a listing page must render even when the manifest is briefly unavailable.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export type CopyKind = 'villa' | 'apartment' | 'complex'

const BUCKET: Record<CopyKind, string> = {
  villa: 'villa-photos',
  apartment: 'apartment-photos',
  complex: 'complex-photos',
}

export interface CopyVariant {
  title: string
  meta: string
  lead: string
  body: string[]
  faq: { q: string; a: string }[]
}

export interface CopyEntry {
  lang: string
  model: string
  variants: CopyVariant[]
  best: number
  judge_reason: string | null
  at: string
}

export type CopyManifest = Record<string, CopyEntry>

const _cache = new Map<CopyKind, { ts: number; data: CopyManifest }>()
const TTL = 5 * 60 * 1000

export async function loadCopyManifest(kind: CopyKind): Promise<CopyManifest> {
  const hit = _cache.get(kind)
  if (hit && Date.now() - hit.ts < TTL) return hit.data
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET[kind]}/_texts.json`
    const r = await fetch(url, { next: { revalidate: 3600, tags: [`copy:${kind}`] } })
    if (!r.ok) return _cache.get(kind)?.data ?? {}
    const data = (await r.json()) as CopyManifest
    _cache.set(kind, { ts: Date.now(), data })
    return data
  } catch {
    return _cache.get(kind)?.data ?? {}
  }
}

/** The judge-picked variant for one listing, or null when nothing was generated. */
export async function loadListingCopy(
  kind: CopyKind,
  airtableId: string | null | undefined,
): Promise<CopyVariant | null> {
  if (!airtableId) return null
  const man = await loadCopyManifest(kind)
  return pickVariant(man[airtableId])
}

export function pickVariant(entry: CopyEntry | null | undefined): CopyVariant | null {
  if (!entry || !Array.isArray(entry.variants) || !entry.variants.length) return null
  const i = Number.isInteger(entry.best) && entry.best >= 0 && entry.best < entry.variants.length ? entry.best : 0
  const v = entry.variants[i]
  return v && typeof v.title === 'string' && typeof v.meta === 'string' ? v : null
}
