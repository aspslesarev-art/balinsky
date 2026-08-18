// Извлечение текстового слоя из PDF без внешних зависимостей.
//
// Готовые библиотеки тянут pdfjs, а тот в serverless-рантайме падает на
// отсутствующих браузерных API (DOMMatrix и компания) — в проде разбор
// прайса умирал ещё до первой страницы. Нам же нужен не рендеринг, а
// только текст, и для этого достаточно распаковать потоки контента и
// собрать аргументы операторов показа текста.
//
// Сканы без текстового слоя таким способом (как и любым другим без OCR)
// не читаются — вызывающий проверяет длину результата и говорит об этом.

import { inflateSync } from 'zlib'

// Операторы показа текста: Tj — одна строка, TJ — массив кусков с
// кернингом между ними.
const TEXT_OP = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>/g

export function extractPdfText(buf: Uint8Array): string {
  const parts: string[] = []
  for (const stream of contentStreams(buf)) {
    parts.push(readTextOperators(stream))
  }
  return parts
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Достаём содержимое всех stream…endstream, распаковывая Flate там, где
// он применён. Остальные фильтры (LZW, JPX) пропускаем: в них лежат
// картинки, а не текст.
function contentStreams(buf: Uint8Array): string[] {
  const out: string[] = []
  const raw = Buffer.from(buf)
  const marker = Buffer.from('stream')
  const endMarker = Buffer.from('endstream')

  let pos = 0
  while (pos < raw.length) {
    const start = raw.indexOf(marker, pos)
    if (start === -1) break
    const end = raw.indexOf(endMarker, start)
    if (end === -1) break

    // Заголовок объекта перед stream говорит, чем поток сжат.
    const header = raw.subarray(Math.max(0, start - 400), start).toString('latin1')
    let body = raw.subarray(skipEol(raw, start + marker.length), end)

    if (/\/FlateDecode/.test(header)) {
      try {
        body = inflateSync(body)
      } catch {
        // Битый или нестандартно упакованный поток — просто пропускаем,
        // остальные страницы от этого не страдают.
        pos = end + endMarker.length
        continue
      }
    } else if (/\/(LZW|DCT|JPX|CCITTFax|RunLength)Decode/.test(header)) {
      pos = end + endMarker.length
      continue
    }

    const text = body.toString('latin1')
    // В потоке контента всегда есть операторы позиционирования текста.
    if (/\bTJ\b|\bTj\b|\bTD\b|\bTd\b/.test(text)) out.push(text)
    pos = end + endMarker.length
  }
  return out
}

function skipEol(buf: Buffer, i: number): number {
  if (buf[i] === 0x0d && buf[i + 1] === 0x0a) return i + 2
  if (buf[i] === 0x0a || buf[i] === 0x0d) return i + 1
  return i
}

// Собираем аргументы операторов Tj/TJ. Перевод строки ставим по ET и по
// операторам перевода строки, иначе весь документ слипается в одну.
function readTextOperators(stream: string): string {
  const out: string[] = []
  let line: string[] = []

  for (const m of stream.matchAll(/(\[[^\]]*\]|\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>)\s*(TJ|Tj)|\b(T\*|Td|TD|ET)\b/g)) {
    if (m[3]) {
      if (line.length) { out.push(line.join('')); line = [] }
      continue
    }
    const arg = m[1] ?? ''
    for (const piece of arg.match(TEXT_OP) ?? []) {
      line.push(piece.startsWith('<') ? decodeHex(piece) : decodeLiteral(piece))
    }
  }
  if (line.length) out.push(line.join(''))
  return out.join('\n')
}

function decodeLiteral(s: string): string {
  return s
    .slice(1, -1)
    .replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, esc: string) => {
      switch (esc) {
        case 'n': return '\n'
        case 'r': return '\r'
        case 't': return '\t'
        case 'b': return ''
        case 'f': return ''
        case '(': return '('
        case ')': return ')'
        case '\\': return '\\'
        default: return String.fromCharCode(parseInt(esc, 8))
      }
    })
}

// Hex-строки бывают однобайтовые и двухбайтовые (UTF-16BE у составных
// шрифтов). Двухбайтовые распознаём по нулевому старшему байту.
function decodeHex(s: string): string {
  const hex = s.slice(1, -1).replace(/\s+/g, '')
  const bytes: number[] = []
  for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
  const looksUtf16 = bytes.length > 1 && bytes.filter((_, i) => i % 2 === 0).every(b => b === 0)
  if (looksUtf16) {
    let out = ''
    for (let i = 1; i < bytes.length; i += 2) out += String.fromCharCode(bytes[i])
    return out
  }
  return bytes.map(b => String.fromCharCode(b)).join('')
}

// PDF с нестандартной кодировкой шрифта (составные CID-шрифты без
// ToUnicode) отдают вместо букв мусор вроде «!"#$%&'(». Скармливать такое
// модели бессмысленно, а притворяться, что прайс пустой, — вредно:
// лучше честно сказать, что текст не читается.
export function looksLikeText(s: string): boolean {
  const letters = (s.match(/[a-zA-Zа-яА-ЯёЁ]/g) ?? []).length
  const meaningful = (s.match(/[^\s]/g) ?? []).length
  if (meaningful < 100) return false
  return letters / meaningful > 0.35
}
