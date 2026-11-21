// Adapter for raw_* tables: one JSONB `data` column keyed by a TEXT primary
// key (`airtable_id`). The UI's flat `fields` map IS the full `data` blob.
//
// raw_* rows are large (villas ~60 KB × 140 keys), so the grid is
// SERVER-PAGINATED: each list() pulls one page of full rows. Sorting and
// title search run in Postgres via the JSONB path operators.

import type { CollectionConfig, DataSourceAdapter, ListQuery, ListResult, RecordRow } from './types'
import { adminSb } from '../sb'
import { normalizeSlug } from '../../slug-normalize'
import { unitKindOf, unitSlugBase } from '../unit-defaults'

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
  const archive = cfg.softDelete ? [cfg.softDelete.column] : []
  return [pk, 'data', ...columnKeys(cfg), ...archive].join(', ')
}
// Merge `data` keys + exposed column values into one flat field map.
function flatten(cfg: CollectionConfig, r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...((r.data as Record<string, unknown>) ?? {}) }
  for (const k of columnKeys(cfg)) out[k] = r[k]
  // The archive stamp rides along so the panel can say «в архиве» and offer
  // «Восстановить». Collections list it in hideFields, so it is never edited
  // as a plain field.
  if (cfg.softDelete) out[cfg.softDelete.column] = r[cfg.softDelete.column] ?? null
  return out
}

// Timestamp column every write stamps (raw_* → synced_at). parser_units has
// no synced_at, and writing one made every edit there fail.
function touchColumn(cfg: CollectionConfig): string {
  return cfg.touchColumn ?? 'synced_at'
}

// Where the previous publication flag is parked while a row is archived, so
// «Восстановить» returns it exactly as it was (an unpublished draft stays one).
const ARCHIVED_PUBLISHED_KEY = '_archived_published'

export const sqlJsonbAdapter: DataSourceAdapter = {
  async list(cfg, q: ListQuery): Promise<ListResult> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const page = q.page ?? 0
    const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE
    let query = adminSb().from(cfg.table!).select(selectList(cfg), { count: 'exact' })
    if (cfg.softDelete) {
      const col = cfg.softDelete.column
      query = q.archived ? query.not(col, 'is', null) : query.is(col, null)
    }

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
    const id = cfg.createIdFrom ? composedId(cfg.createIdFrom, fields) : `adm_${randomId()}`
    const cols = new Set(columnKeys(cfg))
    const dataFields: Record<string, unknown> = {}
    const colFields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) (cols.has(k) ? colFields : dataFields)[k] = v
    const title = typeof fields[cfg.titleField] === 'string' ? (fields[cfg.titleField] as string) : null
    // Units get a catalogue-shaped slug (`swoi-berawa-197m2-3-bedroom`) built
    // from the complex/district/area facts rather than a transliteration of
    // the whole headline, which would read `villa-maison-verde-v-…-balinsky`.
    const kind = unitKindOf(cfg)
    const slugBase = (kind ? unitSlugBase(kind, fields) : '') || normalizeSlug(title)
    // A row whose slug column is empty is unreachable — the detail page
    // resolves /o/<slug> through the slug index. Derive one from the title
    // rather than silently creating a 404.
    if (cols.has('slug') && !colFields.slug) {
      colFields.slug = slugBase || id
    }
    // Same trap one level down: developers, villas and apartments keep their
    // public slug INSIDE the `data` blob (`SEO:Slug`), and every consumer drops
    // a row without one — the catalogue (app/ru/zastrojshhiki/_catalog.tsx),
    // the slug index (lib/admin/detail-index.ts) and the complex page's unit
    // list. Such a record was invisible on the site however complete and
    // published it was.
    const slugKey = cfg.slugField
    if (slugKey && !cols.has(slugKey) && !asText(dataFields[slugKey])) {
      dataFields[slugKey] = await freeSlug(cfg, slugKey, slugBase || id)
    }
    const insert: Record<string, unknown> = { [pk]: id, data: dataFields, ...colFields, [touchColumn(cfg)]: new Date().toISOString() }
    const { error } = await adminSb().from(cfg.table!).insert(insert)
    if (error) {
      // A composed key collides when the same unit is entered twice — say so
      // in words rather than surfacing the Postgres constraint name.
      if (cfg.createIdFrom && error.code === '23505') throw new Error(`Запись ${id} уже есть`)
      throw new Error(error.message)
    }
    return { id, fields }
  },

  async update(cfg, id, patch): Promise<void> {
    const pk = cfg.primaryKey ?? 'airtable_id'
    const sb = adminSb()
    const cols = new Set(columnKeys(cfg))
    const dataPatch: Record<string, unknown> = {}
    const colPatch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) (cols.has(k) ? colPatch : dataPatch)[k] = v

    const update: Record<string, unknown> = { [touchColumn(cfg)]: new Date().toISOString(), ...colPatch }
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
    if (cfg.softDelete) {
      // Archive, never delete: complexes, villas, news and managers point at a
      // developer by name and slug, so a hard delete would orphan them with no
      // way back. Unpublishing takes the row off every public page.
      const sb = adminSb()
      const { data: existing, error: readErr } = await sb
        .from(cfg.table!).select('data').eq(pk, id).maybeSingle()
      if (readErr) throw new Error(readErr.message)
      if (!existing) throw new Error('not_found')
      const data = { ...((existing as { data?: Record<string, unknown> }).data ?? {}) }
      if (cfg.publishedField) {
        data[ARCHIVED_PUBLISHED_KEY] = data[cfg.publishedField] ?? null
        data[cfg.publishedField] = false
      }
      const now = new Date().toISOString()
      const { error } = await sb.from(cfg.table!)
        .update({ data, [cfg.softDelete.column]: now, [touchColumn(cfg)]: now })
        .eq(pk, id)
      if (error) throw new Error(error.message)
      return
    }
    const { error } = await adminSb().from(cfg.table!).delete().eq(pk, id)
    if (error) throw new Error(error.message)
  },

  async restore(cfg, id): Promise<void> {
    if (!cfg.softDelete) throw new Error('restore_not_supported')
    const pk = cfg.primaryKey ?? 'airtable_id'
    const sb = adminSb()
    const { data: existing, error: readErr } = await sb
      .from(cfg.table!).select('data').eq(pk, id).maybeSingle()
    if (readErr) throw new Error(readErr.message)
    if (!existing) throw new Error('not_found')
    const data = { ...((existing as { data?: Record<string, unknown> }).data ?? {}) }
    if (cfg.publishedField && ARCHIVED_PUBLISHED_KEY in data) {
      data[cfg.publishedField] = data[ARCHIVED_PUBLISHED_KEY]
    }
    delete data[ARCHIVED_PUBLISHED_KEY]
    const { error } = await sb.from(cfg.table!)
      .update({ data, [cfg.softDelete.column]: null, [touchColumn(cfg)]: new Date().toISOString() })
      .eq(pk, id)
    if (error) throw new Error(error.message)
  },
}

// Primary key built from the record's own fields (parser_units:
// `<complex_id>#<gid>#<Name>`). Every part is required — a key with a blank
// segment would collide with the next unit entered the same way.
function composedId(keys: string[], fields: Record<string, unknown>): string {
  const parts = keys.map(k => {
    const v = fields[k]
    return typeof v === 'number' ? String(v) : asText(v)
  })
  const missing = keys.filter((_, i) => !parts[i])
  if (missing.length) throw new Error(`Заполните: ${missing.join(', ')}`)
  return parts.join('#')
}

function asText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

// First slug in the `base`, `base-2`, `base-3`… series that no row of this
// table holds yet. Two developers with the same slug would make one of them
// unreachable, so the collision has to be resolved at write time.
async function freeSlug(cfg: CollectionConfig, slugKey: string, base: string): Promise<string> {
  const sb = adminSb()
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const { data, error } = await sb
      .from(cfg.table!)
      .select(cfg.primaryKey ?? 'airtable_id')
      .eq(jsonPath(slugKey), candidate)
      .limit(1)
    // A failed lookup must not block the save — a duplicate slug is still
    // better than a row with none at all.
    if (error) return candidate
    if (!data?.length) return candidate
  }
  return `${base}-${Date.now()}`
}

// adm_-prefixed ids mark admin-created rows so the sync prune skips them.
function randomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
