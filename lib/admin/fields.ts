// Dynamic field resolution — the engine shows EVERY field present in the data
// (Airtable-parity), not a curated subset. The collection config only layers
// nice labels / types / enums / order on top of whatever keys actually exist.

import type { CollectionConfig, FieldDef, FieldType, RecordRow } from './adapters/types'

// Render any stored value as plain, human-readable text — flattening Airtable
// wrappers ({state,value}), record-id/lookup arrays, and objects into something
// the grid can show without raw JSON.
export function displayValue(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'boolean') return v ? 'Да' : 'Нет'
  if (typeof v === 'number' || typeof v === 'string') return String(v)
  if (Array.isArray(v)) return v.map(displayValue).filter(Boolean).join(', ')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    // Airtable AI/generated field wrapper.
    if ('value' in o && (typeof o.value === 'string' || typeof o.value === 'number')) return String(o.value)
    // Common human-readable keys on linked/object values.
    for (const k of ['name', 'title', 'label', 'Project', 'Developer', 'text']) {
      if (typeof o[k] === 'string') return o[k] as string
    }
    if (typeof o.url === 'string') return o.url as string
    return ''
  }
  return String(v)
}

// The editable text for a value (what the user types into an inline editor).
export function editableText(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(x => (typeof x === 'string' || typeof x === 'number') ? String(x) : displayValue(x)).filter(Boolean).join(', ')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('value' in o && (typeof o.value === 'string' || typeof o.value === 'number')) return String(o.value)
    return ''
  }
  return String(v)
}

// Coerce inline-editor text back into the field's stored shape, preserving
// Airtable wrappers and arrays.
export function coerceValue(field: { type: FieldType }, original: unknown, text: string): unknown {
  if (field.type === 'number') return text.trim() === '' ? null : Number(text)
  if (original && typeof original === 'object' && !Array.isArray(original) && 'value' in (original as object)) {
    return { ...(original as Record<string, unknown>), value: text }
  }
  if (Array.isArray(original)) return text.split(',').map(s => s.trim()).filter(Boolean)
  return text
}

// Does a value look like a single image URL we can render as a thumbnail?
export function isImageUrl(v: unknown): boolean {
  if (typeof v !== 'string') return false
  if (!/^https?:\/\//.test(v)) return false
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(v) || /\/storage\/v1\/object\/public\//.test(v) || /images\.balinsky\.info/.test(v)
}

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
  const hide = new Set(cfg.hideFields ?? [])
  const known = new Map(cfg.fields.map(f => [f.key, f]))
  const out: FieldDef[] = cfg.fields.filter(f => f.type !== 'photos' && !f.hidden && !hide.has(f.key)).map(f => ({ ...f }))
  const seen = new Set(known.keys())
  const extra = new Set<string>()
  for (const r of rows) for (const k of Object.keys(r.fields)) {
    if (!seen.has(k) && !extra.has(k) && !hide.has(k)) extra.add(k)
  }
  for (const k of [...extra].sort((a, b) => a.localeCompare(b, 'ru'))) {
    out.push({ key: k, label: k, type: inferTypeFromRows(rows, k) })
  }
  return out
}

// Field defs for a single record's editor: every config field (so empty ones
// can still be filled) plus any extra keys the record itself carries.
export function resolveRecordFields(cfg: CollectionConfig, fields: Record<string, unknown>): FieldDef[] {
  const hide = new Set(cfg.hideFields ?? [])
  const out: FieldDef[] = cfg.fields.filter(f => f.type !== 'photos' && !f.hidden && !hide.has(f.key)).map(f => ({ ...f }))
  const seen = new Set(cfg.fields.map(f => f.key))
  for (const k of Object.keys(fields).sort((a, b) => a.localeCompare(b, 'ru'))) {
    if (seen.has(k) || hide.has(k)) continue
    out.push({ key: k, label: k, type: inferType(fields[k]) })
  }
  return out
}
