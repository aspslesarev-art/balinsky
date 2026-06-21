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
// Дедуп между комплексами — по «Парсер ключ» = `${parserKey}:${number}`,
// поэтому каждый комплекс регистрируется со своим parserKey через фабрику
// lbGroupRunner('<key>').

import {
  fetchExistingUnits, pushUnits, autoLinkUnits, num,
  type ParserResult, type UnitInput, type UnitMatchKey,
} from './_shared'
import { fetchXlsxFromGoogleSheet, colorDistance, type XlsxSheet } from './_xlsx'

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
  layout: 'villa' | 'apartment'
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
    for (const dc of [-1, -2, -3]) {
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
  // > ~100 ед. на канал — это другой цвет, лучше промолчать (unknown).
  if (!best || best.d > 30000) return null
  return best.word
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
    const status = priceCell?.color ? nearestLegendWord(priceCell.color, legend) : null
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
    const status = c.color ? nearestLegendWord(c.color, legend) : null
    units.push({ number: m[1], bedrooms: br, areaM2: null, price: br && prices[br] ? prices[br] : null, status })
  }
  return units
}

// Авто-детекция: вкладка содержит «№N» (виллы) ИЛИ «N- AREAm2» (апарты),
// но не оба разом — берём ту раскладку, что нашла больше юнитов.
export function extractLbUnits(cells: XlsxSheet): LbExtract {
  const legend = legendFromCells(cells)
  const warnings: string[] = []
  for (const w of LEGEND_WORDS) {
    if (!legend[w]) warnings.push(`legend: не нашёл цвет для "${w}" — статус не будет сматчен`)
  }
  const apt = extractApartments(cells, legend)
  const vil = extractVillas(cells, legend)
  const layout: 'villa' | 'apartment' = apt.length >= vil.length ? 'apartment' : 'villa'
  return { units: layout === 'apartment' ? apt : vil, layout, legend, warnings }
}

// === Раннер (фабрика на комплекс) =======================================
export function lbGroupRunner(parserKey: string) {
  return async function runLbGroupParser(opts: {
    complexId: string
    sourceUrl: string
    airtableToken: string
  }): Promise<ParserResult> {
    const cells = await fetchXlsxFromGoogleSheet(opts.sourceUrl)
    const { units: raw, layout, warnings } = extractLbUnits(cells)

    const typeLabel = layout === 'villa' ? 'Вилла' : 'Апартаменты'
    const units: UnitInput[] = []
    const matchKeys = new Map<string, UnitMatchKey>()
    let unmatched = 0
    for (const u of raw) {
      if (!u.status) { unmatched++; continue }
      const fields: Record<string, unknown> = {
        Name: u.number,
        Тип: [typeLabel],
        Статус: STATUS_MAP[u.status],
      }
      if (u.price != null) fields['Цена'] = u.price
      if (u.bedrooms != null) fields['Спальни'] = u.bedrooms
      if (u.areaM2 != null) fields['Площадь'] = u.areaM2
      units.push({ section: u.number, fields })
      matchKeys.set(u.number, { villaSize: u.areaM2, bedrooms: u.bedrooms })
    }
    if (unmatched > 0) warnings.push(`${unmatched} юнитов с нераспознанным цветом ячейки — статус пропущен`)
    if (units.length === 0) throw new Error(`LB Group (${parserKey}): ни один юнит не распознан (layout=${layout})`)

    const existing = await fetchExistingUnits(opts.airtableToken)
    const unitsCount = await pushUnits(units, existing, parserKey, opts.airtableToken)
    const linked = await autoLinkUnits({
      complexId: opts.complexId,
      parserKey,
      airtableToken: opts.airtableToken,
      units: matchKeys,
      warnings,
    })
    return { unitsCount, warnings, linked }
  }
}
