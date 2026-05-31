// Dynamic field resolution — the engine shows EVERY field present in the data
// (Airtable-parity), not a curated subset. The collection config only layers
// nice labels / types / enums / order on top of whatever keys actually exist.

import type { CollectionConfig, FieldDef, FieldType, RecordRow } from './adapters/types'

export function inferType(v: unknown): FieldType {
  if (typeof v === 'boolean') return 'bool'
  if (typeof v === 'number') return 'number'
  if (v !== null && typeof v === 'object') return 'json'
  if (typeof v === 'string' && v.length > 120) return 'longtext'
  return 'text'
}

function inferTypeFromRows(rows: RecordRow[], key: string): FieldType {
  for (const r of rows) {
    const v = r.fields[key]
    if (v !== null && v !== undefined && v !== '') return inferType(v)
  }
  return 'text'
}

// Ordered column/field list covering ALL keys present across `rows`, with
// config-declared fields first (their labels/types win), then any remaining
// data keys appended alphabetically with an inferred type.
export function resolveFields(cfg: CollectionConfig, rows: RecordRow[]): FieldDef[] {
  const known = new Map(cfg.fields.map(f => [f.key, f]))
  const out: FieldDef[] = cfg.fields.filter(f => f.type !== 'photos').map(f => ({ ...f }))
  const seen = new Set(known.keys())
  const extra = new Set<string>()
  for (const r of rows) for (const k of Object.keys(r.fields)) {
    if (!seen.has(k) && !extra.has(k)) extra.add(k)
  }
  for (const k of [...extra].sort((a, b) => a.localeCompare(b, 'ru'))) {
    out.push({ key: k, label: k, type: inferTypeFromRows(rows, k) })
  }
  return out
}

// Field defs for a single record's editor: every config field (so empty ones
// can still be filled) plus any extra keys the record itself carries.
export function resolveRecordFields(cfg: CollectionConfig, fields: Record<string, unknown>): FieldDef[] {
  const out: FieldDef[] = cfg.fields.filter(f => f.type !== 'photos').map(f => ({ ...f }))
  const seen = new Set(cfg.fields.map(f => f.key))
  for (const k of Object.keys(fields).sort((a, b) => a.localeCompare(b, 'ru'))) {
    if (seen.has(k)) continue
    out.push({ key: k, label: k, type: inferType(fields[k]) })
  }
  return out
}
