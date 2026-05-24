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
  last_run_at: string | null
  last_status: ParserStatus
  last_error: string | null
  last_units_count: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ComplexListEntry = {
  airtable_id: string
  name: string
  slug: string | null
  district: string | null
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
  notes?: string | null
}): Promise<ParserConfig> {
  const c = sb()
  const { data, error } = await c
    .from('complex_parsers')
    .upsert({
      complex_id: input.complex_id,
      source_url: input.source_url,
      parser_type: input.parser_type,
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

export async function recordRun(complexId: string, status: 'ok' | 'error', unitsCount: number, errorMsg: string | null = null): Promise<void> {
  const c = sb()
  await c.from('complex_parsers').update({
    last_run_at: new Date().toISOString(),
    last_status: status,
    last_error: errorMsg,
    last_units_count: unitsCount,
    updated_at: new Date().toISOString(),
  }).eq('complex_id', complexId)
}

// === Parser engines ====================================================

// BALI BAZA Google Sheets price list parser. Source URL is the
// /edit?gid=NNN sheet URL — we transform it to the CSV export URL,
// fetch, parse the «Section / Type / Bedroom / Villa size / Rooftop /
// Staff building / Total / Price / $ / Land / $ / Status» table, and
// push to Airtable «Юниты Виллы» (appPrMGM6h24IekkS / tblfyveBxB1yJbR7d).
export async function runBaliBazaParser(opts: {
  complexId: string
  sourceUrl: string
  airtableToken: string
}): Promise<{ unitsCount: number; warnings: string[] }> {
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
  const headerIdx = rows.findIndex(r => r[0] === 'Section')
  if (headerIdx < 0) throw new Error('Не нашёл строку с заголовком «Section» — формат прайса BALI BAZA не распознан')
  const data = rows.slice(headerIdx + 1).filter(r => /^\d+$/.test((r[0] || '').trim()))

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
    const sec = (r[0] || '').trim()
    const bd = parseInt(r[2] || '0', 10)
    const villaSize = num(r[3])
    const rooftop = num(r[4])
    const staff = num(r[5])
    const totalSize = num(r[6])
    const price = num(r[7])
    const land = num(r[9])
    const status = (r[11] || '').trim()
    if (!sec || !price) { warnings.push(`#${sec || '?'} — пропущен (нет цены или номера)`); continue }
    const fields: Record<string, unknown> = {
      Name: sec,
      Цена: price,
      'Жилая площадь': villaSize,
      'Площадь руфтопа': rooftop,
      'Staff building': staff,
      'Площадь земли': land,
      Спальни: bd,
      'Общая площадь': totalSize,
      Тип: ['Вилла'],
    }
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
  return { unitsCount: updated + created, warnings }
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
