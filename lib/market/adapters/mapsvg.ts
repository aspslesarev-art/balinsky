// Генпланы на плагине MapSVG (WordPress).
//
// Юниты лежат в таблицах плагина и отдаются публичным REST-эндпоинтом
// `/wp-json/mapsvg/v1/regions/<таблица>/`, а сама страница рисуется
// скриптом — со страницы текстом брать нечего.
//
// Тонкость, из-за которой нельзя просто взять первую попавшуюся таблицу:
// рядом с рабочими в плагине лежат их копии («Виллы» и «Виллы - copy») с
// расходящимися статусами — 44 проданных против 33. Какая из них живая,
// знает только фронтенд сайта, поэтому номера таблиц вычитываем из его
// же скриптов.

import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'
import { parseArea, parseMoney } from '../numbers'

const TIMEOUT_MS = 20_000

// Сколько скриптов сайта готовы просмотреть в поисках номеров таблиц.
const MAX_SCRIPTS = 10
const PAGE_SIZE = 30

// Плагин отдаёт свои маршруты всем, так что наличие карт — дешёвая
// проверка «этот ли движок», прежде чем качать скрипты темы.
export async function usesMapsvg(origin: string): Promise<boolean> {
  try {
    const r = await fetch(`${origin}/wp-json/mapsvg/v1/maps`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!r.ok) return false
    const body = await r.json() as { items?: unknown[] }
    return Array.isArray(body.items) && body.items.length > 0
  } catch {
    return false
  }
}

// Номера живых таблиц — те, что запрашивает фронтенд сайта.
export async function mapsvgTables(html: string, origin: string): Promise<string[]> {
  const found = new Set(tablesIn(html))
  if (found.size) return [...found]

  for (const src of scriptUrls(html, origin).slice(0, MAX_SCRIPTS)) {
    try {
      const r = await fetch(src, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!r.ok) continue
      for (const t of tablesIn(await r.text())) found.add(t)
    } catch {
      // Недоступный скрипт — не повод бросать поиск в остальных.
    }
    if (found.size) break
  }
  return [...found]
}

export async function scrapeMapsvg(origin: string, tables: string[]): Promise<ExtractResult> {
  const warnings: string[] = []
  const units: ScrapedUnit[] = []

  for (const table of tables) {
    const rows = await fetchTable(origin, table)
    if (!rows.length) {
      warnings.push(`таблица ${table} пуста`)
      continue
    }
    for (const r of rows) {
      const key = text(r.id) || text(r.title)
      if (!key) continue
      const areaM2 = parseArea(text(r.s))
      // Цену прогоняем через общую проверку правдоподобия: у части сайтов
      // в этом же поле лежат рупии, и они бы приехали как доллары.
      const priceUsd = parseMoney(text(r.price))
      units.push({
        unitKey: key,
        unitType: text(r.type_text) || null,
        bedrooms: intOrNull(text(r.rooms)),
        areaM2,
        landM2: null,
        floor: text(r.floors) || null,
        status: statusOf(text(r.status_text)),
        priceUsd,
        pricePerM2: priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null,
        // legendStatus читает classify.isResale — на этих генпланах
        // перепродажа инвестора помечена отдельным статусом.
        raw: { source: 'mapsvg', table, legendStatus: text(r.status_text) },
      })
    }
  }

  if (!units.length) throw new Error('в таблицах MapSVG нет юнитов')
  return { units, warnings }
}

async function fetchTable(origin: string, table: string): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(`${origin}/wp-json/mapsvg/v1/regions/${table}/?page=${page}&take=${PAGE_SIZE}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!r.ok) throw new Error(`MapSVG вернул ${r.status} на таблицу ${table}`)
    const body = await r.json() as { items?: Array<Record<string, unknown>>; hasMore?: boolean }
    out.push(...(body.items ?? []))
    if (!body.hasMore) break
  }
  return out
}

function tablesIn(source: string): string[] {
  return [...source.matchAll(/mapsvg\/v1\/regions\/(regions_\d+)/g)].map(m => m[1])
}

// Библиотеки движка смотреть незачем — номера таблиц лежат в коде темы.
function scriptUrls(html: string, origin: string): string[] {
  const urls: string[] = []
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const src = m[1].startsWith('/') ? `${origin}${m[1]}` : m[1]
    if (!src.startsWith(origin)) continue
    if (/wp-includes|jquery|gtag|analytics/i.test(src)) continue
    urls.push(src)
  }
  return urls
}

// Статусы задаёт владелец сайта в самом плагине, отсюда разнобой.
const STATUS_WORDS: Record<string, UnitStatus> = {
  'sold': 'sold', 'продан': 'sold', 'продано': 'sold',
  'enabled': 'available', 'available': 'available', 'free': 'available',
  'свободен': 'available', 'свободно': 'available', 'в продаже': 'available',
  // Перепродажа — это выставленный на продажу объект, просто не от
  // застройщика; для остатка он свободен, а чей он — отмечает is_resale.
  'resale': 'available', 'перепродажа': 'available',
  'reserved': 'reserved', 'booked': 'reserved', 'забронирован': 'reserved', 'бронь': 'reserved',
}

function statusOf(v: string): UnitStatus {
  return STATUS_WORDS[v.trim().toLowerCase()] ?? 'unknown'
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
}

function intOrNull(v: string): number | null {
  const n = Number(v.replace(/[^\d]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}
