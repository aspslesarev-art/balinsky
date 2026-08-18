
import { parseXlsxBuffer, parseXlsxHyperlinks, colToNum } from '@/lib/parsers/_xlsx'
import { toGrid, cellAt, type Grid } from './grid'

// Чтение мастер-таблицы «прайсы застройщиков»: одна её строка = один
// комплекс с ссылками на прайс в разных колонках (Google / Unitbox /
// Notion / Сайт / pdf).
//
// Качаем xlsx, а не csv, потому что в половине строк ячейка показывает
// подпись («Price list - Google Таблицы»), а сам адрес спрятан в
// гиперссылке — в csv он теряется вместе с половиной источников.

export const MASTER_SHEET_URL =
  process.env.MARKET_MASTER_SHEET_URL ||
  'https://docs.google.com/spreadsheets/d/1iOiPkcfgHxstEIb-DqE7MwLlGZTFBmGqdrIaVKlOy14/edit?gid=2131843672'

export type SourceKind = 'google' | 'unitbox' | 'notion' | 'site' | 'pdf'

// Колонка мастер-таблицы → вид источника. Порядок = приоритет: если у
// комплекса заполнено несколько колонок, берём первый доступный вид.
const SOURCE_COLUMNS: Array<{ header: string; kind: SourceKind }> = [
  { header: 'google', kind: 'google' },
  { header: 'unitbox', kind: 'unitbox' },
  { header: 'notion', kind: 'notion' },
  { header: 'сайт', kind: 'site' },
  { header: 'pdf', kind: 'pdf' },
]

export type MasterRow = {
  rowNo: number | null
  developer: string
  complex: string
  unitTypes: string | null
  kind: SourceKind
  url: string
  spreadsheetId: string | null
  gid: string | null
  sourceKey: string
}

export type MasterReadResult = {
  rows: MasterRow[]
  // Строки, для которых источник не нашёлся — их видно в отчёте, чтобы
  // не думать, будто комплекс отслеживается.
  skipped: Array<{ developer: string; complex: string; reason: string }>
}

export async function fetchMaster(url = MASTER_SHEET_URL): Promise<MasterReadResult> {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const gidMatch = url.match(/[#&?]gid=(\d+)/)
  if (!idMatch) throw new Error('MARKET_MASTER_SHEET_URL не похож на ссылку Google Sheets')
  const xlsxUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=xlsx&gid=${gidMatch?.[1] ?? '0'}`
  const r = await fetch(xlsxUrl, { redirect: 'follow' })
  if (!r.ok) throw new Error(`мастер-таблица вернула ${r.status} — она должна быть доступна по ссылке`)
  const buf = new Uint8Array(await r.arrayBuffer())
  return parseMaster(buf)
}

export function parseMaster(buf: Uint8Array): MasterReadResult {
  const grid = toGrid(parseXlsxBuffer(buf))
  const links = parseXlsxHyperlinks(buf)
  const header = findHeader(grid)
  if (!header) throw new Error('в мастер-таблице не найдена строка заголовка с колонками «Застройщик» и «Комплекс»')

  const rows: MasterRow[] = []
  const skipped: MasterReadResult['skipped'] = []
  const seen = new Set<string>()

  for (let r = header.row + 1; r <= grid.rowCount; r++) {
    const developer = cellAt(grid, r, header.developer).text
    const complex = cellAt(grid, r, header.complex).text
    if (!developer && !complex) continue

    const picked = pickSource(grid, links, r, header.sources)
    if (!picked) {
      skipped.push({ developer, complex, reason: 'ни в одной колонке нет ссылки на прайс' })
      continue
    }

    const ids = parseSheetRef(picked.url)
    const sourceKey = ids
      ? `gs:${ids.spreadsheetId}:${ids.gid}`
      : `${picked.kind}:${picked.url}`

    // Один и тот же лист, прописанный в двух строках, — это один
    // источник, а не два: иначе история юнита раздвоится.
    if (seen.has(sourceKey)) {
      skipped.push({ developer, complex, reason: `дубль источника ${sourceKey}` })
      continue
    }
    seen.add(sourceKey)

    rows.push({
      rowNo: parseRowNo(cellAt(grid, r, header.rowNo ?? 0).text),
      developer: developer || '(без застройщика)',
      complex: complex || '(без названия)',
      unitTypes: cellAt(grid, r, header.unitTypes ?? 0).text || null,
      kind: ids ? 'google' : picked.kind,
      url: picked.url,
      spreadsheetId: ids?.spreadsheetId ?? null,
      gid: ids?.gid ?? null,
      sourceKey,
    })
  }

  return { rows, skipped }
}

type Header = {
  row: number
  developer: number
  complex: number
  rowNo?: number
  unitTypes?: number
  sources: Array<{ col: number; kind: SourceKind }>
}

function findHeader(grid: Grid): Header | null {
  const limit = Math.min(grid.rowCount, 10)
  for (let r = 1; r <= limit; r++) {
    const labels = new Map<string, number>()
    for (let c = 1; c <= grid.colCount; c++) {
      const text = cellAt(grid, r, c).text.trim().toLowerCase()
      if (text && !labels.has(text)) labels.set(text, c)
    }
    const developer = labels.get('застройщик')
    const complex = labels.get('комплекс')
    if (!developer || !complex) continue

    const sources = SOURCE_COLUMNS
      .map(s => ({ col: labels.get(s.header) ?? 0, kind: s.kind }))
      .filter(s => s.col > 0)
    if (!sources.length) continue

    return {
      row: r,
      developer,
      complex,
      rowNo: labels.get('n пп') ?? labels.get('№') ?? undefined,
      unitTypes: labels.get('типы юнитов') ?? undefined,
      sources,
    }
  }
  return null
}

function pickSource(
  grid: Grid,
  links: Map<string, string>,
  row: number,
  sources: Header['sources'],
): { kind: SourceKind; url: string } | null {
  for (const s of sources) {
    // Гиперссылка приоритетнее текста: текст — это подпись, которую
    // ставит Google, а адрес живёт в ссылке.
    const url = links.get(`${row}:${s.col}`) ?? asUrl(cellAt(grid, row, s.col).text)
    if (url) return { kind: s.kind, url }
  }
  return null
}

function asUrl(text: string): string | null {
  const t = text.trim()
  return /^https?:\/\//i.test(t) ? t : null
}

function parseSheetRef(url: string): { spreadsheetId: string; gid: string } | null {
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!id) return null
  return { spreadsheetId: id[1], gid: url.match(/[#&?]gid=(\d+)/)?.[1] ?? '0' }
}

function parseRowNo(text: string): number | null {
  const n = Number(text.trim())
  return Number.isInteger(n) && n > 0 ? n : null
}

export { colToNum }
