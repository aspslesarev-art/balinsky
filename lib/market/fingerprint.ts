// Отпечаток «скелета» листа: по нему решаем, годится ли сохранённый
// layout или структуру прайса переделали и маппинг надо строить заново.
//
// Отпечаток обязан быть устойчив к тому, что меняется каждый день (цены,
// статусы, добавленные и убранные юниты), и чувствителен к тому, что
// ломает разбор (переехавшая шапка, переставленные колонки). Поэтому в
// него идут только ячейки без цифр — то есть подписи, а не данные.

import { createHash } from 'crypto'
import type { Grid } from './grid'
import { cellAt } from './grid'

const LABEL_ROWS = 15

export function layoutFingerprint(grid: Grid): string {
  const parts: string[] = [`cols:${grid.colCount}`]
  const rowLimit = Math.min(grid.rowCount, LABEL_ROWS)
  for (let r = 1; r <= rowLimit; r++) {
    const row: string[] = []
    for (let c = 1; c <= grid.colCount; c++) {
      const text = cellAt(grid, r, c).text
      if (!text) continue
      // Есть цифры — это данные (номер юнита, площадь, цена), не подпись.
      row.push(/\d/.test(text) ? `${c}:#` : `${c}:${text.toLowerCase().slice(0, 32)}`)
    }
    if (row.length) parts.push(`r${r}|${row.join('|')}`)
  }
  return createHash('sha1').update(parts.join('\n')).digest('hex').slice(0, 16)
}
