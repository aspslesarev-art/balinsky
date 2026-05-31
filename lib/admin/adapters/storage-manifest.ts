// Adapter for content collections stored as a single Storage JSON manifest
// ({ generatedAt, count, items: [] }) rather than SQL rows — news, events,
// promo, rental, knowledge, managers. CRUD reads the whole file, mutates the
// items array, and rewrites it (last-write-wins).

import type { CollectionConfig, DataSourceAdapter, ListQuery, ListResult, RecordRow } from './types'
import { adminSb, supabaseUrl } from '../sb'

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
    const item: Record<string, unknown> = { ...fields, [idKey]: id }
    items.unshift(item)
    await saveItems(cfg, items)
    return { id, fields: item }
  },

  async update(cfg, id, patch): Promise<void> {
    const { idKey } = loc(cfg)
    const items = await loadItems(cfg)
    const idx = items.findIndex(it => String(it[idKey] ?? '') === id)
    if (idx < 0) throw new Error('not_found')
    items[idx] = { ...items[idx], ...patch }
    await saveItems(cfg, items)
  },

  async remove(cfg, id): Promise<void> {
    const { idKey } = loc(cfg)
    const items = await loadItems(cfg)
    const next = items.filter(it => String(it[idKey] ?? '') !== id)
    await saveItems(cfg, next)
  },
}
