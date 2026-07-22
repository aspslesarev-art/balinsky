// Adapter for raw_* tables: one JSONB `data` column keyed by a TEXT primary
// key (`airtable_id`). The UI's flat `fields` map IS the full `data` blob.
//
// raw_* rows are large (villas ~60 KB × 140 keys), so the grid is
// SERVER-PAGINATED: each list() pulls one page of full rows. Sorting and
// title search run in Postgres via the JSONB path operators.

import type { CollectionConfig, DataSourceAdapter, ListQuery, ListResult, RecordRow } from './types'
import { adminSb } from '../sb'
import { normalizeSlug } from '../../slug-normalize'

const DEFAULT_PAGE_SIZE = 50

// PostgREST JSONB path for ordering/filtering on a (possibly spaced/colon'd)
// key — double-quote the key so `SEO:Title` / `Location 2` parse correctly.
function jsonPath(key: string): string {
  return `data->>"${key}"`
}

// Real top-level columns this collection exposes alongside the `data` blob
// (e.g. developers.logo_url).
function columnKeys(cfg: CollectionConfig): string[] {
  return cfg.fields.filter(f => f.column).map(f => f.key)
}
function selectList(cfg: CollectionConfig): string {
  const pk = cfg.primaryKey ?? 'airtable_id'
  return [pk, 'data', ...columnKeys(cfg)].join(', ')
}
// Merge `data` keys + exposed column values into one flat field map.
function flatten(cfg: CollectionConfig, r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...((r.data as Record<string, unknown>) ?? {}) }
  for (const k of columnKeys(cfg)) out[k] = r[k]
  return out
}

export const sqlJsonbAdapter: DataSourceAdapter = {
  async list(cfg, q: ListQuery): Promise<ListResult> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const page = q.page ?? 0
    const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE
    let query = adminSb().from(cfg.table!).select(selectList(cfg), { count: 'exact' })

    if (q.q && q.q.trim()) {
      // Search the title field (the realistic "find by name" case).
      query = query.ilike(jsonPath(cfg.titleField), `%${q.q.trim()}%`)
    }
    for (const f of q.filters ?? []) {
      if (f.value) query = query.ilike(jsonPath(f.key), `%${f.value}%`)
    }
    if (q.sort) {
      query = query.order(jsonPath(q.sort.field), { ascending: q.sort.dir === 'asc', nullsFirst: false })
    } else {
      query = query.order(pk, { ascending: true })
    }
    query = query.range(page * pageSize, page * pageSize + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    const rows: RecordRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map(r => ({
      id: String(r[pk]),
      fields: flatten(cfg, r),
    }))
    return { rows, total: count ?? rows.length }
  },

  async get(cfg, id): Promise<RecordRow | null> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const { data, error } = await adminSb()
      .from(cfg.table!)
      .select(selectList(cfg))
      .eq(pk, id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    return { id, fields: flatten(cfg, data as unknown as Record<string, unknown>) }
  },

  async create(cfg, fields): Promise<RecordRow> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const id = `adm_${randomId()}`
    const cols = new Set(columnKeys(cfg))
    const dataFields: Record<string, unknown> = {}
    const colFields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) (cols.has(k) ? colFields : dataFields)[k] = v
    // A row whose slug column is empty is unreachable — the detail page
    // resolves /o/<slug> through the slug index. Derive one from the title
    // rather than silently creating a 404.
    if (cols.has('slug') && !colFields.slug) {
      const title = dataFields[cfg.titleField]
      colFields.slug = normalizeSlug(typeof title === 'string' ? title : null) || id
    }
    const insert: Record<string, unknown> = { [pk]: id, data: dataFields, ...colFields, synced_at: new Date().toISOString() }
    const { error } = await adminSb().from(cfg.table!).insert(insert)
    if (error) throw new Error(error.message)
    return { id, fields }
  },

  async update(cfg, id, patch): Promise<void> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const sb = adminSb()
    const cols = new Set(columnKeys(cfg))
    const dataPatch: Record<string, unknown> = {}
    const colPatch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) (cols.has(k) ? colPatch : dataPatch)[k] = v

    const update: Record<string, unknown> = { synced_at: new Date().toISOString(), ...colPatch }
    if (Object.keys(dataPatch).length) {
      // Read-modify-write the `data` blob so un-edited keys survive.
      const { data: existing, error: readErr } = await sb
        .from(cfg.table!).select('data').eq(pk, id).maybeSingle()
      if (readErr) throw new Error(readErr.message)
      update.data = { ...((existing as { data?: Record<string, unknown> } | null)?.data ?? {}), ...dataPatch }
    }
    const { error } = await sb.from(cfg.table!).update(update).eq(pk, id)
    if (error) throw new Error(error.message)
  },

  async remove(cfg, id): Promise<void> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const { error } = await adminSb().from(cfg.table!).delete().eq(pk, id)
    if (error) throw new Error(error.message)
  },
}

// adm_-prefixed ids mark admin-created rows so the sync prune skips them.
function randomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
