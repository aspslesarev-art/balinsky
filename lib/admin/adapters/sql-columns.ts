// Adapter for plain SQL tables with denormalized columns (no JSONB blob),
// e.g. baliforum_places (PK `slug`). The UI's `fields` map directly to table
// columns.

import type { CollectionConfig, DataSourceAdapter, ListQuery, ListResult, RecordRow } from './types'
import { adminSb } from '../sb'

const MAX_ROWS = 5000

function gridFields(cfg: CollectionConfig) {
  return cfg.fields.filter(f => f.showInGrid && f.type !== 'photos')
}

const isEmpty = (v: unknown) => v == null || v === ''

function sortRows(cfg: CollectionConfig, rows: RecordRow[], sort?: { field: string; dir: 'asc' | 'desc' }) {
  const s = sort ?? cfg.defaultSort
  if (!s) return rows
  const numeric = cfg.fields.find(f => f.key === s.field)?.type === 'number'
  const mul = s.dir === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const av = a.fields[s.field], bv = b.fields[s.field]
    const ae = isEmpty(av), be = isEmpty(bv)
    if (ae && be) return 0
    if (ae) return 1
    if (be) return -1
    if (numeric) return (Number(av) - Number(bv)) * mul
    return String(av).localeCompare(String(bv), 'ru') * mul
  })
}

export const sqlColumnsAdapter: DataSourceAdapter = {
  async list(cfg, q: ListQuery): Promise<ListResult> {
    const pk = cfg.primaryKey ?? 'id'
    const grid = gridFields(cfg)
    const cols = [pk, ...grid.map(f => f.key)].join(',')
    const { data, error, count } = await adminSb()
      .from(cfg.table!)
      .select(cols, { count: 'exact' })
      .limit(MAX_ROWS)
    if (error) throw new Error(error.message)
    const rows: RecordRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map(r => {
      const fields: Record<string, unknown> = {}
      for (const f of grid) fields[f.key] = r[f.key]
      return { id: String(r[pk]), fields }
    })
    return { rows: sortRows(cfg, rows, q.sort), total: count ?? rows.length }
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
