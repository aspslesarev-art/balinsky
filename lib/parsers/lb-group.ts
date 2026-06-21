// LB Group (Loyo Development) — единый прайс в одной Google-таблице,
// каждый комплекс/тип = отдельная вкладка (gid). Статус юнита закодирован
// ЦВЕТОМ фона ячейки; легенда (Free/Resale/Booked/Block/Sold) вшита в сам
// лист. Source_url каждого комплекса содержит свой gid → fetchXlsxFromGoogleSheet
// отдаёт ровно эту вкладку (Google honor'ит gid для xlsx-экспорта).
//
// У LB Group ДВЕ раскладки карточек (детектируем автоматически):
//   • Виллы  — горизонтально «№N»{цвет} + «Nbr»{цвет}; цена общая по типу
//     спален из «N bedroom» / «Price NNN$» в шапке.
//   • Апарты — вертикальный стек «Nbr» → «N-  AREAm2» → цена{цвет}; площадь
//     и цена индивидуальны для юнита, статус = цвет ячейки цены.
//
// Запись — в Supabase-таблицу parser_units (НЕ в Airtable): источник
// истины теперь Supabase, управление через /admin/data. unit_key =
// `${complexId}#${gid}#${number}` уникален между вкладками/комплексами,
// поэтому повторный прогон апдейтит запись, а не плодит дубль.

import { createClient } from '@supabase/supabase-js'
import { num, type ParserResult } from './_shared'
import { fetchXlsxFromGoogleSheet, colorDistance, hexToRgb, type XlsxSheet } from './_xlsx'

// complexId (raw_complexes.airtable_id) → вкладки (gid) в общей таблице
// LB Group. У комплекса может быть несколько вкладок (виллы + апарты).
// spreadsheetId один на всех; source_url в complex_parsers даёт его, gid'ы
// берём отсюда. gid'ы — из ТЗ 01-LB-Group.
export const LB_SPREADSHEET_ID = '1qVnrTG-3_UHIexFcZ8sYRDYtFin_He7tDu5g9NE9pwg'
export const LB_COMPLEXES: Record<string, { name: string; gids: number[] }> = {
  recOR5CZuEd8x1Ddv: { name: 'Ubud Dream',           gids: [448033896, 1198089354] },
  recH4aUDZBJRz9TDG: { name: 'Jungle Flower Villas',  gids: [1177770682] },
  rec3LUKaNa5l9bk45: { name: 'Loyo Villas Ubud',      gids: [586750142] },
  recU84aZyupepVsiV: { name: 'U Villas I',            gids: [2044256636] },
  recRekV8aky8ROQ5g: { name: 'U Villas II',           gids: [198169034] },
  recMBQQDO01Y87nOR: { name: 'Melasti Arcade',        gids: [146196093] },
  recAyVXwRh7Zqewsn: { name: 'XO Pandawa',            gids: [1980840750, 487256324] },
  recZbQXbQg8yhM0ZE: { name: 'Melasti Dream',         gids: [1184391288] },
  recfUcCdp3CrPdHlT: { name: 'Green Village',         gids: [1726516389, 1726935323] },
  recuTWqZ7EKal0Ezq: { name: 'Pandawa Hills',         gids: [260305475, 2097965055] },
  recYtf7iEwUpOB3eZ: { name: 'XO Canggu',             gids: [1237796937, 28378314] },
  recRJkzYJHEG4aJC6: { name: 'Pandawa Dream',         gids: [1161198849, 413505682, 1885435806, 707595306, 2080635983, 798782530] },
}

const LEGEND_WORDS = ['Free', 'Booked', 'Sold', 'Resale', 'Block'] as const
type LegendWord = (typeof LEGEND_WORDS)[number]

const STATUS_MAP: Record<LegendWord, string> = {
  Free:   'Доступна',
  Sold:   'Продана',
  Booked: 'Бронь',
  Block:  'Блок',
  Resale: 'Resale',
}

export type LbUnit = {
  number: string
  bedrooms: number | null
  areaM2: number | null
  price: number | null
  status: LegendWord | null
}

export type LbExtract = {
  units: LbUnit[]
  layout: 'villa' | 'apartment' | 'grid' | 'id'
  legend: Partial<Record<LegendWord, string>>
  warnings: string[]
}

// === Легенда ============================================================
// Слово Free/Sold/… белое, образец цвета — соседняя ячейка слева (1-3 кол).
function legendFromCells(cells: XlsxSheet): Partial<Record<LegendWord, string>> {
  const out: Partial<Record<LegendWord, string>> = {}
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const word = c.value.trim() as LegendWord
    if (!LEGEND_WORDS.includes(word)) continue
    const [row, col] = k.split(':').map(Number)
    // Образец цвета — соседняя ячейка; у разных вкладок он бывает слева
    // (Ubud Dream) или справа (Melasti Dream) от слова.
    for (const dc of [-1, 1, -2, 2, -3, 3]) {
      const n = cells.get(row + ':' + (col + dc))
      if (!n?.color || n.color === 'FFFFFFFF') continue
      out[word] = n.color
      break
    }
  }
  return out
}

function nearestLegendWord(color: string, legend: Partial<Record<LegendWord, string>>): LegendWord | null {
  let best: { word: LegendWord; d: number } | null = null
  for (const [w, lcolor] of Object.entries(legend)) {
    if (!lcolor) continue
    const d = colorDistance(color, lcolor)
    if (!best || d < best.d) best = { word: w as LegendWord, d }
  }
  // Порог ~50 ед. на канал: принимает округления Google (±1-5), но
  // отвергает цвета вне легенды (напр. EA9999) → их добьёт фолбэк по оттенку.
  if (!best || best.d > 2500) return null
  return best.word
}

// Фолбэк «по оттенку» когда легенду на листе не нашли / цвет от неё далёк.
// Палитра LB Group: зелёный=Free, жёлтый=Booked, серый=Block, синий=Resale,
// фиолетовый/красный=Sold (у LB продано — фиолетовый; красный — на всякий).
function classifyByHue(hex: string): LegendWord | null {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 510
  const s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255))
  if (l > 0.93) return null            // белый / почти белый = пусто
  if (s < 0.18) return 'Block'         // серый = блок
  let h: number
  const d = max - min
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (h * 60 + 360) % 360
  if (h < 20 || h >= 330) return 'Sold'    // красный
  if (h < 65) return 'Booked'              // жёлтый/оранжевый
  if (h < 175) return 'Free'               // зелёный
  if (h < 255) return 'Resale'             // голубой/синий
  return 'Sold'                            // фиолетовый = продано (LB)
}

// Статус: сначала по легенде листа, иначе фолбэк по оттенку.
function resolveStatus(color: string | null, legend: Partial<Record<LegendWord, string>>): LegendWord | null {
  if (!color) return null
  return nearestLegendWord(color, legend) ?? classifyByHue(color)
}

// Цена по типу спален: «N bedroom» в колонке A + «Price NNN$» ниже (виллы).
function pricesPerBedrooms(cells: XlsxSheet): Record<number, number> {
  const bedroomRows: { br: number; row: number }[] = []
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const m = c.value.trim().match(/^(\d+)\s+bedroom$/i)
    if (m) bedroomRows.push({ br: parseInt(m[1], 10), row: parseInt(k.split(':')[0], 10) })
  }
  const out: Record<number, number> = {}
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const m = c.value.match(/Price\s+([\d\s]+)\s*\$/)
    if (!m) continue
    const row = parseInt(k.split(':')[0], 10)
    const price = parseInt(m[1].replace(/\s/g, ''), 10)
    const near = bedroomRows.filter(b => b.row <= row && row - b.row <= 6).sort((a, b) => b.row - a.row)[0]
    if (near) out[near.br] = price
  }
  return out
}

// === Раскладка A: апартаменты ==========================================
// Якорь — ячейка «N-  AREAm2». Тип спален на 1 строку выше, цена (с цветом
// = статус) на 1 строку ниже, в той же колонке.
function extractApartments(cells: XlsxSheet, legend: Partial<Record<LegendWord, string>>): LbUnit[] {
  const units: LbUnit[] = []
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const m = c.value.trim().match(/^(\d+)\s*-\s*(\d+)\s*m2$/i)
    if (!m) continue
    const [row, col] = k.split(':').map(Number)
    const typeCell = cells.get((row - 1) + ':' + col)
    const brM = typeof typeCell?.value === 'string' ? typeCell.value.trim().match(/^(\d+)\s*br$/i) : null
    const priceCell = cells.get((row + 1) + ':' + col)
    const price = priceCell
      ? (typeof priceCell.value === 'number' ? priceCell.value : num(typeof priceCell.value === 'string' ? priceCell.value : null))
      : null
    const status = resolveStatus(priceCell?.color ?? null, legend)
    units.push({ number: m[1], bedrooms: brM ? parseInt(brM[1], 10) : null, areaM2: parseInt(m[2], 10), price, status })
  }
  return units
}

// === Раскладка V: виллы =================================================
// Якорь — «№N»{цвет = статус}. Спальни в ячейке справа. Цена — по типу.
function extractVillas(cells: XlsxSheet, legend: Partial<Record<LegendWord, string>>): LbUnit[] {
  const prices = pricesPerBedrooms(cells)
  const units: LbUnit[] = []
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const m = c.value.trim().match(/^№(\d+)$/)
    if (!m) continue
    const [row, col] = k.split(':').map(Number)
    const brCell = cells.get(row + ':' + (col + 1))
    const brM = typeof brCell?.value === 'string' ? brCell.value.trim().match(/^(\d+)\s*br$/i) : null
    const br = brM ? parseInt(brM[1], 10) : null
    const status = resolveStatus(c.color, legend)
    units.push({ number: m[1], bedrooms: br, areaM2: null, price: br && prices[br] ? prices[br] : null, status })
  }
  return units
}

// === Раскладка G: «голые числа в клетках» (пространственная карта) =======
// Юнит = ячейка с целым числом, цвет = статус. Спальни/цена/площадь — из
// заголовка строки-«линии» слева в той же строке (Melasti Dream / Loyo),
// либо глобально, если тип спален на вкладке один (U Villas).
type RowCtx = { bedrooms: number | null; price: number | null; houseArea: number | null }

function rowContexts(cells: XlsxSheet): { byRow: Map<number, RowCtx>; globalBedrooms: number | null; globalPrice: number | null } {
  const byRow = new Map<number, RowCtx>()
  const rows = new Set<number>()
  for (const k of cells.keys()) rows.add(parseInt(k.split(':')[0], 10))
  const bedroomSet = new Set<number>()
  const priceSet = new Set<number>()
  for (const r of rows) {
    let bedrooms: number | null = null, price: number | null = null, houseArea: number | null = null
    let sawHouse = false
    for (let col = 1; col <= 9; col++) {
      const v = cells.get(r + ':' + col)?.value
      if (typeof v !== 'string') continue
      const s = v.trim()
      const bm = s.match(/(\d+)\s*bedroom/i) ?? s.match(/(\d+)\s*bedr\b/i)
      if (bm) { bedrooms = parseInt(bm[1], 10); bedroomSet.add(bedrooms) }
      const pm = s.match(/^(?:from\s*)?([\d][\d\s]{3,})\s*\$$/i)
      if (pm) { const p = parseInt(pm[1].replace(/\s/g, ''), 10); if (Number.isFinite(p)) { price = p; priceSet.add(p) } }
      if (/house/i.test(s)) sawHouse = true
      const am = s.match(/^(\d+)\s*m²$/i)
      if (am && (sawHouse || houseArea == null)) houseArea = parseInt(am[1], 10)
    }
    byRow.set(r, { bedrooms, price, houseArea })
  }
  return {
    byRow,
    globalBedrooms: bedroomSet.size === 1 ? [...bedroomSet][0] : null,
    globalPrice: priceSet.size === 1 ? [...priceSet][0] : null,
  }
}

function extractGrid(cells: XlsxSheet, legend: Partial<Record<LegendWord, string>>): LbUnit[] {
  const { byRow, globalBedrooms, globalPrice } = rowContexts(cells)
  const units: LbUnit[] = []
  for (const [k, c] of cells) {
    if (!c.color) continue
    // Юнит = чистое целое 1..300 (исключает годы/цены), правее меток (col>=5).
    const iv = typeof c.value === 'number' ? c.value : (typeof c.value === 'string' && /^\d{1,3}$/.test(c.value.trim()) ? parseInt(c.value.trim(), 10) : null)
    if (iv == null || !Number.isInteger(iv) || iv < 1 || iv > 300) continue
    const [row, col] = k.split(':').map(Number)
    if (col < 5) continue
    const status = resolveStatus(c.color, legend)
    if (!status) continue
    // Контекст: своя строка → ближайшая выше в пределах 3 → глобальный.
    let ctx = byRow.get(row)
    if (!ctx?.bedrooms && !ctx?.price) {
      for (let dr = 1; dr <= 3; dr++) { const up = byRow.get(row - dr); if (up && (up.bedrooms || up.price)) { ctx = up; break } }
    }
    units.push({
      number: String(iv),
      bedrooms: ctx?.bedrooms ?? globalBedrooms,
      areaM2: ctx?.houseArea ?? null,
      price: ctx?.price ?? globalPrice,
      status,
    })
  }
  return units
}

// === Раскладка I: буквенно-цифровые ID по этажам/блокам =================
// Юнит = ячейка «A119»/«B105»{цвет=статус}, площадь — справа («32m²»,
// «43,2m²»). Цена — общая по листу, если она единственная (Green Village
// 110000), иначе оставляем null (Pandawa Dream — цена по блокам, на ревью).
function extractIds(cells: XlsxSheet, legend: Partial<Record<LegendWord, string>>): LbUnit[] {
  const priceSet = new Set<number>()
  for (const [, c] of cells) {
    if (typeof c.value !== 'string') continue
    const pm = c.value.trim().match(/^([\d][\d\s]{3,})\s*\$$/)
    if (pm) { const p = parseInt(pm[1].replace(/\s/g, ''), 10); if (Number.isFinite(p)) priceSet.add(p) }
  }
  const globalPrice = priceSet.size === 1 ? [...priceSet][0] : null
  const units: LbUnit[] = []
  for (const [k, c] of cells) {
    if (!c.color || typeof c.value !== 'string') continue
    if (!/^[A-Za-z]\d{2,4}$/.test(c.value.trim())) continue
    const [row, col] = k.split(':').map(Number)
    const status = resolveStatus(c.color, legend)
    if (!status) continue
    const areaCell = cells.get(row + ':' + (col + 1))?.value
    const am = typeof areaCell === 'string' ? areaCell.trim().match(/^(\d+(?:[.,]\d+)?)\s*m²$/i) : null
    const areaM2 = am ? parseFloat(am[1].replace(',', '.')) : null
    units.push({ number: c.value.trim(), bedrooms: null, areaM2, price: globalPrice, status })
  }
  return units
}

// Авто-детекция раскладки: «№N» (виллы) / «N- AREAm2» (апарты) /
// «голые числа» (сетка) / «A119» (ID по этажам). Берём раскладку,
// нашедшую больше юнитов.
export function extractLbUnits(cells: XlsxSheet): LbExtract {
  const legend = legendFromCells(cells)
  const warnings: string[] = []
  for (const w of LEGEND_WORDS) {
    if (!legend[w]) warnings.push(`legend: не нашёл цвет для "${w}" — будет фолбэк по оттенку`)
  }
  const candidates: { layout: LbExtract['layout']; units: LbUnit[] }[] = [
    { layout: 'apartment', units: extractApartments(cells, legend) },
    { layout: 'villa', units: extractVillas(cells, legend) },
    { layout: 'grid', units: extractGrid(cells, legend) },
    { layout: 'id', units: extractIds(cells, legend) },
  ]
  candidates.sort((a, b) => b.units.length - a.units.length)
  const best = candidates[0]
  return { units: best.units, layout: best.layout, legend, warnings }
}

// === Раннер (фабрика на комплекс) =======================================
// Раннер комплекса: читает ВСЕ его вкладки (gids из LB_COMPLEXES — у
// комплекса бывает villa+apart и больше), парсит каждую, мёржит и пишет
// одним батчем. parserKey = complexId (уникален между комплексами),
// section = `${gid}#${number}` (уникален между вкладками — иначе villa №1
// и apart №1 одного комплекса коллидировали бы). sourceUrl из реестра не
// используется (gids берём из LB_COMPLEXES), но оставлен в сигнатуре для
// совместимости с ParserModule.run.
export async function runLbComplex(opts: {
  complexId: string
  sourceUrl?: string
  airtableToken?: string
}): Promise<ParserResult> {
  const cfg = LB_COMPLEXES[opts.complexId]
  if (!cfg) throw new Error(`LB Group: complexId ${opts.complexId} не в LB_COMPLEXES`)
  const rows: { unit_key: string; data: Record<string, unknown> }[] = []
  const warnings: string[] = []
  let unmatched = 0
  for (const gid of cfg.gids) {
    const url = `https://docs.google.com/spreadsheets/d/${LB_SPREADSHEET_ID}/edit?gid=${gid}`
    const cells = await fetchXlsxFromGoogleSheet(url)
    const { units: raw, layout } = extractLbUnits(cells)
    const typeLabel = (layout === 'apartment' || layout === 'id') ? 'Апартаменты' : 'Вилла'
    for (const u of raw) {
      if (!u.status) { unmatched++; continue }
      const unit_key = `${opts.complexId}#${gid}#${u.number}`
      const data: Record<string, unknown> = {
        Name: u.number,
        Тип: typeLabel,
        Статус: STATUS_MAP[u.status],
        complex_id: opts.complexId,
        Комплекс: cfg.name,
        source: 'lb_group',
        gid,
      }
      if (u.price != null) data['Цена'] = u.price
      if (u.bedrooms != null) data['Спальни'] = u.bedrooms
      if (u.areaM2 != null) data['Площадь'] = u.areaM2
      rows.push({ unit_key, data })
    }
  }
  if (unmatched > 0) warnings.push(`${unmatched} юнитов с нераспознанным цветом — пропущены`)
  // Один номер может встретиться в нескольких клетках листа → одинаковый
  // unit_key. Дедупим (последний выигрывает) — иначе upsert падает на
  // "ON CONFLICT cannot affect row a second time".
  const byKey = new Map<string, { unit_key: string; data: Record<string, unknown> }>()
  for (const r of rows) byKey.set(r.unit_key, r)
  const deduped = [...byKey.values()]
  if (deduped.length < rows.length) warnings.push(`${rows.length - deduped.length} дублей номера в листе — схлопнуты`)
  if (deduped.length === 0) throw new Error(`LB Group (${cfg.name}): ни один юнит не распознан`)

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  // Свежий снимок: удаляем прежние юниты этого комплекса, которых больше
  // нет в листе (проданные/убранные), затем upsert текущих.
  const { data: existing } = await sb.from('parser_units').select('unit_key').eq('data->>complex_id', opts.complexId)
  const keep = new Set(deduped.map(r => r.unit_key))
  const stale = (existing ?? []).map(r => r.unit_key as string).filter(k => !keep.has(k))
  if (stale.length) await sb.from('parser_units').delete().in('unit_key', stale)
  const stamped = deduped.map(r => ({ ...r, updated_at: new Date().toISOString() }))
  for (let i = 0; i < stamped.length; i += 500) {
    const { error } = await sb.from('parser_units').upsert(stamped.slice(i, i + 500), { onConflict: 'unit_key' })
    if (error) throw new Error(`parser_units upsert: ${error.message}`)
  }
  return { unitsCount: deduped.length, warnings, linked: 0 }
}
