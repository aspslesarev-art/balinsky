// Per-section EN translation cache stored as JSON in Supabase Storage.
// Each section file (`_translations-<section>.json`) is shaped as:
//   { [airtable_id]: { [field_name]: "english translation" } }
//
// The catalog loaders call `mergeEnTranslations` on each row's data
// blob before handing it to consumers — the existing tField() lookup
// then sees `<field> EN` populated and renders the translation
// without any caller-side changes.
//
// Cached in-process for TTL_MS; transient Supabase blips fall back to
// the last good copy so we never strip translations off a page mid-flight.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const TTL_MS = 5 * 60 * 1000

export type Section =
  | 'villas'
  | 'apartments'
  | 'complexes'
  | 'developers'

type SectionCache = Record<string, Record<string, string>>

const _cache: Map<Section, { ts: number; data: SectionCache }> = new Map()
const _inflight: Map<Section, Promise<SectionCache>> = new Map()

function publicUrl(section: Section): string {
  return `${SUPABASE_URL}/storage/v1/object/public/feeds/_translations-${section}.json`
}

async function fetchOnce(section: Section): Promise<SectionCache> {
  try {
    const r = await fetch(publicUrl(section), {
      // Section cache files are small (sub-MB) and only change when
      // we re-run translate-missing-en — give Next.js room to ISR them.
      next: { revalidate: 300, tags: [`translations:${section}`] },
    })
    if (!r.ok) return _cache.get(section)?.data ?? {}
    const j = (await r.json()) as SectionCache
    _cache.set(section, { ts: Date.now(), data: j })
    return j
  } catch {
    return _cache.get(section)?.data ?? {}
  }
}

export async function loadEnTranslations(section: Section): Promise<SectionCache> {
  const hit = _cache.get(section)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data
  let p = _inflight.get(section)
  if (!p) {
    p = fetchOnce(section).finally(() => _inflight.delete(section))
    _inflight.set(section, p)
  }
  return p
}

/**
 * Merge translation cache into a row's data blob. Keys are written as
 * `<field> EN` (matching the Airtable convention tField already
 * recognises) and only set when the slot is empty — Airtable's own EN
 * column always wins over the cache.
 */
export function mergeEnTranslations(
  data: Record<string, unknown>,
  airtableId: string,
  cache: SectionCache,
): Record<string, unknown> {
  const tr = cache[airtableId]
  if (!tr) return data
  const out = { ...data }
  for (const [field, en] of Object.entries(tr)) {
    if (!en) continue
    const slot = `${field} EN`
    // Airtable EN slot already has content — leave it alone.
    const existing = out[slot]
    if (typeof existing === 'string' && existing.trim()) continue
    if (existing && typeof existing === 'object' && 'value' in (existing as { value?: unknown })) {
      const v = (existing as { value: unknown }).value
      if (typeof v === 'string' && v.trim()) continue
    }
    out[slot] = en
  }
  return out
}
