// Lightweight option lists for `link` fields — pick a record from another
// collection by its title. Slim projection (id + title only) so the picker
// stays cheap even on large catalogs.

import { adminSb, supabaseUrl } from './sb'
import type { CollectionConfig } from './adapters/types'

export type Option = { id: string; title: string }

const LIMIT = 50

export async function getOptions(cfg: CollectionConfig, q: string): Promise<Option[]> {
  const needle = q.trim()
  if (cfg.store === 'sql_jsonb') {
    const pk = cfg.primaryKey ?? 'airtable_id'
    let query = adminSb().from(cfg.table!).select(`${pk}, t:data->>"${cfg.titleField}"`)
    if (needle) query = query.ilike(`data->>"${cfg.titleField}"`, `%${needle}%`)
    const { data, error } = await query.limit(LIMIT)
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map(r => ({ id: String(r[pk]), title: String(r.t ?? '') }))
      .filter(o => o.title)
  }
  if (cfg.store === 'sql_columns') {
    const pk = cfg.primaryKey ?? 'id'
    let query = adminSb().from(cfg.table!).select(`${pk}, ${cfg.titleField}`)
    if (needle) query = query.ilike(cfg.titleField, `%${needle}%`)
    const { data, error } = await query.limit(LIMIT)
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map(r => ({ id: String(r[pk]), title: String(r[cfg.titleField] ?? '') }))
      .filter(o => o.title)
  }
  // storage_manifest
  const bucket = cfg.bucket!, key = cfg.manifestKey!, idKey = cfg.itemIdKey ?? 'id'
  const url = `${supabaseUrl()}/storage/v1/object/public/${bucket}/${key}?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const j = await res.json() as { items?: Record<string, unknown>[] }
  const low = needle.toLowerCase()
  return (j.items ?? [])
    .map(it => ({ id: String(it[idKey] ?? ''), title: String(it[cfg.titleField] ?? '') }))
    .filter(o => o.title && (!needle || o.title.toLowerCase().includes(low)))
    .slice(0, LIMIT)
}

// Resolve a set of ids → their titles (for showing current link selections).
export async function resolveTitles(cfg: CollectionConfig, ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const out: Record<string, string> = {}
  if (cfg.store === 'sql_jsonb') {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const { data } = await adminSb().from(cfg.table!).select(`${pk}, t:data->>"${cfg.titleField}"`).in(pk, ids)
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) out[String(r[pk])] = String(r.t ?? '')
  } else if (cfg.store === 'sql_columns') {
    const pk = cfg.primaryKey ?? 'id'
    const { data } = await adminSb().from(cfg.table!).select(`${pk}, ${cfg.titleField}`).in(pk, ids)
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) out[String(r[pk])] = String(r[cfg.titleField] ?? '')
  } else {
    const opts = await getOptions(cfg, '')
    for (const o of opts) if (ids.includes(o.id)) out[o.id] = o.title
  }
  return out
}
