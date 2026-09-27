// Разбор «шахматок в ячейках» без модели: у этих прайсов одна ячейка —
// один юнит, а номер, площадь, цена и статус разложены по соседним
// клеткам. Универсальный конфиг колонок (extract.ts) такую геометрию не
// берёт, поэтому под каждую схему — свой короткий разборщик.
//
// Разборщики ищут опорные подписи («UNIT №», «PRICE», «#1.1», «№»), а не
// сидят на жёстких координатах: застройщик добавит строку или этаж —
// разбор не сломается. Легенду цветов читают из самого листа.

import { colorDistance } from '../xlsx'
import { cellAt, textAt, type Grid } from '../grid'
import { parseArea, parseBedrooms, parseMoney } from '../numbers'
import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'

const COLOR_TOLERANCE = 40 ** 2 * 3

type Legend = Array<{ hex: string; status: UnitStatus }>

function unit(p: Partial<ScrapedUnit> & { unitKey: string; status: UnitStatus }): ScrapedUnit {
  const priceUsd = p.priceUsd ?? null
  const areaM2 = p.areaM2 ?? null
  return {
    unitType: null,
    bedrooms: null,
    landM2: null,
    floor: null,
    raw: {},
    ...p,
    priceUsd,
    areaM2,
    pricePerM2: p.pricePerM2 ?? (priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null),
  }
}

function result(units: ScrapedUnit[], expectAtLeast = 1): ExtractResult {
  const warnings: string[] = []
  if (units.length < expectAtLeast) {
    throw new Error(`структура листа изменилась: нашлось ${units.length} юнитов — нужен пересмотр разбора`)
  }
  return { units, warnings }
}

// Легенда «цвет → статус»: ищем ячейки с подписью статуса в первых
// строках листа и берём заливку — либо самой ячейки, либо соседней
// слева (у части застройщиков цвет стоит квадратиком рядом с подписью).
function readLegend(grid: Grid, words: Record<string, UnitStatus>, maxRow = 10): Legend {
  const legend: Legend = []
  for (let r = 1; r <= Math.min(maxRow, grid.rowCount); r++) {
    for (let c = 1; c <= grid.colCount; c++) {
      const status = words[textAt(grid, r, c).trim().toLowerCase()]
      if (!status) continue
      const hex = cellAt(grid, r, c).color ?? cellAt(grid, r, c - 1).color
      if (hex) legend.push({ hex, status })
    }
  }
  return legend
}

function colorStatus(hex: string | null, legend: Legend): UnitStatus | null {
  if (!hex) return null
  let best: { status: UnitStatus; dist: number } | null = null
  for (const e of legend) {
    const dist = colorDistance(hex, e.hex)
    if (!best || dist < best.dist) best = { status: e.status, dist }
  }
  return best && best.dist <= COLOR_TOLERANCE ? best.status : null
}

// Dune (Bali Investments): ячейка «#1.1», справа площадь «42,1m²»,
// строкой ниже цена «142000$». Статус — заливка ячейки номера по легенде
// Free / Booked / Sold / Block в шапке.
export function parseDune(grid: Grid): ExtractResult {
  const legend = readLegend(grid, { free: 'available', booked: 'reserved', sold: 'sold', block: 'reserved' })
  const units: ScrapedUnit[] = []
  for (let r = 1; r <= grid.rowCount; r++) {
    for (let c = 1; c <= grid.colCount; c++) {
      const key = textAt(grid, r, c)
      if (!/^#\d+\.\d+$/.test(key)) continue
      const status = colorStatus(cellAt(grid, r, c).color, legend) ?? 'unknown'
      units.push(unit({
        unitKey: key,
        unitType: key.startsWith('#2.') ? '2BD' : '1BD',
        bedrooms: key.startsWith('#2.') ? 2 : 1,
        areaM2: parseArea(textAt(grid, r, c + 1)),
        priceUsd: parseMoney(textAt(grid, r + 1, c)),
        status,
        raw: { key, area: textAt(grid, r, c + 1), price: textAt(grid, r + 1, c) },
      }))
    }
  }
  return result(units, 5)
}

// PREDMET (CASCADE, BABAKAN): блоки строк с подписями в колонке A —
// «UNIT №», «TYPE», «BUILDING SIZE», «PRICE»; юниты идут по колонкам.
// В PRICE: сумма — в продаже, «sold» / «(sold)» — продан, «(booked)» /
// «deposit» — бронь. Заливку не читаем: у CASCADE проданные зелёные.
export function parsePredmet(grid: Grid): ExtractResult {
  const units: ScrapedUnit[] = []
  for (let r = 1; r <= grid.rowCount; r++) {
    if (!/^unit\s*№/i.test(textAt(grid, r, 1))) continue
    // Подписи блока ищем ниже строки номеров, пока не начался следующий блок.
    const rowOf = (label: RegExp): number | null => {
      for (let k = r + 1; k <= Math.min(r + 6, grid.rowCount); k++) {
        if (/^unit\s*№/i.test(textAt(grid, k, 1))) return null
        if (label.test(textAt(grid, k, 1))) return k
      }
      return null
    }
    const typeRow = rowOf(/^type/i)
    const sizeRow = rowOf(/^building\s*size/i)
    const priceRow = rowOf(/^price/i)
    if (!priceRow) continue
    for (let c = 2; c <= grid.colCount; c++) {
      const key = textAt(grid, r, c)
      if (!/^\d+$/.test(key)) continue
      const type = typeRow ? textAt(grid, typeRow, c) : ''
      const priceText = textAt(grid, priceRow, c)
      const price = parseMoney(priceText)
      const status: UnitStatus = /sold/i.test(priceText) || /\(sold\)/i.test(type)
        ? 'sold'
        : /booked|deposit|reserv/i.test(priceText)
          ? 'reserved'
          : price !== null
            ? 'available'
            : 'unknown'
      const sizeText = sizeRow ? textAt(grid, sizeRow, c) : ''
      units.push(unit({
        unitKey: key,
        unitType: type.replace(/\(sold\)/i, '').trim() || null,
        bedrooms: parseBedrooms(type),
        // «176,0 (96,0 Villa + 80,0 Pool & patio)» и «72,5 + 26 Pool» —
        // площадь самой виллы идёт вторым числом в первом случае и первым
        // во втором; берём площадь дома, без бассейна и патио.
        areaM2: villaArea(sizeText),
        priceUsd: price,
        status,
        raw: { key, type, size: sizeText, price: priceText },
      }))
    }
  }
  return result(units, 5)
}

function villaArea(text: string): number | null {
  const inVilla = text.match(/\(\s*([\d.,]+)\s*villa/i)
  if (inVilla) return parseArea(inVilla[1])
  return parseArea(text.split('+')[0])
}

// SWOI BERAWA: этажи блоками. В строке этажа ячейки «Studio 101 35,3 sq m»,
// ниже в той же колонке — цена, вид и строка статуса SOLD / RESALE /
// AVAILIABLE. Цвет не читаем: у юнита 203 красная заливка при AVAILIABLE.
export function parseSwoiFloors(grid: Grid): ExtractResult {
  const units: ScrapedUnit[] = []
  const LABEL = /^(studio|apartment|unit)\s+(\d{3})\b/i
  for (let r = 1; r <= grid.rowCount; r++) {
    for (let c = 1; c <= grid.colCount; c++) {
      const label = textAt(grid, r, c)
      const m = label.match(LABEL)
      if (!m) continue
      let status: UnitStatus | null = null
      let priceText = ''
      let view = ''
      let resale = false
      for (let k = r + 1; k <= Math.min(r + 5, grid.rowCount); k++) {
        const t = textAt(grid, k, c)
        if (LABEL.test(t)) break
        if (/^sold$/i.test(t)) status = 'sold'
        else if (/^re-?sale$/i.test(t)) { status = 'available'; resale = true }
        else if (/^avail/i.test(t)) status = 'available'
        else if (/^(booked|reserved|deposit)$/i.test(t)) status = 'reserved'
        else if (/\$|usd/i.test(t)) priceText = t
        else if (t) view = t
        if (status) break
      }
      units.push(unit({
        unitKey: m[2],
        unitType: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(),
        areaM2: parseArea(label.slice(m[0].length)),
        priceUsd: parseMoney(priceText),
        status: status ?? 'unknown',
        raw: { label, price: priceText, view, ...(resale ? { resale: 'true' } : {}) },
      }))
    }
  }
  return result(units, 10)
}

// Anta MediSpa: несколько разделов (APARTMENTS, VILLAS), у каждого своя
// шапка с «№» и свой набор колонок. Статус — слово SOLD вместо цены и
// заливка строки по легенде RESERVATION / SOLD в первой строке листа.
export function parseSectionTable(grid: Grid): ExtractResult {
  const legend = readLegend(grid, { reservation: 'reserved', sold: 'sold' }, 3)
  const units: ScrapedUnit[] = []
  let cols: Record<string, number> | null = null
  let section = ''

  for (let r = 1; r <= grid.rowCount; r++) {
    const header = headerCols(grid, r)
    if (header) {
      cols = header
      // Название раздела стоит строкой-двумя выше шапки.
      for (let k = r - 1; k >= Math.max(1, r - 2); k--) {
        const t = rowText(grid, k)
        if (/apartments|villas/i.test(t)) { section = /villa/i.test(t) ? 'villa' : 'apartment'; break }
      }
      continue
    }
    if (!cols) continue
    const key = textAt(grid, r, cols.key)
    if (!key || !/\d/.test(key)) continue
    const priceText = cols.price ? textAt(grid, r, cols.price) : ''
    const status: UnitStatus =
      /sold/i.test(priceText)
        ? 'sold'
        : colorStatus(cellAt(grid, r, cols.key).color, legend) ?? 'available'
    const area = cols.area ? parseArea(textAt(grid, r, cols.area)) : null
    if (parseMoney(priceText) === null && status === 'available' && area === null) continue
    units.push(unit({
      unitKey: key,
      unitType: (cols.type ? textAt(grid, r, cols.type) : '') || section || null,
      bedrooms: cols.bedrooms ? parseBedrooms(textAt(grid, r, cols.bedrooms).replace(/bd\b/i, 'bed')) : null,
      floor: cols.floor ? textAt(grid, r, cols.floor) || null : null,
      areaM2: area,
      priceUsd: parseMoney(priceText),
      status,
      raw: { section, key, price: priceText, type: cols.type ? textAt(grid, r, cols.type) : '' },
    }))
  }
  return result(units, 10)
}

function rowText(grid: Grid, r: number): string {
  const parts: string[] = []
  for (let c = 1; c <= grid.colCount; c++) parts.push(textAt(grid, r, c))
  return parts.join(' ')
}

// Шапка раздела: есть ячейка «№» и ячейка с ценой. Возвращает номера
// колонок по смыслу подписи.
function headerCols(grid: Grid, r: number): Record<string, number> | null {
  const out: Record<string, number> = {}
  for (let c = 1; c <= grid.colCount; c++) {
    const t = textAt(grid, r, c).trim().toLowerCase()
    if (t === '№') out.key = c
    else if (/^price/.test(t)) out.price = c
    else if (/unit type/.test(t)) out.type = c
    else if (/total area/.test(t)) out.area = c
    else if (/^floor/.test(t)) out.floor = c
    else if (/bedroom/.test(t)) out.bedrooms = c
  }
  return out.key && out.price ? out : null
}
