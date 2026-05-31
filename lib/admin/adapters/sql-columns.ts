// Adapter for plain SQL tables with denormalized columns (no JSONB blob),
// e.g. baliforum_places (PK `slug`). The UI's `fields` map directly to table
// columns.

import type { DataSourceAdapter, ListQuery, ListResult, RecordRow } from './types'
import { adminSb } from '../sb'

export const sqlColumnsAdapter: DataSourceAdapter = {
  async list(cfg, q: ListQuery): Promise<ListResult> {
    const pk = cfg.primaryKey ?? 'id'
    const page = q.page ?? 0
    const pageSize = q.pageSize ?? 50
    let query = adminSb().from(cfg.table!).select('*', { count: 'exact' })
    if (q.q && q.q.trim()) query = query.ilike(cfg.titleField, `%${q.q.trim()}%`)
    if (q.sort) query = query.order(q.sort.field, { ascending: q.sort.dir === 'asc', nullsFirst: false })
    else query = query.order(pk, { ascending: true })
    query = query.range(page * pageSize, page * pageSize + pageSize - 1)
    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    const rows: RecordRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map(r => ({
      id: String(r[pk]),
      fields: { ...r },
    }))
    return { rows, total: count ?? rows.length }
  },

  async get(cfg, id): Promise<RecordRow | null> {
    const pk = cfg.primaryKey ?? 'id'
    const { data, error } = await adminSb().from(cfg.table!).select('*').eq(pk, id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    return { id, fields: { ...(data as Record<string, unknown>) } }
  },

  async create(cfg, fields): Promise<RecordRow> {
    const pk = cfg.primaryKey ?? 'id'
    const { error } = await adminSb().from(cfg.table!).insert(fields)
    if (error) throw new Error(error.message)
    return { id: String(fields[pk] ?? ''), fields }
  },

  async update(cfg, id, patch): Promise<void> {
    const pk = cfg.primaryKey ?? 'id'
    const { error } = await adminSb().from(cfg.table!).update(patch).eq(pk, id)
    if (error) throw new Error(error.message)
  },

  async remove(cfg, id): Promise<void> {
    const pk = cfg.primaryKey ?? 'id'
    const { error } = await adminSb().from(cfg.table!).delete().eq(pk, id)
    if (error) throw new Error(error.message)
  },
}
