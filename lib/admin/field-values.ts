// Option lists for enum / multienum fields, derived from the data itself.
//
// Hardcoding the choices would go stale the moment an editor introduces a new
// status or unit type, and these tables carry ~140 keys across ten
// collections — nobody is going to maintain that list by hand. So we read the
// values already present in the column and offer those, most-used first. The
// editor can still type something new; it simply joins the list next time.
//
// Only ONE key is projected per request (`data->'Статус'`, not `data`), which
// keeps this off the egress-heavy path that full-row scans put us on.

import { adminSb, supabaseUrl } from './sb'
import type { CollectionConfig } from './adapters/types'

const SCAN_LIMIT = 3000
const MAX_OPTIONS = 300
const CACHE_TTL_MS = 5 * 60 * 1000

const _cache = new Map<string, { ts: number; values: string[] }>()

function collect(raw: unknown, into: Map<string, number>): void {
  if (raw == null) return
  if (Array.isArray(raw)) {
    for (const v of raw) collect(v, into)
    return
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    const s = String(raw)
    into.set(s, (into.get(s) ?? 0) + 1)
    return
  }
  if (typeof raw !== 'string') return
  // Some columns hold a single string that is really a list ("Виллы, Апартаменты").
  const parts = raw.includes(',') ? raw.split(',') : [raw]
  for (const p of parts) {
    const s = p.trim()
    if (s) into.set(s, (into.get(s) ?? 0) + 1)
  }
}

async function scan(cfg: CollectionConfig, key: string): Promise<unknown[]> {
  if (cfg.store === 'sql_jsonb') {
    const isColumn = cfg.fields.some(f => f.key === key && f.column)
    const select = isColumn ? key : `v:data->"${key}"`
    const { data, error } = await adminSb().from(cfg.table!).select(select).limit(SCAN_LIMIT)
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(r => (isColumn ? r[key] : r.v))
  }
  if (cfg.store === 'sql_columns') {
    const { data, error } = await adminSb().from(cfg.table!).select(key).limit(SCAN_LIMIT)
    if (error) throw new Error(error.message)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(r => r[key])
  }
  const url = `${supabaseUrl()}/storage/v1/object/public/${cfg.bucket}/${cfg.manifestKey}?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const j = await res.json() as { items?: Record<string, unknown>[] }
  return (j.items ?? []).map(it => it[key])
}

/** Distinct values seen in `key`, most frequent first. */
export async function distinctFieldValues(cfg: CollectionConfig, key: string): Promise<string[]> {
  const cacheKey = `${cfg.key}:${key}`
  const hit = _cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.values

  const counts = new Map<string, number>()
  for (const raw of await scan(cfg, key)) collect(raw, counts)

  const values = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .slice(0, MAX_OPTIONS)
    .map(([v]) => v)

  _cache.set(cacheKey, { ts: Date.now(), values })
  return values
}
