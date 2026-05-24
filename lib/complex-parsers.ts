// Parser config and runner for per-complex price-list sync. Sits next
// to the visualisations admin in shape: one row per ЖК, an editor
// page, a "run now" action. Result of a run is a write into the
// per-complex unit table — currently «Юниты Виллы» in Airtable base
// appPrMGM6h24IekkS for villa-side complexes.

import { createClient } from '@supabase/supabase-js'

export type ParserType = 'bali_baza' | 'generic_gsheet' | 'manual_csv'

export type ParserStatus = 'ok' | 'error' | null

export type ParserConfig = {
  complex_id: string
  source_url: string
  parser_type: ParserType
  interval_minutes: number | null
  last_run_at: string | null
  last_status: ParserStatus
  last_error: string | null
  last_units_count: number | null
  last_warning_count: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Visual state derived from the last run + presence of warnings.
//  - 'green'  → last run was ok and no warnings.
//  - 'yellow' → last run was ok but produced non-fatal warnings.
//  - 'red'    → last run errored.
//  - 'idle'   → never been run.
export type ParserHealth = 'green' | 'yellow' | 'red' | 'idle'

export function parserHealth(p: ParserConfig | null): ParserHealth {
  if (!p || !p.last_status) return 'idle'
  if (p.last_status === 'error') return 'red'
  if ((p.last_warning_count ?? 0) > 0) return 'yellow'
  return 'green'
}

export type ComplexListEntry = {
  airtable_id: string
  name: string
  slug: string | null
  district: string | null
  developer: string | null
  parser: ParserConfig | null
}

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

function fs1(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return fs1(v[0])
  if (typeof v === 'object' && 'value' in v) return fs1((v as { value: unknown }).value)
  return null
}

// Index for the /admin/parsers list. With-parser rows on top, sorted
// by last_run_at (newest first); without-parser rows below, sorted by
// complex name.
export async function listComplexesWithParserStatus(): Promise<ComplexListEntry[]> {
  const c = sb()
  const [{ data: complexRows, error: cErr }, { data: parserRows, error: pErr }] = await Promise.all([
    c.from('raw_complexes').select('airtable_id, slug, data').limit(500),
    c.from('complex_parsers').select('*'),
  ])
  if (cErr) throw cErr
  // Parser table missing → treat as empty so the page still renders.
  const parserById = new Map<string, ParserConfig>()
  if (!pErr && parserRows) {
    for (const r of parserRows as ParserConfig[]) parserById.set(r.complex_id, r)
  }
  const out: ComplexListEntry[] = []
  for (const r of (complexRows ?? []) as Array<{ airtable_id: string; slug: string | null; data: Record<string, unknown> }>) {
    const name = fs1(r.data['Project']) ?? r.airtable_id
    out.push({
      airtable_id: r.airtable_id,
      name,
      slug: r.slug,
      district: fs1(r.data['Location 2']) ?? fs1(r.data['Location']),
      developer: fs1(r.data['Developer1']) ?? fs1(r.data['Варианты поиска застройщика']),
      parser: parserById.get(r.airtable_id) ?? null,
    })
  }
  out.sort((a, b) => {
    const aHas = a.parser ? 1 : 0
    const bHas = b.parser ? 1 : 0
    if (aHas !== bHas) return bHas - aHas
    if (aHas && bHas) {
      const at = a.parser?.last_run_at ?? ''
      const bt = b.parser?.last_run_at ?? ''
      if (at !== bt) return bt.localeCompare(at)
    }
    return a.name.localeCompare(b.name)
  })
  return out
}

export async function getParser(complexId: string): Promise<ParserConfig | null> {
  const c = sb()
  const { data, error } = await c.from('complex_parsers').select('*').eq('complex_id', complexId).maybeSingle()
  if (error) return null
  return (data as ParserConfig) ?? null
}

export async function upsertParser(input: {
  complex_id: string
  source_url: string
  parser_type: ParserType
  interval_minutes?: number | null
  notes?: string | null
}): Promise<ParserConfig> {
  const c = sb()
  const { data, error } = await c
    .from('complex_parsers')
    .upsert({
      complex_id: input.complex_id,
      source_url: input.source_url,
      parser_type: input.parser_type,
      interval_minutes: input.interval_minutes ?? null,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'complex_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as ParserConfig
}

export async function deleteParser(complexId: string): Promise<void> {
  const c = sb()
  const { error } = await c.from('complex_parsers').delete().eq('complex_id', complexId)
  if (error) throw error
}

export async function recordRun(complexId: string, status: 'ok' | 'error', unitsCount: number, errorMsg: string | null = null, warningCount = 0): Promise<void> {
  const c = sb()
  await c.from('complex_parsers').update({
    last_run_at: new Date().toISOString(),
    last_status: status,
    last_error: errorMsg,
    last_units_count: unitsCount,
    last_warning_count: warningCount,
    updated_at: new Date().toISOString(),
  }).eq('complex_id', complexId)
}

// Returns parsers whose interval has elapsed since their last run (or
// have never run). Used by the cron hook — caller iterates and runs each.
export async function listDueParsers(now = new Date()): Promise<ParserConfig[]> {
  const c = sb()
  const { data, error } = await c
    .from('complex_parsers')
    .select('*')
    .not('interval_minutes', 'is', null)
  if (error) return []
  const rows = (data ?? []) as ParserConfig[]
  return rows.filter(r => {
    const mins = r.interval_minutes ?? 0
    if (mins <= 0) return false
    if (!r.last_run_at) return true
    const elapsedMs = now.getTime() - new Date(r.last_run_at).getTime()
    return elapsedMs >= mins * 60_000
  })
}

// === Parser engines ====================================================

// BALI BAZA Google Sheets price list parser. Source URL is the
// /edit?gid=NNN sheet URL — we transform it to the CSV export URL,
// fetch, locate the row whose first cell is «Section», map columns by
// header name (so different BALI BAZA tabs with slightly different
// schemas work without code changes), and push to Airtable «Юниты Виллы»
// (appPrMGM6h24IekkS / tblfyveBxB1yJbR7d). PATCH-by-Name is the
// dedup key — make sure Name is globally unique across complexes
// (BALI BAZA's section codes are unique by construction).
export async function runBaliBazaParser(opts: {
  complexId: string
  sourceUrl: string
  airtableToken: string
}): Promise<{ unitsCount: number; warnings: string[]; linked: number }> {
  const { sourceUrl, airtableToken } = opts
  // Extract /spreadsheets/d/<id> and gid from the URL.
  const idMatch = sourceUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const gidMatch = sourceUrl.match(/[#&?]gid=(\d+)/)
  if (!idMatch) throw new Error('source_url не похож на Google Sheets URL — нужна ссылка вида /spreadsheets/d/<id>/edit?gid=NNN')
  const sheetId = idMatch[1]
  const gid = gidMatch ? gidMatch[1] : '0'
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

  const r = await fetch(csvUrl, { redirect: 'follow' })
  if (!r.ok) throw new Error(`Google Sheets вернул ${r.status} — проверь что таблица доступна по ссылке (share с правом View)`)
  const csv = await r.text()
  const rows = parseCsv(csv)
  const headerIdx = rows.findIndex(r => (r[0] || '').trim() === 'Section')
  if (headerIdx < 0) throw new Error('Не нашёл строку с заголовком «Section» — формат прайса BALI BAZA не распознан')
  // Normalise headers: BALI BAZA tabs use multi-line cells like
  // "Villa size\nm2" or "Off-plan\nPrice" — collapse whitespace + lowercase
  // so substring matching below works reliably across all tabs.
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  const header = rows[headerIdx].map(c => norm(c || ''))

  // Column index by header name. Substring match — header just has to
  // *contain* one of the aliases. findIndex returns the first match, so
  // order aliases from most-specific to most-generic if multiple columns
  // could conflict (e.g. "Price" vs "Price m2" — both contain "price",
  // but the actual price column always comes first in BALI BAZA tabs).
  // Only Section and Price are required; the rest is best-effort.
  const col = (...names: string[]): number => {
    for (const n of names) {
      const needle = norm(n)
      const i = header.findIndex(h => h.includes(needle))
      if (i >= 0) return i
    }
    return -1
  }
  const idxSection = col('Section')
  const idxPrice   = col('Price', 'Цена')
  const idxBedroom = col('Bedroom', 'Bedrooms', 'BDR', 'Спальни')
  const idxVilla   = col('Villa size', 'Villa m2', 'Жилая площадь')
  const idxTotal   = col('Total', 'Общая площадь', 'Total m2')
  const idxLand    = col('Land', 'Land m2', 'Площадь земли')
  const idxRoof    = col('Rooftop', 'Roof')
  const idxStaff   = col('Staff building', 'Staff')
  const idxStatus  = col('Status', 'Статус')
  if (idxSection < 0 || idxPrice < 0) {
    throw new Error('В заголовке нет колонок Section и/или Price — этот формат не похож на прайс BALI BAZA')
  }

  // Data rows: anything below the header that has a non-empty Section
  // and a parseable, positive Price. Filters out section dividers like
  // "2 BDR VILLA", blank rows, and footer notes.
  const data = rows.slice(headerIdx + 1).filter(r => {
    const sec = (r[idxSection] || '').trim()
    if (!sec) return false
    const p = num(r[idxPrice])
    return p != null && p > 0
  })

  const BASE = 'appPrMGM6h24IekkS', UNITS = 'tblfyveBxB1yJbR7d'
  const STATUS: Record<string, string> = { Sold: 'Продана', Available: 'Доступна', Reserved: 'Бронь' }

  // Existing units (by Name = section number) so we PATCH instead of duplicate.
  const ur = await fetch(`https://api.airtable.com/v0/${BASE}/${UNITS}?maxRecords=500`, { headers: { Authorization: `Bearer ${airtableToken}` } })
  if (!ur.ok) throw new Error(`Airtable units fetch: ${ur.status} ${await ur.text().catch(() => '')}`)
  const existing = ((await ur.json()).records ?? []) as Array<{ id: string; fields: Record<string, unknown> }>
  const byName: Record<string, string> = {}
  for (const e of existing) {
    const n = e.fields['Name']
    if (typeof n === 'string') byName[n] = e.id
  }

  const warnings: string[] = []
  const toCreate: Array<{ fields: Record<string, unknown> }> = []
  const toUpdate: Array<{ id: string; fields: Record<string, unknown> }> = []
  for (const r of data) {
    const sec = (r[idxSection] || '').trim()
    const price = num(r[idxPrice])
    if (!sec || price == null) { warnings.push(`#${sec || '?'} — пропущен (нет цены или номера)`); continue }
    const bd = idxBedroom >= 0 ? parseInt(r[idxBedroom] || '0', 10) : null
    const villaSize = idxVilla >= 0 ? num(r[idxVilla]) : null
    const totalSize = idxTotal >= 0 ? num(r[idxTotal]) : null
    const land = idxLand >= 0 ? num(r[idxLand]) : null
    const rooftop = idxRoof >= 0 ? num(r[idxRoof]) : null
    const staff = idxStaff >= 0 ? num(r[idxStaff]) : null
    const status = idxStatus >= 0 ? (r[idxStatus] || '').trim() : ''
    const fields: Record<string, unknown> = {
      Name: sec,
      Цена: price,
      Тип: ['Вилла'],
    }
    if (villaSize != null) fields['Жилая площадь'] = villaSize
    if (rooftop != null) fields['Площадь руфтопа'] = rooftop
    if (staff != null) fields['Staff building'] = staff
    if (land != null) fields['Площадь земли'] = land
    if (bd != null && Number.isFinite(bd)) fields['Спальни'] = bd
    // If sheet has no separate Total, fall back to Villa m2 — for
    // single-storey villas they're the same number anyway.
    if (totalSize != null) fields['Общая площадь'] = totalSize
    else if (villaSize != null) fields['Общая площадь'] = villaSize
    if (STATUS[status]) fields['Статус'] = STATUS[status]
    if (byName[sec]) toUpdate.push({ id: byName[sec], fields })
    else toCreate.push({ fields })
  }

  // Push in batches of 10.
  const push = async (records: Array<{ id?: string; fields: Record<string, unknown> }>, method: 'POST' | 'PATCH') => {
    let done = 0
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10)
      const resp = await fetch(`https://api.airtable.com/v0/${BASE}/${UNITS}`, {
        method,
        headers: { Authorization: `Bearer ${airtableToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: batch, typecast: true }),
      })
      if (!resp.ok) throw new Error(`Airtable ${method} ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
      done += ((await resp.json()).records ?? []).length
    }
    return done
  }
  const updated = await push(toUpdate, 'PATCH')
  const created = await push(toCreate, 'POST')

  // Auto-link units to their Villa planning record so the «Виллы»
  // lookup (Slug, Комплекс, etc.) populates without manual work in
  // Airtable. Matches by (villa_size, bedrooms) extracted from the
  // planning record's SEO:Slug (`...75m2-2-bedroom`). Skips units
  // that already have a link — manual edits win.
  const ourSections = new Set<string>(
    [...toUpdate.map(u => (u.fields.Name as string)), ...toCreate.map(u => (u.fields.Name as string))]
  )
  const sectionData = new Map<string, { villaSize: number | null; bedrooms: number | null }>()
  for (const r of data) {
    const sec = (r[idxSection] || '').trim()
    if (!sec) continue
    const vs = idxVilla >= 0 ? num(r[idxVilla]) : null
    const bd = idxBedroom >= 0 ? parseInt(r[idxBedroom] || '0', 10) : null
    sectionData.set(sec, { villaSize: vs, bedrooms: Number.isFinite(bd) ? bd : null })
  }
  const linked = await autoLinkUnits({
    complexId: opts.complexId,
    airtableToken,
    ourSections,
    sectionData,
    existingByName: byName,
    existingRecords: existing,
    warnings,
  })

  return { unitsCount: updated + created, warnings, linked }
}

// === Auto-link helper ==================================================

const VILLAS = 'tblmphwvyvunVSXFl' // «Виллы» (планировки) в parser-базе

async function autoLinkUnits(opts: {
  complexId: string
  airtableToken: string
  ourSections: Set<string>
  sectionData: Map<string, { villaSize: number | null; bedrooms: number | null }>
  existingByName: Record<string, string>
  existingRecords: Array<{ id: string; fields: Record<string, unknown> }>
  warnings: string[]
}): Promise<number> {
  const BASE = 'appPrMGM6h24IekkS'
  // 1. Find the complex name from raw_complexes — that's how we filter
  //    the Виллы table (it has a {Комплекс 1} lookup-text field).
  const c = sb()
  const { data: complexRow } = await c.from('raw_complexes').select('data').eq('airtable_id', opts.complexId).maybeSingle()
  const complexName = complexRow?.data ? fs1((complexRow.data as Record<string, unknown>)['Project']) : null
  if (!complexName) {
    opts.warnings.push('autolink: не нашёл имя комплекса в raw_complexes — пропускаю')
    return 0
  }
  // 2. Pull Villa planning records for this complex.
  const escaped = complexName.replace(/'/g, "\\'")
  const filter = encodeURIComponent(`{Комплекс 1}='${escaped}'`)
  const vr = await fetch(`https://api.airtable.com/v0/${BASE}/${VILLAS}?filterByFormula=${filter}&pageSize=100`, {
    headers: { Authorization: `Bearer ${opts.airtableToken}` },
  })
  if (!vr.ok) {
    opts.warnings.push(`autolink: Airtable Villas fetch ${vr.status}`)
    return 0
  }
  const villas = ((await vr.json()).records ?? []) as Array<{ id: string; fields: Record<string, unknown> }>
  if (villas.length === 0) {
    opts.warnings.push(`autolink: нет планировок в Виллах с {Комплекс 1}='${complexName}'`)
    return 0
  }
  // 3. Build (size, bd) → villa-id map from each planning's SEO:Slug
  //    (`...75m2-2-bedroom`). Multiple villas with the same key → ambiguous,
  //    skip both rather than guess.
  const sizeBdToVilla = new Map<string, string | 'ambiguous'>()
  for (const v of villas) {
    const slug = v.fields['SEO:Slug']
    if (typeof slug !== 'string') continue
    const m = slug.match(/(\d+)m2-(\d+)-bedroom/i)
    if (!m) continue
    const key = `${m[1]}-${m[2]}`
    const prev = sizeBdToVilla.get(key)
    sizeBdToVilla.set(key, prev && prev !== v.id ? 'ambiguous' : v.id)
  }
  if (sizeBdToVilla.size === 0) return 0

  // 4. For each unit we just processed, link to its Villa if (size, bd)
  //    matches uniquely and the unit doesn't already have a link.
  const byNameRecord = new Map<string, { id: string; fields: Record<string, unknown> }>()
  for (const e of opts.existingRecords) {
    const n = e.fields['Name']
    if (typeof n === 'string') byNameRecord.set(n, e)
  }
  // Also re-fetch in case parser just created records — that's needed
  // for new units to be visible. Cheap call (~one extra GET per run).
  const after = await fetch(`https://api.airtable.com/v0/${BASE}/tblfyveBxB1yJbR7d?maxRecords=500`, {
    headers: { Authorization: `Bearer ${opts.airtableToken}` },
  })
  if (after.ok) {
    const recs = ((await after.json()).records ?? []) as Array<{ id: string; fields: Record<string, unknown> }>
    for (const e of recs) {
      const n = e.fields['Name']
      if (typeof n === 'string') byNameRecord.set(n, e)
    }
  }

  const toPatch: Array<{ id: string; fields: Record<string, unknown> }> = []
  let skippedAmbiguous = 0, skippedNoMatch = 0
  for (const sec of opts.ourSections) {
    const unit = byNameRecord.get(sec)
    if (!unit) continue
    const existingLink = unit.fields['Виллы']
    if (Array.isArray(existingLink) && existingLink.length > 0) continue // manual link wins
    const sd = opts.sectionData.get(sec)
    if (!sd || sd.villaSize == null || sd.bedrooms == null) { skippedNoMatch++; continue }
    const key = `${sd.villaSize}-${sd.bedrooms}`
    const villaId = sizeBdToVilla.get(key)
    if (!villaId) { skippedNoMatch++; continue }
    if (villaId === 'ambiguous') { skippedAmbiguous++; continue }
    toPatch.push({ id: unit.id, fields: { 'Виллы': [villaId] } })
  }
  if (skippedNoMatch > 0) opts.warnings.push(`autolink: ${skippedNoMatch} юнитов без планировки в Виллах — заведи планировки в master-базе`)
  if (skippedAmbiguous > 0) opts.warnings.push(`autolink: ${skippedAmbiguous} юнитов с неоднозначным (размер, спальни) — несколько планировок подходят`)

  let linked = 0
  for (let i = 0; i < toPatch.length; i += 10) {
    const batch = toPatch.slice(i, i + 10)
    const resp = await fetch(`https://api.airtable.com/v0/${BASE}/tblfyveBxB1yJbR7d`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${opts.airtableToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batch }),
    })
    if (!resp.ok) {
      opts.warnings.push(`autolink: PATCH ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
      break
    }
    linked += batch.length
  }
  return linked
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n' || c === '\r') {
        if (field || row.length) { row.push(field); rows.push(row); row = []; field = '' }
        if (c === '\r' && text[i + 1] === '\n') i++
      } else field += c
    }
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

function num(s: string | undefined): number | null {
  if (s == null) return null
  const n = Number(String(s).replace(/[$,\s ]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
