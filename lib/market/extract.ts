// Применение MarketLayout к листу: сетка + конфиг → список юнитов.
// Здесь нет ни сети, ни модели — чистая функция, так что разбор
// воспроизводим и его можно прогнать на сохранённом листе.

import { colorDistance } from '@/lib/parsers/_xlsx'
import { cellAt, textAt, type Grid } from './grid'
import { parseBedrooms, parseMoney, parseNum, looksNumeric } from './numbers'
import type { ExtractResult, MarketLayout, ScrapedUnit, UnitStatus } from './types'

// Порог совпадения заливки: Google округляет один и тот же цвет
// по-разному, поэтому сравниваем с допуском, а не побайтово.
const COLOR_TOLERANCE = 40 ** 2 * 3

// Подстраховка на случай, если модель не перечислила все написания.
const STATUS_WORDS: Array<[RegExp, UnitStatus]> = [
  [/\b(sold|продан|продана|продано)\b/i, 'sold'],
  [/\b(reserved|reservation|бронь|забронирован|hold|booked)\b/i, 'reserved'],
  [/\b(available|free|on\s*sale|в\s*продаже|свободн|доступн)\b/i, 'available'],
]

function statusFromWords(text: string): UnitStatus | null {
  for (const [re, status] of STATUS_WORDS) if (re.test(text)) return status
  return null
}

function statusFromMap(text: string, map: Record<string, UnitStatus> | undefined): UnitStatus | null {
  if (!text) return null
  const key = text.trim().toLowerCase()
  if (map && key in map) return map[key]
  return statusFromWords(key)
}

function statusFromColor(hex: string | null, layout: MarketLayout): UnitStatus | null {
  if (!hex || !layout.statusColors?.length) return null
  let best: { status: UnitStatus; dist: number } | null = null
  for (const entry of layout.statusColors) {
    const dist = colorDistance(hex, entry.hex)
    if (!best || dist < best.dist) best = { status: entry.status, dist }
  }
  return best && best.dist <= COLOR_TOLERANCE ? best.status : null
}

export function extractUnits(grid: Grid, layout: MarketLayout): ExtractResult {
  const warnings: string[] = []
  const units: ScrapedUnit[] = []
  const seenKeys = new Map<string, number>()

  const skipRe = layout.skipRowIf ? safeRegex(layout.skipRowIf, warnings) : null
  const headers = readHeaders(grid, layout)
  const colorCol = layout.statusColorCol ?? layout.cols.unitKey

  for (let r = layout.firstDataRow; r <= grid.rowCount; r++) {
    const keyRaw = textAt(grid, r, layout.cols.unitKey)
    if (!keyRaw) continue
    if (skipRe?.test(keyRaw)) continue

    const priceRaw = textAt(grid, r, layout.cols.price)
    const statusRaw = textAt(grid, r, layout.cols.status)

    // Порядок важен: явная колонка статуса → слово вместо цены →
    // заливка → значение по умолчанию.
    let status =
      statusFromMap(statusRaw, layout.statusText) ??
      (layout.statusInPriceCell && priceRaw && !looksNumeric(priceRaw)
        ? statusFromMap(priceRaw, layout.statusText)
        : null) ??
      statusFromColor(cellAt(grid, r, colorCol).color, layout) ??
      null

    const areaM2 = parseNum(textAt(grid, r, layout.cols.area))
    const priceUsd = parseMoney(priceRaw)

    // Строка с номером, но без единого признака юнита — это почти всегда
    // подзаголовок секции («1 FLOOR», «Villas»), а не юнит.
    if (status === null && areaM2 === null && priceUsd === null) continue

    if (status === null) status = layout.defaultStatus ?? 'unknown'

    const unitKey = dedupeKey(normalizeKey(keyRaw), seenKeys, warnings)
    const pricePerM2 =
      parseNum(textAt(grid, r, layout.cols.pricePerM2)) ??
      (priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null)

    units.push({
      unitKey,
      unitType: textAt(grid, r, layout.cols.unitType) || null,
      bedrooms: parseBedrooms(textAt(grid, r, layout.cols.bedrooms)),
      areaM2,
      landM2: parseNum(textAt(grid, r, layout.cols.landArea)),
      floor: textAt(grid, r, layout.cols.floor) || null,
      status,
      priceUsd,
      pricePerM2,
      raw: rowAsObject(grid, r, headers),
    })
  }

  if (!units.length) warnings.push('лист разобран, но ни одного юнита не найдено — layout скорее всего устарел')

  const unknown = units.filter(u => u.status === 'unknown').length
  if (unknown && unknown === units.length) warnings.push(`статус не определился ни у одного из ${unknown} юнитов`)
  else if (unknown) warnings.push(`статус не определился у ${unknown} из ${units.length} юнитов`)

  return { units, warnings }
}

function normalizeKey(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

// Номер юнита обязан быть уникален внутри листа — на него завязана вся
// история. Дубль не выбрасываем (это потеря юнита), а разводим суффиксом.
function dedupeKey(key: string, seen: Map<string, number>, warnings: string[]): string {
  const n = (seen.get(key) ?? 0) + 1
  seen.set(key, n)
  if (n === 1) return key
  if (n === 2) warnings.push(`номер юнита «${key}» встречается в листе не один раз`)
  return `${key}~${n}`
}

function safeRegex(pattern: string, warnings: string[]): RegExp | null {
  // Модель охотно пишет inline-флаги в духе PCRE — «(?i).*floor.*».
  // JS их не понимает, а регистр мы и так игнорируем флагом 'i'.
  const cleaned = pattern.replace(/\(\?[a-z]+\)/g, '')
  try {
    return new RegExp(cleaned, 'i')
  } catch {
    warnings.push(`skipRowIf не компилируется как regex: ${pattern}`)
    return null
  }
}

function readHeaders(grid: Grid, layout: MarketLayout): string[] {
  const headers: string[] = []
  for (let c = 1; c <= grid.colCount; c++) {
    headers[c] = layout.headerRow ? textAt(grid, layout.headerRow, c) : ''
  }
  return headers
}

// Строка прайса целиком — чтобы потом не перепарсивать лист ради поля,
// которое не попало в колонки layout.
function rowAsObject(grid: Grid, row: number, headers: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let c = 1; c <= grid.colCount; c++) {
    const text = textAt(grid, row, c)
    if (!text) continue
    const label = headers[c]?.trim()
    out[label || `col${c}`] = text
  }
  return out
}
