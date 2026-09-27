// Ежедневные копии прайсов застройщиков в Supabase Storage.
//
// Застройщик переписывает прайс на месте: вчерашнюю версию листа потом
// не достать ниоткуда. Поэтому каждый обход кладёт копию листа, который
// он только что скачал, — без лишних загрузок.
//
// Храним не xlsx целиком (книги с картинками весят до 90 МБ, ~200 МБ в
// день на все прайсы), а сам лист: текст и заливку каждой непустой
// ячейки, сжатые gzip. Это десятки килобайт, и из такой копии можно
// заново прогнать любой разбор за любой день (см. scripts/market-snapshot.ts).
//
// Путь: sheets/<ГГГГ-ММ-ДД>/<source_key>.json.gz, мастер-таблица —
// master/<ГГГГ-ММ-ДД>.json.gz. Бакет закрытый.

import { gzipSync, gunzipSync } from 'node:zlib'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchGrid, type Grid, type GridCell } from './grid'
import { MASTER_SHEET_URL } from './master-sheet'

export const SNAPSHOT_BUCKET = 'market-snapshots'

export type SheetSnapshot = {
  source_key: string
  url: string
  day: string
  rowCount: number
  colCount: number
  // [строка, колонка, текст, заливка|null] — только непустые ячейки.
  cells: Array<[number, number, string, string | null]>
}

let bucketReady: Promise<void> | null = null

function ensureBucket(sb: SupabaseClient): Promise<void> {
  bucketReady ??= (async () => {
    const { data } = await sb.storage.getBucket(SNAPSHOT_BUCKET)
    if (data) return
    const { error } = await sb.storage.createBucket(SNAPSHOT_BUCKET, { public: false })
    if (error && !/already exists/i.test(error.message)) throw new Error(`бакет копий: ${error.message}`)
  })().catch(e => {
    bucketReady = null
    throw e
  })
  return bucketReady
}

export function snapshotPath(sourceKey: string, day: string): string {
  return `sheets/${day}/${sourceKey.replace(/[^\w.-]+/g, '_')}.json.gz`
}

export function gridToSnapshot(grid: Grid, meta: { source_key: string; url: string; day: string }): SheetSnapshot {
  const cells: SheetSnapshot['cells'] = []
  for (let r = 1; r <= grid.rowCount; r++) {
    for (let c = 1; c <= grid.colCount; c++) {
      const cell = grid.rows[r]?.[c]
      if (cell && (cell.text || cell.color)) cells.push([r, c, cell.text, cell.color])
    }
  }
  return { ...meta, rowCount: grid.rowCount, colCount: grid.colCount, cells }
}

export function snapshotToGrid(snap: SheetSnapshot): Grid {
  const empty: GridCell = { text: '', color: null }
  const rows: GridCell[][] = []
  for (let r = 0; r <= snap.rowCount; r++) rows.push(new Array<GridCell>(snap.colCount + 1).fill(empty))
  for (const [r, c, text, color] of snap.cells) rows[r][c] = { text, color }
  return { rows, rowCount: snap.rowCount, colCount: snap.colCount }
}

// Копия листа. Ошибку не пробрасываем: сбой хранилища не должен ронять
// обход прайса — данные в историю важнее копии.
export async function saveSheetSnapshot(
  sb: SupabaseClient,
  meta: { source_key: string; url: string; day: string },
  grid: Grid,
): Promise<string | null> {
  try {
    await ensureBucket(sb)
    const body = gzipSync(JSON.stringify(gridToSnapshot(grid, meta)))
    const { error } = await sb.storage
      .from(SNAPSHOT_BUCKET)
      .upload(snapshotPath(meta.source_key, meta.day), body, { contentType: 'application/gzip', upsert: true })
    return error ? `копия листа не сохранилась: ${error.message}` : null
  } catch (e) {
    return `копия листа не сохранилась: ${e instanceof Error ? e.message : String(e)}`
  }
}

export async function saveMasterSnapshot(sb: SupabaseClient, day: string): Promise<string | null> {
  try {
    await ensureBucket(sb)
    const grid = await fetchGrid(MASTER_SHEET_URL)
    const body = gzipSync(JSON.stringify(gridToSnapshot(grid, { source_key: 'master', url: MASTER_SHEET_URL, day })))
    const { error } = await sb.storage
      .from(SNAPSHOT_BUCKET)
      .upload(`master/${day}.json.gz`, body, { contentType: 'application/gzip', upsert: true })
    return error ? error.message : null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export async function loadSheetSnapshot(sb: SupabaseClient, sourceKey: string, day: string): Promise<SheetSnapshot> {
  const { data, error } = await sb.storage.from(SNAPSHOT_BUCKET).download(snapshotPath(sourceKey, day))
  if (error || !data) throw new Error(`копии за ${day} нет: ${error?.message ?? 'пусто'}`)
  return JSON.parse(gunzipSync(Buffer.from(await data.arrayBuffer())).toString('utf8'))
}
