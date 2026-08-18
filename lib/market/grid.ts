// Лист Google Sheets → прямоугольная сетка значений и цветов.
//
// Качаем именно xlsx, а не csv: у части застройщиков статус юнита живёт
// не в тексте, а в заливке ячейки (у Anta group вверху листа прямо
// нарисована легенда RESERVATION / SOLD / SHAREHOLDING). csv цвет теряет.
// Экспорт `format=xlsx&gid=N` отдаёт ровно один лист, так что лишнего не
// качаем.

import { fetchXlsxFromGoogleSheet, numToCol, type XlsxSheet } from '@/lib/parsers/_xlsx'

export type GridCell = { text: string; color: string | null }

export type Grid = {
  // rows[r][c] — одно-индексные r и c, нулевые элементы не используются.
  rows: GridCell[][]
  rowCount: number
  colCount: number
}

const EMPTY: GridCell = { text: '', color: null }

// Белый и «нет заливки» — не сигнал статуса, иначе вся таблица
// оказывается «покрашенной».
const NEUTRAL_FILLS = new Set(['FFFFFFFF', 'FFFFFF', '00000000'])

export function cellAt(grid: Grid, row: number, col: number): GridCell {
  return grid.rows[row]?.[col] ?? EMPTY
}

export function textAt(grid: Grid, row: number, col: number | undefined): string {
  if (!col) return ''
  return cellAt(grid, row, col).text
}

export async function fetchGrid(sourceUrl: string): Promise<Grid> {
  const sheet = await fetchXlsxFromGoogleSheet(sourceUrl)
  return toGrid(sheet)
}

export function toGrid(sheet: XlsxSheet): Grid {
  let maxRow = 0
  let maxCol = 0
  for (const key of sheet.keys()) {
    const [r, c] = key.split(':').map(Number)
    if (r > maxRow) maxRow = r
    if (c > maxCol) maxCol = c
  }

  const rows: GridCell[][] = []
  for (let r = 0; r <= maxRow; r++) rows.push(new Array<GridCell>(maxCol + 1).fill(EMPTY))

  for (const [key, cell] of sheet) {
    const [r, c] = key.split(':').map(Number)
    const color = cell.color && !NEUTRAL_FILLS.has(cell.color) ? cell.color : null
    rows[r][c] = { text: stringify(cell.value), color }
  }

  return { rows, rowCount: maxRow, colCount: maxCol }
}

function stringify(v: string | number | boolean | null): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v).trim()
}

// Строка непустая, если хоть в одной ячейке есть текст.
export function rowIsEmpty(grid: Grid, row: number): boolean {
  const cells = grid.rows[row]
  if (!cells) return true
  return cells.every(c => !c.text)
}

// Текстовое превью листа для промпта: N первых строк в виде
// «R12 | A: значение | B: значение», с пометкой цвета заливки. Модели
// нужен и адрес колонки, и то, что в ней лежит, и покрашена ли ячейка.
export function previewForPrompt(grid: Grid, maxRows = 30, maxCols = 60): string {
  const out: string[] = []
  const rowLimit = Math.min(grid.rowCount, maxRows)
  const colLimit = Math.min(grid.colCount, maxCols)
  for (let r = 1; r <= rowLimit; r++) {
    const parts: string[] = []
    for (let c = 1; c <= colLimit; c++) {
      const cell = cellAt(grid, r, c)
      if (!cell.text && !cell.color) continue
      const colour = cell.color ? ` {fill:${cell.color}}` : ''
      parts.push(`${numToCol(c)}(${c}): ${cell.text.slice(0, 60)}${colour}`)
    }
    out.push(`R${r} | ${parts.join(' | ') || '(пусто)'}`)
  }
  if (grid.rowCount > rowLimit) out.push(`… ещё ${grid.rowCount - rowLimit} строк того же вида`)
  return out.join('\n')
}

// Сводка по заливкам: какие цвета встречаются и с каким текстом рядом.
// Нужна, чтобы модель поняла, какой цвет означает «продано».
export function colorSummary(grid: Grid, limit = 12): string {
  const seen = new Map<string, { count: number; samples: string[] }>()
  for (let r = 1; r <= grid.rowCount; r++) {
    for (let c = 1; c <= grid.colCount; c++) {
      const cell = cellAt(grid, r, c)
      if (!cell.color) continue
      const e = seen.get(cell.color) ?? { count: 0, samples: [] }
      e.count++
      if (cell.text && e.samples.length < 4) e.samples.push(`R${r}${numToCol(c)}="${cell.text.slice(0, 24)}"`)
      seen.set(cell.color, e)
    }
  }
  return [...seen.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([hex, e]) => `${hex}: ${e.count} ячеек${e.samples.length ? `, например ${e.samples.join(', ')}` : ''}`)
    .join('\n')
}
