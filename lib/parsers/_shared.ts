// Shared plumbing for per-complex price-list parsers.
//
// Каждый ЖК — свой файл (lib/parsers/<slug>.ts) с зашитой схемой
// колонок именно его прайса. Здесь живёт только то, что одинаково для
// всех: загрузка CSV, batch-запись в Airtable, авто-линковка юнитов к
// планировкам через таблицу «Виллы». Если у нового ЖК прайс другой
// конструкции (XML, JSON, кастомный HTML) — он просто не пользуется
// fetchGoogleSheetCsv и пишет своё.

import { createClient } from '@supabase/supabase-js'

export const AIRTABLE_BASE = 'appPrMGM6h24IekkS'
export const UNITS_TABLE = 'tblfyveBxB1yJbR7d'   // «Юниты Виллы»
export const VILLAS_TABLE = 'tblmphwvyvunVSXFl'  // «Виллы» (планировки)

// BALI BAZA-style status strings → значения single-select-поля «Статус»
// в Юнитах Виллы. Если у будущего ЖК статусы другие — парсер делает
// собственный маппинг и не использует эту константу.
export const BALI_BAZA_STATUS: Record<string, string> = {
  Sold: 'Продана',
  Available: 'Доступна',
  Reserved: 'Бронь',
}

export type ParserResult = { unitsCount: number; warnings: string[]; linked: number }

// Что парсер хочет сказать про юнит: section-id (для дедупа) и
// набор Airtable-полей. Дедуп идёт по полю «Парсер ключ» =
// `${parserKey}:${section}` — Name может коллидировать между
// комплексами (Origins "1" и Ubud Dream "1" — разные юниты),
// «Парсер ключ» уникален.
export type UnitInput = { section: string; fields: Record<string, unknown> }

// Минимум, который автолинковка должна знать про юнит чтобы сматчить
// его с планировкой в Виллах. Парсер передаёт это отдельно от fields
// чтобы не зависеть от того как ЖК называет «жилая площадь» у себя.
export type UnitMatchKey = { villaSize: number | null; bedrooms: number | null }

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

// === CSV ===============================================================

export function parseCsv(text: string): string[][] {
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

export function num(s: string | undefined | null): number | null {
  if (s == null) return null
  const n = Number(String(s).replace(/[$,\s ]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Достаёт sheetId + gid из ссылки `/edit?gid=NNN` и качает CSV-экспорт.
export async function fetchGoogleSheetCsv(sourceUrl: string): Promise<string[][]> {
  const idMatch = sourceUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const gidMatch = sourceUrl.match(/[#&?]gid=(\d+)/)
  if (!idMatch) throw new Error('source_url не похож на Google Sheets URL — ожидается /spreadsheets/d/<id>/edit?gid=NNN')
  const sheetId = idMatch[1]
  const gid = gidMatch ? gidMatch[1] : '0'
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  const r = await fetch(csvUrl, { redirect: 'follow' })
  if (!r.ok) throw new Error(`Google Sheets вернул ${r.status} — проверь что таблица доступна по ссылке (share с правом View)`)
  return parseCsv(await r.text())
}

// === Airtable: юниты ===================================================

export async function fetchExistingUnits(token: string): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${UNITS_TABLE}?maxRecords=500`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error(`Airtable units fetch: ${r.status} ${await r.text().catch(() => '')}`)
  return ((await r.json()).records ?? []) as Array<{ id: string; fields: Record<string, unknown> }>
}

// Пишет юниты в Юниты Виллы. Дедуп идёт по полю «Парсер ключ»
// (`<parser_key>:<section>`) — Name может коллидировать между
// комплексами (Origins "1" и Ubud Dream "1" — разные юниты), а
// «Парсер ключ» уникален в пределах parser_key.
//
// parserKey — стабильный ключ парсера (из реестра, например 'origins').
// Парсер передаёт `section` (номер юнита в его источнике), мы
// формируем «Парсер ключ» = `${parserKey}:${section}` и кладём его в
// fields автоматически.
//
// Любой Airtable 4xx пробрасывается как throw — caller решит как
// записать в recordRun.
export async function pushUnits(
  units: UnitInput[],
  existing: Array<{ id: string; fields: Record<string, unknown> }>,
  parserKey: string,
  token: string,
): Promise<number> {
  const byParserKey = new Map<string, string>()
  for (const e of existing) {
    const k = e.fields['Парсер ключ']
    if (typeof k === 'string') byParserKey.set(k, e.id)
  }
  const toUpdate: Array<{ id: string; fields: Record<string, unknown> }> = []
  const toCreate: Array<{ fields: Record<string, unknown> }> = []
  for (const u of units) {
    const fullKey = `${parserKey}:${u.section}`
    // Стэмпим «Парсер ключ» — без него Airtable PATCH не поставит новые
    // юниты в эту таксономию, и следующий прогон создаст дубль.
    const fields = { ...u.fields, 'Парсер ключ': fullKey }
    const existingId = byParserKey.get(fullKey)
    if (existingId) toUpdate.push({ id: existingId, fields })
    else toCreate.push({ fields })
  }
  const push = async (records: Array<{ id?: string; fields: Record<string, unknown> }>, method: 'POST' | 'PATCH') => {
    let done = 0
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10)
      const resp = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${UNITS_TABLE}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: batch, typecast: true }),
      })
      if (!resp.ok) throw new Error(`Airtable ${method} ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
      done += ((await resp.json()).records ?? []).length
    }
    return done
  }
  const updated = await push(toUpdate, 'PATCH')
  const created = await push(toCreate, 'POST')
  return updated + created
}

// === Авто-линковка юнитов к планировкам ===============================

// После записи юнитов привязываем их к записи в «Виллы» (та самая
// планировка, на которой собран этот юнит) — без линка не подтянутся
// lookup-поля (Комплекс, Slug, Цена м² и т.д.), а сайт по факту
// строится на планировках.
//
// Алгоритм:
//   1. Из raw_complexes тащим имя ЖК по complex_id.
//   2. Из Виллы parser-базы — все планировки с {Комплекс 1}=<имя>.
//   3. Из их SEO:Slug (`...75m2-2-bedroom`) достаём (размер, спальни)
//      → строим карту -> V-id.
//   4. Для каждого юнита из этого прогона, у которого Виллы-линк пустой,
//      ставим линк по уникальному совпадению (размер, спальни).
//   Юниты с уже выставленным линком не трогаем — ручные правки в
//   Airtable выигрывают. Неоднозначные (несколько планировок с одним
//   ключом) — пропускаем и кидаем в warnings.
export async function autoLinkUnits(opts: {
  complexId: string
  parserKey: string                   // 'origins' / 'ubud_dream' / ...
  airtableToken: string
  units: Map<string, UnitMatchKey>    // section → (size, bd)
  warnings: string[]
}): Promise<number> {
  const c = sb()
  const { data: complexRow } = await c.from('raw_complexes').select('data').eq('airtable_id', opts.complexId).maybeSingle()
  const complexName = pickStr((complexRow?.data as Record<string, unknown> | undefined)?.['Project'])
  if (!complexName) {
    opts.warnings.push('autolink: не нашёл имя комплекса в raw_complexes — пропускаю')
    return 0
  }
  const escaped = complexName.replace(/'/g, "\\'")
  const filter = encodeURIComponent(`{Комплекс 1}='${escaped}'`)
  const vr = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${VILLAS_TABLE}?filterByFormula=${filter}&pageSize=100`, {
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

  // Свежий список юнитов — POST в pushUnits мог только что создать новые
  // записи, их не было в исходном fetchExistingUnits.
  const after = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${UNITS_TABLE}?maxRecords=500`, {
    headers: { Authorization: `Bearer ${opts.airtableToken}` },
  })
  if (!after.ok) {
    opts.warnings.push(`autolink: повторный fetch юнитов ${after.status}`)
    return 0
  }
  // Юнит ищется по «Парсер ключ» = `${parserKey}:${section}` — Name
  // может коллидировать между комплексами, parser-key уникален.
  const bySection = new Map<string, { id: string; fields: Record<string, unknown> }>()
  for (const e of ((await after.json()).records ?? []) as Array<{ id: string; fields: Record<string, unknown> }>) {
    const k = e.fields['Парсер ключ']
    if (typeof k !== 'string') continue
    const [pk, sec] = k.split(':')
    if (pk !== opts.parserKey || !sec) continue
    bySection.set(sec, e)
  }

  const toPatch: Array<{ id: string; fields: Record<string, unknown> }> = []
  let skippedAmbiguous = 0, skippedNoMatch = 0
  for (const [sec, key] of opts.units) {
    const unit = bySection.get(sec)
    if (!unit) continue
    const existingLink = unit.fields['Виллы']
    if (Array.isArray(existingLink) && existingLink.length > 0) continue
    if (key.villaSize == null || key.bedrooms == null) { skippedNoMatch++; continue }
    const k = `${key.villaSize}-${key.bedrooms}`
    const villaId = sizeBdToVilla.get(k)
    if (!villaId) { skippedNoMatch++; continue }
    if (villaId === 'ambiguous') { skippedAmbiguous++; continue }
    toPatch.push({ id: unit.id, fields: { 'Виллы': [villaId] } })
  }
  if (skippedNoMatch > 0) opts.warnings.push(`autolink: ${skippedNoMatch} юнитов без планировки в Виллах — заведи планировки в master-базе`)
  if (skippedAmbiguous > 0) opts.warnings.push(`autolink: ${skippedAmbiguous} юнитов с неоднозначным (размер, спальни)`)

  let linked = 0
  for (let i = 0; i < toPatch.length; i += 10) {
    const batch = toPatch.slice(i, i + 10)
    const resp = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${UNITS_TABLE}`, {
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

function pickStr(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return pickStr(v[0])
  return null
}
