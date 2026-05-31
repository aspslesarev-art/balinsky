// Adapter for raw_* tables: one JSONB `data` column keyed by a TEXT primary
// key (`airtable_id`). The UI's flat `fields` map IS the `data` blob.
//
// Egress: the grid pulls only `showInGrid` keys via a JSONB projection
// (`gN:data->"Key"`), mirroring VILLA_SELECT in app/ru/villy/_lib.ts:629.
// Full `data` is fetched only by get() for the side panel.

import type { CollectionConfig, DataSourceAdapter, ListQuery, ListResult, RecordRow } from './types'
import { adminSb } from '../sb'

// Hard cap on grid rows loaded at once. Current catalogs are < 1000 rows; the
// projection keeps each row tiny so loading all of them is cheap. If a table
// ever exceeds this, the grid shows the cap and we add server pagination.
const MAX_ROWS = 3000

function gridFields(cfg: CollectionConfig) {
  return cfg.fields.filter(f => f.showInGrid && f.type !== 'photos')
}

function projection(cfg: CollectionConfig): string {
  const pk = cfg.primaryKey ?? 'airtable_id'
  const cols = gridFields(cfg).map((f, i) => `g${i}:data->"${f.key}"`)
  return [pk, ...cols].join(',')
}

const isEmpty = (v: unknown) => v == null || v === ''

// Comparator that keeps empty values last regardless of sort direction.
function compareFor(cfg: CollectionConfig, field: string, dir: 'asc' | 'desc') {
  const def = cfg.fields.find(f => f.key === field)
  const numeric = def?.type === 'number'
  const mul = dir === 'desc' ? -1 : 1
  return (a: unknown, b: unknown): number => {
    const ae = isEmpty(a), be = isEmpty(b)
    if (ae && be) return 0
    if (ae) return 1
    if (be) return -1
    if (numeric) return (Number(a) - Number(b)) * mul
    return String(a).localeCompare(String(b), 'ru') * mul
  }
}

export const sqlJsonbAdapter: DataSourceAdapter = {
  async list(cfg, q: ListQuery): Promise<ListResult> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const grid = gridFields(cfg)
    const { data, error, count } = await adminSb()
      .from(cfg.table!)
      .select(projection(cfg), { count: 'exact' })
      .limit(MAX_ROWS)
    if (error) throw new Error(error.message)
    const rows: RecordRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map(raw => {
      const fields: Record<string, unknown> = {}
      grid.forEach((f, i) => { fields[f.key] = raw[`g${i}`] })
      return { id: String(raw[pk]), fields }
    })
    const sort = q.sort ?? cfg.defaultSort
    if (sort) {
      const cmp = compareFor(cfg, sort.field, sort.dir)
      rows.sort((a, b) => cmp(a.fields[sort.field], b.fields[sort.field]))
    }
    return { rows, total: count ?? rows.length }
  },

  async get(cfg, id): Promise<RecordRow | null> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const { data, error } = await adminSb()
      .from(cfg.table!)
      .select(`${pk}, data`)
      .eq(pk, id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    const row = data as { data?: Record<string, unknown> }
    return { id, fields: { ...(row.data ?? {}) } }
  },

  async create(cfg, fields): Promise<RecordRow> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const id = `adm_${randomId()}`
    const insert: Record<string, unknown> = { [pk]: id, data: fields, synced_at: new Date().toISOString() }
    const { error } = await adminSb().from(cfg.table!).insert(insert)
    if (error) throw new Error(error.message)
    return { id, fields }
  },

  async update(cfg, id, patch): Promise<void> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const sb = adminSb()
    // Read-modify-write: merge the patch into the existing `data` blob so we
    // never drop un-modelled Airtable keys the panel didn't show.
    const { data: existing, error: readErr } = await sb
      .from(cfg.table!).select('data').eq(pk, id).maybeSingle()
    if (readErr) throw new Error(readErr.message)
    const merged = { ...((existing as { data?: Record<string, unknown> } | null)?.data ?? {}), ...patch }
    const { error } = await sb
      .from(cfg.table!)
      .update({ data: merged, synced_at: new Date().toISOString() })
      .eq(pk, id)
    if (error) throw new Error(error.message)
  },

  async remove(cfg, id): Promise<void> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const { error } = await adminSb().from(cfg.table!).delete().eq(pk, id)
    if (error) throw new Error(error.message)
  },
}

// adm_-prefixed ids mark admin-created rows so the sync prune can skip them
// (see scripts/sync-*-data.mjs once SYNC_DISABLED work lands). Random, not
// time-based, so concurrent inserts don't collide.
function randomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
