// Adapter for content collections stored as a single Storage JSON manifest
// ({ generatedAt, count, items: [] }) rather than SQL rows — news, events,
// promo, rental, knowledge, managers. CRUD reads the whole file, mutates the
// items array, and rewrites it (last-write-wins).

import type { CollectionConfig, DataSourceAdapter, ListQuery, ListResult, RecordRow } from './types'
import { adminSb, supabaseUrl } from '../sb'
import { slugifyTitle, uniqueSlug } from '@/lib/slugify'

type Manifest = { generatedAt?: string; count?: number; items: Record<string, unknown>[] }

function loc(cfg: CollectionConfig) {
  if (!cfg.bucket || !cfg.manifestKey) throw new Error(`collection '${cfg.key}' missing bucket/manifestKey`)
  return { bucket: cfg.bucket, key: cfg.manifestKey, idKey: cfg.itemIdKey ?? 'id' }
}

async function loadItems(cfg: CollectionConfig): Promise<Record<string, unknown>[]> {
  const { bucket, key } = loc(cfg)
  const url = `${supabaseUrl()}/storage/v1/object/public/${bucket}/${key}?t=${Date.now()}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const j = await res.json() as Manifest
    return Array.isArray(j.items) ? j.items : []
  } catch {
    return []
  }
}

async function saveItems(cfg: CollectionConfig, items: Record<string, unknown>[]): Promise<void> {
  const { bucket, key } = loc(cfg)
  const body = Buffer.from(JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items }))
  const { error } = await adminSb().storage.from(bucket).upload(key, body, {
    contentType: 'application/json', upsert: true, cacheControl: '60',
  })
  if (error) throw new Error(`storage(${bucket}/${key}): ${error.message}`)
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

// Empty arrays for every field the config models as a list.
function emptyLists(cfg: CollectionConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of cfg.fields) {
    if (f.type === 'multienum' || f.type === 'json') out[f.key] = []
  }
  return out
}

const SLUG_KEY = 'slug'
const CREATED_AT_KEY = 'createdAt'

const hasField = (cfg: CollectionConfig, key: string) => cfg.fields.some(f => f.key === key)
const hasSlugField = (cfg: CollectionConfig) => hasField(cfg, SLUG_KEY)

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// Slugs already spoken for, so a derived one never shadows an existing URL.
// Aliases count too — they are live 301 targets (lib/news.ts:85).
function takenSlugs(items: Record<string, unknown>[], skipId?: string, idKey = 'id'): Set<string> {
  const taken = new Set<string>()
  for (const it of items) {
    if (skipId && String(it[idKey] ?? '') === skipId) continue
    const slug = str(it[SLUG_KEY])
    if (slug) taken.add(slug)
    const aliases = it.aliases
    if (Array.isArray(aliases)) for (const a of aliases) if (str(a)) taken.add(str(a))
  }
  return taken
}

/**
 * Derive `slug` from the title when the editor left it blank. Returns null
 * when nothing is needed — an existing slug is never rewritten, because it is
 * the record's indexed URL.
 */
function derivedSlug(
  cfg: CollectionConfig,
  fields: Record<string, unknown>,
  items: Record<string, unknown>[],
  skipId?: string,
): string | null {
  if (!hasSlugField(cfg) || str(fields[SLUG_KEY])) return null
  const base = slugifyTitle(str(fields[cfg.titleField]))
  if (!base) return null
  return uniqueSlug(base, takenSlugs(items, skipId, cfg.itemIdKey ?? 'id')) || null
}

function randomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export const storageManifestAdapter: DataSourceAdapter = {
  async list(cfg, q: ListQuery): Promise<ListResult> {
    const { idKey } = loc(cfg)
    const items = await loadItems(cfg)
    let rows: RecordRow[] = items.map(it => ({ id: String(it[idKey] ?? ''), fields: { ...it } }))
    // Full-table search across every string value (manifest is already in mem).
    if (q.q && q.q.trim()) {
      const needle = q.q.trim().toLowerCase()
      rows = rows.filter(r => Object.values(r.fields).some(v => typeof v === 'string' && v.toLowerCase().includes(needle)))
    }
    for (const f of q.filters ?? []) {
      if (!f.value) continue
      const needle = f.value.toLowerCase()
      rows = rows.filter(r => String(r.fields[f.key] ?? '').toLowerCase().includes(needle))
    }
    rows = sortRows(cfg, rows, q.sort)
    const total = rows.length
    const page = q.page ?? 0
    const pageSize = q.pageSize ?? 50
    return { rows: rows.slice(page * pageSize, page * pageSize + pageSize), total }
  },

  async get(cfg, id): Promise<RecordRow | null> {
    const { idKey } = loc(cfg)
    const items = await loadItems(cfg)
    const item = items.find(it => String(it[idKey] ?? '') === id)
    if (!item) return null
    return { id, fields: { ...item } }
  },

  async create(cfg, fields): Promise<RecordRow> {
    const { idKey } = loc(cfg)
    const items = await loadItems(cfg)
    const id = `adm_${randomId()}`
    // Seed the list-shaped fields the editor left blank. The site iterates
    // these (`m.developerSlugs.includes(...)`), and a record missing one used
    // to be impossible — the sync always wrote every key. One hand-created
    // manager without `developerSlugs` 500'd every developer page.
    const item: Record<string, unknown> = { ...emptyLists(cfg), ...fields, [idKey]: id }
    const slug = derivedSlug(cfg, item, items)
    if (slug) item[SLUG_KEY] = slug
    // Airtable supplied createdTime and the sync copied it across; nothing
    // filled it after the migration. news sorts the grid by `createdAt desc`
    // and sortRows puts blanks last, so every record created here sank to the
    // bottom of the list instead of the top.
    if (hasField(cfg, CREATED_AT_KEY) && !str(item[CREATED_AT_KEY])) {
      item[CREATED_AT_KEY] = new Date().toISOString()
    }
    items.unshift(item)
    await saveItems(cfg, items)
    return { id, fields: item }
  },

  async update(cfg, id, patch): Promise<void> {
    const { idKey } = loc(cfg)
    const items = await loadItems(cfg)
    const idx = items.findIndex(it => String(it[idKey] ?? '') === id)
    if (idx < 0) throw new Error('not_found')
    const next = { ...items[idx], ...patch }
    // Backfills records saved before slugs were derived, and re-fills one an
    // editor blanked out. A slug that is already set stays untouched.
    const slug = derivedSlug(cfg, next, items, id)
    if (slug) next[SLUG_KEY] = slug
    items[idx] = next
    await saveItems(cfg, items)
  },

  async remove(cfg, id): Promise<void> {
    const { idKey } = loc(cfg)
    const items = await loadItems(cfg)
    const next = items.filter(it => String(it[idKey] ?? '') !== id)
    await saveItems(cfg, next)
  },
}
