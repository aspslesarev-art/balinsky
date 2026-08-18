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
import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'
import { chatJson } from '../llm'

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

  const { units, warnings } = await extractFromText(text, meta)
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

const SYSTEM = `Ты читаешь страницу застройщика недвижимости на Бали и достаёшь из неё объекты, которые продаются.

Верни ТОЛЬКО JSON:
{
  "units": [
    {
      "unitKey": "<номер или название объекта, коротко и стабильно>",
      "unitType": "<вилла/апартамент/тип планировки или null>",
      "bedrooms": <число или null>,
      "areaM2": <площадь здания в м2, число или null>,
      "landM2": <площадь участка в м2, число или null>,
      "priceUsd": <цена в долларах США, число или null>,
      "status": "available" | "reserved" | "sold"
    }
  ],
  "unsupported": "<если на странице нет ни одного объекта с ценой — одна фраза почему, иначе null>"
}

Правила:
- Если страница описывает ОДИН объект (одна вилла, один дом) — верни ровно один элемент, unitKey = название объекта.
- Если перечислено несколько юнитов с номерами и ценами — верни каждый отдельно.
- Цену бери базовую в долларах. Если цена указана в рупиях (миллиарды IDR) — верни null, не пересчитывай.
- Если про объект прямо сказано, что он продан или забронирован — поставь соответствующий статус, иначе "available".
- Соточная площадь участка: 1 сотка = 100 м2.
- Цена бывает закодирована в имени файла: «280000-studioSerg.jpg» или «plan-390000.png» означают $280,000 и $390,000. Если других цен на странице нет, бери их оттуда, а unitKey собирай из типа планировки или порядкового номера.
- Диапазон цен («от $250,000 до $400,000») — это не объект: такой странице нужен unsupported, если отдельных объектов не перечислено.
- unsupported заполняй, когда страница — оглавление, контакты, описание района без цен, или список документов.
- Никакого текста вне JSON.`

async function extractFromText(
  text: string,
  meta: { developer: string; complex: string },
): Promise<ExtractResult> {
  const user = [
    `Застройщик: ${meta.developer}`,
    `Комплекс по нашей картотеке: ${meta.complex}`,
    '',
    'Текст страницы:',
    text.slice(0, 12_000),
  ].join('\n')

  const parsed = await chatJson(SYSTEM, user, { feature: 'market-layout', meta })
  const data = parsed as { units?: unknown[]; unsupported?: unknown }

  if (typeof data.unsupported === 'string' && data.unsupported.trim()) {
    throw new Error(`страница не содержит объектов с ценой: ${data.unsupported.trim().slice(0, 160)}`)
  }

  const warnings: string[] = []
  const units: ScrapedUnit[] = []
  const seen = new Map<string, number>()

  for (const raw of data.units ?? []) {
    const u = raw as Record<string, unknown>
    const key = String(u.unitKey ?? '').trim()
    if (!key) { warnings.push('объект без названия пропущен'); continue }
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)

    const areaM2 = numOrNull(u.areaM2)
    const priceUsd = numOrNull(u.priceUsd)
    units.push({
      unitKey: n === 1 ? key : `${key}~${n}`,
      unitType: str(u.unitType),
      bedrooms: intOrNull(u.bedrooms),
      areaM2,
      landM2: numOrNull(u.landM2),
      floor: null,
      status: asStatus(u.status),
      priceUsd,
      pricePerM2: priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null,
      raw: { source: 'notion' },
    })
  }

  if (!units.length) throw new Error('на странице Notion не нашлось ни одного объекта')
  return { units, warnings }
}

function asStatus(v: unknown): UnitStatus {
  const s = String(v ?? '').toLowerCase()
  if (s === 'sold' || s === 'reserved' || s === 'available') return s
  return 'available'
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(/[^\d.]/g, '')) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v)
  return n === null ? null : Math.round(n)
}

function toUuid(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function safeUrl(s: string): URL | null {
  try { return new URL(s) } catch { return null }
}
