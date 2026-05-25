// Ubud Dream (LB Group) — прайс в Google Sheets, статусы юнитов
// закодированы ЦВЕТОМ ячейки (зелёный = Free, розовый = Sold,
// серый = Block, жёлтый = Booked, синий = Resale). Легенда вшита в
// сам лист — берём цвета из swatch-ячеек слева от слов Free/Sold/...
// и матчим по ближайшему RGB.

import {
  fetchExistingUnits, pushUnits, autoLinkUnits,
  type ParserResult, type UnitInput, type UnitMatchKey,
} from './_shared'
import { fetchXlsxFromGoogleSheet, colToNum, colorDistance, type XlsxSheet } from './_xlsx'

const LEGEND_WORDS = ['Free', 'Booked', 'Sold', 'Resale', 'Block'] as const
type LegendWord = (typeof LEGEND_WORDS)[number]

// LEGEND_WORD → Airtable Status. Block и Resale — новые варианты,
// автоматически создаются Airtable при typecast: true.
const STATUS_MAP: Record<LegendWord, string> = {
  Free:   'Доступна',
  Sold:   'Продана',
  Booked: 'Бронь',
  Block:  'Блок',
  Resale: 'Resale',
}

export async function runUbudDreamParser(opts: {
  complexId: string
  sourceUrl: string
  airtableToken: string
}): Promise<ParserResult> {
  const cells = await fetchXlsxFromGoogleSheet(opts.sourceUrl)
  const warnings: string[] = []

  // 1. Легенда: для каждого слова из LEGEND_WORDS ищем цвет swatch-ячейки
  //    слева (1-3 колонки). Сам word-cell у Ubud Dream белый, а образец
  //    цвета — соседняя ячейка без текста, той же высоты.
  const legendColors = legendFromCells(cells)
  for (const w of LEGEND_WORDS) {
    if (!legendColors[w]) warnings.push(`legend: не нашёл цвет для "${w}" — статус не будет сматчен`)
  }

  // 2. Default-цена per BR: "1 bedroom" / "2 bedroom" в колонке A, а
  //    "Price NNN $" — ниже в той же группе строк.
  const prices = pricesPerBedrooms(cells)

  // 3. Юниты: каждая ячейка с текстом "№N", спальни — соседняя справа.
  const units: UnitInput[] = []
  const matchKeys = new Map<string, UnitMatchKey>()
  let unmatched = 0, missingPrice = 0
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const m = c.value.match(/^№(\d+)$/)
    if (!m) continue
    const num = parseInt(m[1], 10)
    const [row, col] = k.split(':').map(Number)
    // BR cell sits 1 column to the right ("1br" / "2br").
    const brCell = cells.get(row + ':' + (col + 1))
    const brMatch = typeof brCell?.value === 'string'
      ? brCell.value.trim().match(/^(\d+)br$/i) : null
    const br = brMatch ? parseInt(brMatch[1], 10) : null
    const status = c.color ? nearestLegendWord(c.color, legendColors) : null
    if (!status) { unmatched++; continue }
    const price = br && prices[br] ? prices[br] : null
    if (price == null) { missingPrice++; continue }

    // Native naming: имя совпадает с номером юнита в прайсе застройщика
    // (1, 2, ..., 41). Дедуп с другими комплексами идёт через поле
    // «Парсер ключ» = `ubud_dream:${num}`, которое выставляет pushUnits.
    const section = String(num)
    const fields: Record<string, unknown> = {
      Name: section,
      Цена: price,
      Тип: ['Вилла'],
      Статус: STATUS_MAP[status],
    }
    if (br != null) fields['Спальни'] = br
    units.push({ section, fields })
    matchKeys.set(section, { villaSize: null, bedrooms: br })
  }

  if (unmatched > 0) warnings.push(`${unmatched} юнитов с нераспознанным цветом ячейки — статус пропущен`)
  if (missingPrice > 0) warnings.push(`${missingPrice} юнитов без default-цены для BR — пропущены`)

  if (units.length === 0) throw new Error('Ubud Dream: ни один юнит не распознан в листе')

  // 4. Push в Airtable. Дедуп — по «Парсер ключ» = `ubud_dream:${section}`.
  const existing = await fetchExistingUnits(opts.airtableToken)
  const unitsCount = await pushUnits(units, existing, 'ubud_dream', opts.airtableToken)

  // 5. Autolink — Ubud Dream нет villa-size в листе, матчинг только по BR.
  //    Если в Виллах под Ubud Dream несколько 1BR-планировок → autolink
  //    пометит как ambiguous и пропустит (правильно).
  const linked = await autoLinkUnits({
    complexId: opts.complexId,
    parserKey: 'ubud_dream',
    airtableToken: opts.airtableToken,
    units: matchKeys,
    warnings,
  })
  return { unitsCount, warnings, linked }
}

// ===

function legendFromCells(cells: XlsxSheet): Partial<Record<LegendWord, string>> {
  const out: Partial<Record<LegendWord, string>> = {}
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const word = c.value.trim() as LegendWord
    if (!LEGEND_WORDS.includes(word)) continue
    const [row, col] = k.split(':').map(Number)
    // Scan up to 3 cells to the left for the first non-white, non-empty colour.
    for (const dc of [-1, -2, -3]) {
      const n = cells.get(row + ':' + (col + dc))
      if (!n?.color) continue
      if (n.color === 'FFFFFFFF') continue
      out[word] = n.color
      break
    }
  }
  return out
}

function pricesPerBedrooms(cells: XlsxSheet): Record<number, number> {
  const bedroomRows: { br: number; row: number }[] = []
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const m = c.value.trim().match(/^(\d+)\s+bedroom$/i)
    if (!m) continue
    bedroomRows.push({ br: parseInt(m[1], 10), row: parseInt(k.split(':')[0], 10) })
  }
  const out: Record<number, number> = {}
  for (const [k, c] of cells) {
    if (typeof c.value !== 'string') continue
    const m = c.value.match(/Price\s+([\d\s]+)\s*\$/)
    if (!m) continue
    const row = parseInt(k.split(':')[0], 10)
    const price = parseInt(m[1].replace(/\s/g, ''), 10)
    // The "Price NNN $" cell sits within ~6 rows below its "N bedroom" header.
    const near = bedroomRows
      .filter(b => b.row <= row && row - b.row <= 6)
      .sort((a, b) => b.row - a.row)[0]
    if (near) out[near.br] = price
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
  // Threshold: даже самый дальний цвет матчится, но если distance > 30000
  // (≈ 100 units на канал) — это совсем другой цвет, лучше промолчать.
  if (!best || best.d > 30000) return null
  return best.word
}

// Suppress unused-import warning when tests import this module but
// don't invoke colToNum. Keeping the export available for future parsers.
void colToNum
