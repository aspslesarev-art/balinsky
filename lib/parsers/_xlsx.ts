// Минимальный inline-парсер xlsx (zip + 3 XML файла), достаточный для
// прайсов где ячейки несут не только значения, но и цвет (статус юнита).
// Альтернатива — exceljs (~5 МБ), но для нашей задачи overkill.
//
// Поддерживает:
//   - shared strings (<si><t>) и числа
//   - заливку ячейки (<patternFill><fgColor rgb=...>)
//   - адреса A1-стиля
//
// Не поддерживает: формулы, инлайн-строки (<is>), themes (используется
// только rgb=, theme= игнорируется → ячейка считается без цвета).

import { unzipSync, strFromU8 } from 'fflate'

export type XlsxCell = {
  value: string | number | boolean | null
  color: string | null   // hex без префикса, например "FFA2D84B"
  ref: string            // "A1", "F12" и т.п.
}

// Map ключ "row:col" → ячейка. row + col одного-индексные.
export type XlsxSheet = Map<string, XlsxCell>

export async function fetchXlsxFromGoogleSheet(sourceUrl: string, opts: { gidFallback?: string } = {}): Promise<XlsxSheet> {
  const idMatch = sourceUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  const gidMatch = sourceUrl.match(/[#&?]gid=(\d+)/)
  if (!idMatch) throw new Error('source_url не похож на Google Sheets URL — нужна ссылка вида /spreadsheets/d/<id>/edit?gid=NNN')
  const sheetId = idMatch[1]
  const gid = gidMatch ? gidMatch[1] : (opts.gidFallback ?? '0')
  const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&gid=${gid}`
  const r = await fetch(xlsxUrl, { redirect: 'follow' })
  if (!r.ok) throw new Error(`Google Sheets вернул ${r.status} — таблица должна быть доступна по ссылке (share: View)`)
  const buf = new Uint8Array(await r.arrayBuffer())
  return parseXlsxBuffer(buf, gid)
}

export function parseXlsxBuffer(buf: Uint8Array, gid?: string): XlsxSheet {
  const files = unzipSync(buf)
  const readText = (path: string): string | null => {
    const f = files[path]
    return f ? strFromU8(f) : null
  }
  // Workbook lists sheets in source order — Google Sheets puts the
  // exported gid as the first sheet always, so sheet1.xml is what we want.
  const sharedXml = readText('xl/sharedStrings.xml') ?? '<sst/>'
  const stylesXml = readText('xl/styles.xml') ?? '<styleSheet/>'
  // Try sheet1 first, then enumerate other sheets if we got multi-sheet xlsx.
  const sheetXml = readText('xl/worksheets/sheet1.xml')
    ?? Object.entries(files).find(([k]) => k.startsWith('xl/worksheets/sheet'))?.[1]
  if (!sheetXml) throw new Error(`xlsx: не нашёл worksheet (gid=${gid ?? '?'})`)
  const sheetText = typeof sheetXml === 'string' ? sheetXml : strFromU8(sheetXml)

  // 1. Shared strings
  const strings: string[] = []
  {
    const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(sharedXml))) {
      const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g
      const ts: string[] = []
      let tm: RegExpExecArray | null
      while ((tm = tRe.exec(m[1]))) ts.push(unescapeXml(tm[1]))
      strings.push(ts.join(''))
    }
  }

  // 2. Fills → color hex (rgb only; theme/indexed → null)
  const fills: (string | null)[] = []
  {
    const block = stylesXml.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/)?.[1] ?? ''
    const re = /<fill\b[^>]*>([\s\S]*?)<\/fill>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(block))) {
      const rgb = m[1].match(/<fgColor[^>]*rgb="([0-9A-Fa-f]+)"/)?.[1]
        ?? m[1].match(/<bgColor[^>]*rgb="([0-9A-Fa-f]+)"/)?.[1]
        ?? null
      fills.push(rgb ? rgb.toUpperCase() : null)
    }
  }

  // 3. cellXfs → fillId
  const cellXfs: number[] = []
  {
    const block = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? ''
    const re = /<xf\b[^>]*\/?>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(block))) cellXfs.push(parseInt(m[0].match(/fillId="(\d+)"/)?.[1] ?? '0', 10))
  }

  // 4. Cells from sheet
  const cells: XlsxSheet = new Map()
  {
    const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g
    let rm: RegExpExecArray | null
    while ((rm = rowRe.exec(sheetText))) {
      const rn = parseInt(rm[1].match(/r="(\d+)"/)?.[1] ?? '0', 10)
      // Important: two cell shapes — self-closing `<c .../>` and paired
      // `<c ...>body</c>`. Greedy `[^>]*` over self-closing was eating the
      // next cell, so we alternate explicitly.
      const cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
      let cm: RegExpExecArray | null
      while ((cm = cre.exec(rm[2]))) {
        const a = cm[1]; const body = cm[2] ?? ''
        const r = a.match(/r="([A-Z]+)(\d+)"/)
        if (!r) continue
        const s = parseInt(a.match(/s="(\d+)"/)?.[1] ?? '0', 10)
        const t = a.match(/t="([a-z]+)"/)?.[1] ?? 'n'
        const v = body.match(/<v>([^<]*)<\/v>/)
        let value: string | number | boolean | null = null
        if (v) {
          if (t === 's') value = strings[parseInt(v[1], 10)] ?? null
          else if (t === 'b') value = v[1] === '1'
          else { const n = Number(v[1]); value = Number.isFinite(n) ? n : v[1] }
        }
        const color = fills[cellXfs[s] ?? 0] ?? null
        cells.set(rn + ':' + colToNum(r[1]), { value, color, ref: r[0] })
      }
    }
  }
  return cells
}

export function colToNum(letters: string): number {
  let n = 0
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64)
  return n
}

export function numToCol(n: number): string {
  let s = ''
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26) }
  return s
}

// Manhattan-distance в RGB-пространстве. Достаточно чтобы группировать
// варианты одного цвета (Google Sheets округляет RGB-значения по-разному
// в одной и той же фактической краске).
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.length === 8 ? hex.slice(2) : hex
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function unescapeXml(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}
