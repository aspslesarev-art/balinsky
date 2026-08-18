// Адаптер под публичные страницы Notion.
//
// В отличие от Google Sheets тут нет таблицы с колонками: у Bali Capital
// это карточка одного объекта, у BaliBenefit — лонгрид с описанием района,
// у OXO — страница-хаб. Поэтому вместо конфига колонок мы вынимаем со
// страницы плоский текст и просим модель достать из него объекты.
//
// Чтобы не звать модель каждую ночь на неизменившийся текст, результат
// кешируется по хешу текста: страница та же — данные те же.

import { createHash } from 'crypto'
import type { ExtractResult, ScrapedUnit } from '../types'
import { extractUnitsFromText } from '../text-units'

const MAX_CHUNKS = 12

export function isNotionSource(sourceUrl: string): boolean {
  return /(^|\.)notion\.(site|so)\//i.test(sourceUrl)
}

// Notion-страница адресуется 32-символьным hex. В ссылке он бывает в
// хвосте пути, а у страниц внутри базы — в query-параметре `p`.
export function parseNotionRef(sourceUrl: string): { host: string; pageId: string } | null {
  const url = safeUrl(sourceUrl)
  if (!url) return null
  const fromQuery = url.searchParams.get('p')
  const hex = fromQuery ?? url.pathname.split('-').pop() ?? ''
  const clean = hex.replace(/-/g, '')
  if (!/^[0-9a-f]{32}$/i.test(clean)) return null
  const host = url.hostname === 'www.notion.so' || url.hostname === 'notion.so' ? 'www.notion.so' : url.hostname
  return { host, pageId: toUuid(clean) }
}

export type NotionScrape = ExtractResult & { textHash: string }

export async function scrapeNotion(
  sourceUrl: string,
  meta: { developer: string; complex: string },
  cache: { textHash: string; units: ScrapedUnit[] } | null,
): Promise<NotionScrape> {
  const ref = parseNotionRef(sourceUrl)
  if (!ref) throw new Error('ссылка не похожа на страницу Notion — не нашёл идентификатор страницы')

  const text = await fetchPageText(ref.host, ref.pageId)
  if (text.trim().length < 40) throw new Error('страница Notion пустая или закрыта для публичного доступа')

  const textHash = createHash('sha1').update(text).digest('hex').slice(0, 16)
  // Текст не менялся — значит и объекты те же, модель звать незачем.
  if (cache && cache.textHash === textHash && cache.units.length) {
    return { units: cache.units, warnings: [], textHash }
  }

  const { units, warnings } = await extractUnitsFromText(text, meta)
  return { units, warnings, textHash }
}

// === текст страницы =====================================================

// Публичный (недокументированный) эндпоинт, которым пользуется сам
// notion.site. Отдаёт блоки страницы порциями, курсор — в ответе.
async function fetchPageText(host: string, pageId: string): Promise<string> {
  const parts: string[] = []
  let cursor: unknown = { stack: [] }

  for (let i = 0; i < MAX_CHUNKS; i++) {
    const r = await fetch(`https://${host}/api/v3/loadPageChunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ pageId, limit: 200, cursor, chunkNumber: i, verticalColumns: false }),
    })
    if (!r.ok) throw new Error(`Notion вернул ${r.status} — страница должна быть опубликована в вебе`)
    const body = (await r.json()) as NotionChunk
    parts.push(...textsFromChunk(body))
    const stack = body.cursor?.stack
    if (!stack?.length) break
    cursor = body.cursor
  }

  // Дубли неизбежны: соседние чанки повторяют часть блоков.
  return [...new Set(parts)].join('\n')
}

type NotionChunk = {
  cursor?: { stack?: unknown[] }
  recordMap?: { block?: Record<string, { value?: Record<string, unknown> }> }
}

function textsFromChunk(body: NotionChunk): string[] {
  const out: string[] = []
  for (const entry of Object.values(body.recordMap?.block ?? {})) {
    const outer = entry?.value as Record<string, unknown> | undefined
    // Notion то заворачивает блок ещё раз в value, то нет.
    const value = (outer?.value as Record<string, unknown> | undefined) ?? outer
    const props = value?.properties as Record<string, unknown> | undefined
    const title = props?.title
    if (!Array.isArray(title)) continue
    const text = title
      .map(part => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
      .join('')
      .trim()
    if (text) out.push(text)
  }
  return out
}

// === извлечение =========================================================

function toUuid(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function safeUrl(s: string): URL | null {
  try { return new URL(s) } catch { return null }
}
