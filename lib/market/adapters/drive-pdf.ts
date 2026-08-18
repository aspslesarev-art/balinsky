// Адаптер под прайсы, которые застройщик выложил на Google Диск.
//
// Это либо один PDF, либо папка, где среди презентаций лежит шахматка.
// Текстовый слой из PDF вынимаем локально, а объекты из него достаёт та
// же модель, что читает страницы Notion и лендинги.
//
// Сканы без текстового слоя сюда не годятся: если текста нет, честнее
// сказать об этом, чем додумывать содержимое.

import { createHash } from 'crypto'
import type { ExtractResult, ScrapedUnit } from '../types'
import { extractUnitsFromText } from '../text-units'

// Прайс редко бывает толще нескольких мегабайт, а презентации на Диске
// бывают под сотню — качать их ради текста незачем.
const MAX_PDF_BYTES = 40 * 1024 * 1024
const MIN_TEXT_LEN = 200

export type DrivePdfScrape = ExtractResult & { textHash: string }

export function isDriveSource(sourceUrl: string): boolean {
  return /drive\.google\.com/i.test(sourceUrl)
}

export async function scrapeDrivePdf(
  sourceUrl: string,
  meta: { developer: string; complex: string },
  cache: { textHash: string; units: ScrapedUnit[] } | null,
): Promise<DrivePdfScrape> {
  const fileId = parseFileId(sourceUrl)
  if (!fileId) {
    if (/\/folders\//i.test(sourceUrl)) {
      throw new Error('ссылка ведёт на папку Диска, а не на файл — нужен прямой линк на прайс')
    }
    throw new Error('в ссылке на Диск не нашёлся идентификатор файла')
  }

  const text = await fetchPdfText(fileId)
  if (text.length < MIN_TEXT_LEN) {
    throw new Error('в PDF нет текстового слоя — похоже, это скан или картинки')
  }

  const textHash = createHash('sha1').update(text).digest('hex').slice(0, 16)
  if (cache && cache.textHash === textHash && cache.units.length) {
    return { units: cache.units, warnings: [], textHash }
  }

  const { units, warnings } = await extractUnitsFromText(text, meta)
  return { units, warnings, textHash }
}

// https://drive.google.com/file/d/<id>/view → <id>
function parseFileId(url: string): string | null {
  return url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? new URL(url).searchParams.get('id')
}

async function fetchPdfText(fileId: string): Promise<string> {
  const r = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!r.ok) throw new Error(`Диск вернул ${r.status} — файл должен быть доступен по ссылке`)

  const size = Number(r.headers.get('content-length') ?? '0')
  if (size > MAX_PDF_BYTES) throw new Error(`файл слишком большой (${Math.round(size / 1e6)} МБ)`)

  const buf = new Uint8Array(await r.arrayBuffer())
  // Диск на большие файлы отдаёт страницу-заглушку с подтверждением
  // скачивания вместо самого файла.
  if (!isPdf(buf)) throw new Error('по ссылке пришёл не PDF — вероятно, Диск запросил подтверждение скачивания')

  // Грузим pdf-parse только когда дошло до реального PDF: статический
  // импорт тянет за собой pdfjs и роняет весь cron-роут в serverless-среде,
  // где нет браузерных API, — падал даже разбор Google Sheets.
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buf })
  try {
    const res = await parser.getText()
    return (res.text ?? '').replace(/[ \t]+/g, ' ').trim()
  } finally {
    await parser.destroy()
  }
}

function isPdf(buf: Uint8Array): boolean {
  return buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46
}
