// Адаптер под прайсы, которые застройщик выложил на Google Диск.
//
// Это либо один файл, либо папка, где среди презентаций лежит шахматка.
// Текстовый слой из PDF вынимаем локально, а объекты из него достаёт та
// же модель, что читает страницы Notion и лендинги.
//
// Скан, скриншот и PDF со сломанным шрифтом текстом не читаются — такой
// файл уходит в разбор по изображению (file-vision.ts).

import { createHash } from 'crypto'
import type { ExtractResult, ScrapedUnit } from '../types'
import { extractUnitsFromText } from '../text-units'
import { extractPdfText, looksLikeText } from '../pdf-text'
import { extractUnitsFromFile, type FileKind } from '../file-vision'

// Прайс редко бывает толще нескольких мегабайт, а презентации на Диске
// бывают под сотню — качать их ради текста незачем.
const MAX_PDF_BYTES = 40 * 1024 * 1024
const MIN_TEXT_LEN = 200

// Публичную папку Диск отдаёт готовым списком файлов по этому адресу —
// без ключа API и без авторизации.
const FOLDER_VIEW = 'https://drive.google.com/embeddedfolderview?id='

// Чем имя файла больше похоже на шахматку, тем выше он в очереди: в
// папке рядом с прайсом обычно лежат презентация и планировки.
const PRICE_WORDS = /прайс|price|availab|units?|шахмат|stock|остат/i

export type DrivePdfScrape = ExtractResult & { textHash: string }

export function isDriveSource(sourceUrl: string): boolean {
  return /drive\.google\.com/i.test(sourceUrl)
}

export async function scrapeDrivePdf(
  sourceUrl: string,
  meta: { developer: string; complex: string },
  cache: { textHash: string; units: ScrapedUnit[] } | null,
): Promise<DrivePdfScrape> {
  const fileId = await resolveFileId(sourceUrl)
  const bytes = await fetchDriveFile(fileId)

  // Хеш считаем по файлу, а не по вынутому тексту: он есть и у картинки,
  // и по нему видно, что застройщик перевыложил тот же прайс без правок.
  const textHash = createHash('sha1').update(bytes).digest('hex').slice(0, 16)
  if (cache && cache.textHash === textHash && cache.units.length) {
    return { units: cache.units, warnings: [], textHash }
  }

  const file = sniffKind(bytes)
  if (!file) {
    throw new Error('по ссылке пришёл не PDF и не картинка — вероятно, Диск запросил подтверждение скачивания')
  }

  if (file.mime === 'application/pdf') {
    const text = extractPdfText(bytes)
    if (text.length >= MIN_TEXT_LEN && looksLikeText(text)) {
      const { units, warnings } = await extractUnitsFromText(text, meta)
      return { units, warnings, textHash }
    }
  }

  const { units, warnings } = await extractUnitsFromFile(bytes, file, meta)
  return { units, warnings, textHash }
}

// https://drive.google.com/file/d/<id>/view → <id>
function parseFileId(url: string): string | null {
  return url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? new URL(url).searchParams.get('id')
}

// Застройщик даёт то ссылку на файл, то на папку с ним. Папку раскрываем
// сами: просить прямой линк на каждый прайс — это ручная работа, которая
// будет повторяться после каждой их перевыкладки.
async function resolveFileId(sourceUrl: string): Promise<string> {
  const direct = parseFileId(sourceUrl)
  if (direct) return direct

  const folderId = sourceUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1]
  if (!folderId) throw new Error('в ссылке на Диск не нашёлся идентификатор файла')

  const entries = await listFolder(folderId)
  if (!entries.length) throw new Error('папка Диска пуста или закрыта — нужен доступ по ссылке')

  // Прайс лежит либо PDF-файлом, либо картинкой-шахматкой; и то и другое
  // мы прочитать умеем, но PDF всегда точнее, поэтому он в приоритете.
  const readable = [
    ...entries.filter(e => /\.pdf$/i.test(e.title)),
    ...entries.filter(e => /\.(jpe?g|png|webp)$/i.test(e.title)),
  ]
  if (!readable.length) {
    const names = entries.map(e => e.title).slice(0, 5).join(', ')
    throw new Error(`в папке Диска нет прайса ни файлом, ни картинкой, только: ${names}`)
  }
  return (readable.find(e => PRICE_WORDS.test(e.title)) ?? readable[0]).id
}

type DriveEntry = { id: string; title: string }

async function listFolder(folderId: string): Promise<DriveEntry[]> {
  const r = await fetch(`${FOLDER_VIEW}${folderId}#list`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`Диск вернул ${r.status} на папку — она должна быть доступна по ссылке`)
  const html = await r.text()

  const out: DriveEntry[] = []
  const re = /id="entry-([a-zA-Z0-9_-]+)"[\s\S]{0,2000}?flip-entry-title">([^<]*)</g
  for (const m of html.matchAll(re)) out.push({ id: m[1], title: m[2].trim() })
  return out
}

async function fetchDriveFile(fileId: string): Promise<Uint8Array> {
  const r = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!r.ok) throw new Error(`Диск вернул ${r.status} — файл должен быть доступен по ссылке`)

  const size = Number(r.headers.get('content-length') ?? '0')
  if (size > MAX_PDF_BYTES) throw new Error(`файл слишком большой (${Math.round(size / 1e6)} МБ)`)

  return new Uint8Array(await r.arrayBuffer())
}

// Диск на большие файлы отдаёт вместо файла страницу с подтверждением
// скачивания, поэтому тип определяем по первым байтам, а не по имени.
function sniffKind(buf: Uint8Array): FileKind | null {
  if (buf.length < 8) return null
  const starts = (...bytes: number[]) => bytes.every((b, i) => buf[i] === b)
  if (starts(0x25, 0x50, 0x44, 0x46)) return { kind: 'file', mime: 'application/pdf' }
  if (starts(0xff, 0xd8, 0xff)) return { kind: 'image', mime: 'image/jpeg' }
  if (starts(0x89, 0x50, 0x4e, 0x47)) return { kind: 'image', mime: 'image/png' }
  if (starts(0x52, 0x49, 0x46, 0x46) && buf[8] === 0x57) return { kind: 'image', mime: 'image/webp' }
  return null
}
