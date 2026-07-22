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

// Raw Airtable attachment value (URL or attachment object[]) — these point at
// Airtable, not our Supabase storage, so we hide them in favour of the
// Supabase photo manifest / `image` fields.
export function isAirtableAttachment(v: unknown): boolean {
  if (v == null || v === '') return false
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return /airtableusercontent\.com|dl\.airtable\.com|\.airtable\.com\//.test(s)
}

function dynamicIsAirtable(rows: RecordRow[], key: string): boolean {
  for (const r of rows) {
    const v = r.fields[key]
    if (v != null && v !== '') return isAirtableAttachment(v)
  }
  return false
}

// Does a value look like a single image URL we can render as a thumbnail?
export function isImageUrl(v: unknown): boolean {
  if (typeof v !== 'string') return false
  if (!/^https?:\/\//.test(v)) return false
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(v) || /\/storage\/v1\/object\/public\//.test(v) || /images\.balinsky\.info/.test(v)
}

// Airtable had a declared type per column; our JSONB doesn't, so we recover it
// from the values. Nearly every key in these tables is undeclared (the config
// only names ~15 of ~140), and leaving them all as free text is how the same
// status ends up spelled three ways.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]|$)/
// Airtable record ids — an array of these is a link, not a set of choices.
const RECORD_ID = /^rec[A-Za-z0-9]{10,}$/

function isDateString(v: unknown): boolean {
  return typeof v === 'string' && ISO_DATE.test(v.trim())
}

function stringArray(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0) return null
  if (!v.every(x => typeof x === 'string')) return null
  const arr = v as string[]
  if (arr.every(x => RECORD_ID.test(x))) return null
  return arr
}

export function inferType(v: unknown): FieldType {
  if (typeof v === 'boolean') return 'bool'
  if (typeof v === 'number') return 'number'
  if (stringArray(v)) return 'multienum'
  if (v !== null && typeof v === 'object') return 'json'
  if (isDateString(v)) return 'date'
  if (typeof v === 'string' && v.length > 120) return 'longtext'
  return 'text'
}

// Thresholds for calling a text column a set of choices. Tuned against the
// grid's page size (50 rows): "Статус" has 3 distinct values over 50 records,
// while a name column has ~50 distinct and must stay free text.
const ENUM_MIN_SAMPLES = 5
const ENUM_MAX_DISTINCT = 25
const ENUM_MAX_LENGTH = 80

// Type for a key across MANY records — the extra samples are what make
// "few repeated values" (enum) distinguishable from "a different value every
// time" (text).
export function inferTypeFromRows(rows: RecordRow[], key: string): FieldType {
  const values: unknown[] = []
  for (const r of rows) {
    const v = r.fields[key]
    if (v !== null && v !== undefined && v !== '') values.push(v)
  }
  if (values.length === 0) return 'text'

  // One array anywhere means the column holds sets of values.
  if (values.some(v => stringArray(v))) return 'multienum'

  const base = inferType(values[0])
  if (base !== 'text' && base !== 'longtext') return base
  if (values.every(isDateString)) return 'date'

  const strings = values.filter((v): v is string => typeof v === 'string')
  if (strings.length !== values.length) return base
  if (strings.some(v => v.length > ENUM_MAX_LENGTH)) return base

  const distinct = new Set(strings.map(v => v.trim()))
  const repeats = strings.length >= ENUM_MIN_SAMPLES
    && distinct.size <= ENUM_MAX_DISTINCT
    && distinct.size <= Math.max(3, Math.floor(strings.length / 2))
  return repeats ? 'enum' : base
}


// «Готовность» and friends are stored as a 0–1 fraction (Airtable's percent
// columns did that, and readinessOf() in the complexes loader still reads it
// that way). Humans think in whole percents, so the admin shows 0–100 and
// converts on the way in — typing 55 into a raw number field would otherwise
// be read as 5500 %.
export function percentToInput(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return ''
  const pct = v <= 1 ? v * 100 : v
  return String(Math.round(pct))
}

export function inputToPercent(text: string): number | null {
  const n = Number(String(text).replace('%', '').trim())
  if (!Number.isFinite(n)) return null
  const clamped = Math.max(0, Math.min(100, n))
  return Math.round(clamped) / 100
}

export function percentDisplay(v: unknown): string {
  const s = percentToInput(v)
  return s === '' ? '' : `${s} %`
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
    if (dynamicIsAirtable(rows, k)) continue // hide raw Airtable attachment fields
    out.push({ key: k, label: k, type: inferTypeFromRows(rows, k) })
  }
  return out
}

// Field defs for a single record's editor: every config field (so empty ones
// can still be filled) plus any extra keys the record itself carries.
export function resolveRecordFields(
  cfg: CollectionConfig,
  fields: Record<string, unknown>,
  // Types inferred by the grid from a full page of records. A single record
  // can't reveal that a column repeats only a handful of values, so without
  // these every undeclared field would fall back to free text in the panel.
  hints?: Record<string, FieldType>,
): FieldDef[] {
  const hide = new Set(cfg.hideFields ?? [])
  const out: FieldDef[] = cfg.fields.filter(f => f.type !== 'photos' && !f.hidden && !hide.has(f.key)).map(f => ({ ...f }))
  const seen = new Set(cfg.fields.map(f => f.key))
  for (const k of Object.keys(fields).sort((a, b) => a.localeCompare(b, 'ru'))) {
    if (seen.has(k) || hide.has(k)) continue
    if (isAirtableAttachment(fields[k])) continue // hide raw Airtable attachment fields
    out.push({ key: k, label: k, type: hints?.[k] ?? inferType(fields[k]) })
  }
  return out
}
