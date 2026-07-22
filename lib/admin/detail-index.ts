// Keep the slug → id indexes in step with admin edits.
//
// Detail pages resolve by slug through `feeds/_<kind>-index.json` (villas,
// apartments, complexes) rather than scanning the raw_* tables. That file used
// to be rebuilt only by scripts/sync-detail-indexes.mjs on the Airtable cron —
// so a complex created or re-slugged in the admin 404'd until the next run.
// Now that Supabase is the source of truth, every mutation patches its own
// entry here. The full rebuild script stays as a nightly safety net.
//
// Patching one entry (read → replace → write, ~15 KB) is deliberate: a full
// rebuild re-reads every row of raw_villas (~33 MB) and would make saving a
// single field expensive.

import { adminSb } from './sb'
import { normalizeSlug } from '../slug-normalize'
import type { CollectionConfig } from './adapters/types'

const BUCKET = 'feeds'

type IndexEntry = { id: string; slug: string; district: string | null; aliases?: string[] }
type IndexFile = { generatedAt: string; count: number; items: IndexEntry[] }

// Collections whose detail pages are slug-resolved through an index file.
const INDEXED: Record<string, { key: string; table: string }> = {
  villas: { key: '_villas-index.json', table: 'raw_villas' },
  apartments: { key: '_apartments-index.json', table: 'raw_apartments' },
  complexes: { key: '_complexes-index.json', table: 'raw_complexes' },
}

function firstString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return firstString(v[0])
  return null
}

type RawRow = { airtable_id: string; slug?: string | null; data: Record<string, unknown> }

// Mirrors buildVillaIndex/buildApartmentIndex/buildComplexIndex in
// scripts/sync-detail-indexes.mjs — keep the two in step.
function entryFor(collection: string, row: RawRow): IndexEntry | null {
  const d = row.data ?? {}
  const published = d['Опубликовать'] === true

  let rawSlug: string | null
  let district: string | null
  const aliases: string[] = []

  if (collection === 'complexes') {
    // Complexes carry the slug in a real column, and the index has never
    // filtered on the published flag — the detail page does that itself.
    rawSlug = firstString(row.slug)
    district = firstString(d['Location 2']) ?? firstString(d['Location'])
  } else if (collection === 'villas') {
    if (!published) return null
    rawSlug = firstString(d['SEO:Slug'])
    district = firstString(d['Location 2']) ?? firstString(d['Location'])
  } else {
    if (!published) return null
    rawSlug = firstString(d['SEO:Slug'])
    district = firstString(d['Location filter'])
    // The pre-suffix slug lives in `_slug_alias`; keep it resolvable so old
    // links 301 instead of 404.
    const alias = firstString(d['_slug_alias'])
    if (alias) aliases.push(alias)
  }

  if (!rawSlug) return null
  const slug = normalizeSlug(rawSlug)
  if (!slug || slug.startsWith('-')) return null
  if (rawSlug !== slug) aliases.push(rawSlug)

  return { id: row.airtable_id, slug, district, ...(aliases.length ? { aliases } : {}) }
}

async function readIndex(key: string): Promise<IndexFile | null> {
  const { data, error } = await adminSb().storage.from(BUCKET).download(key)
  if (error || !data) return null
  try {
    return JSON.parse(await data.text()) as IndexFile
  } catch {
    return null
  }
}

/**
 * Refresh one record's entry in its detail index.
 *
 * Pass a deleted record's id and it drops out of the index. Never throws —
 * an index hiccup must not fail the save the editor just made; the nightly
 * rebuild repairs it.
 */
export async function syncDetailIndexEntry(cfg: CollectionConfig, id: string): Promise<void> {
  const spec = INDEXED[cfg.key]
  if (!spec) return

  try {
    const sb = adminSb()
    const [{ data: row }, index] = await Promise.all([
      sb.from(spec.table).select('airtable_id, slug, data').eq('airtable_id', id).maybeSingle(),
      readIndex(spec.key),
    ])
    if (!index || !Array.isArray(index.items)) return

    const entry = row ? entryFor(cfg.key, row as unknown as RawRow) : null
    const items = index.items.filter(it => it.id !== id)
    if (!entry && items.length === index.items.length) return // nothing to change

    const next = entry ? [...items, entry] : items
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), count: next.length, items: next })
    await sb.storage.from(BUCKET).upload(spec.key, payload, {
      contentType: 'application/json',
      upsert: true,
    })
  } catch {
    // Swallowed on purpose — see the doc comment above.
  }
}
