// Генпланы на движке splan.ru.
//
// Сайты Oceaniq показывают шахматку виджетом splan.ru: в HTML лежит один
// пустой контейнер, а юниты приезжают из их API уже после загрузки
// страницы — текстом со страницы взять нечего. Ключ доступа виджет держит
// прямо в разметке (он публичный, им же ходит браузер посетителя), так
// что идём тем же путём, вместо того чтобы гонять headless-браузер ради
// JS-рендера.
//
// Объекты бывают двух видов: «igs» — посёлок с участками и домами, «mkd» —
// корпус с квартирами. Юниты у них лежат в разных разделах API.

import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'

const API = 'https://splan.ru/client/api'

// Сколько ждём ответа сервиса. Тик обхода общий на десяток источников,
// так что зависший виджет не должен съесть его целиком.
const TIMEOUT_MS = 20_000

export type SplanConfig = { pbKey: string; widgetId: number }

// Виджет встраивают одним и тем же сниппетом: ключ пространства и номер
// виджета лежат в нём открытым текстом.
export function splanConfig(html: string): SplanConfig | null {
  const pbKey = html.match(/setPbKey\(\s*["']([^"']+)["']\s*\)/)?.[1]
  const widgetId = html.match(/widgetId:\s*(\d+)/)?.[1]
  return pbKey && widgetId ? { pbKey, widgetId: Number(widgetId) } : null
}

export async function scrapeSplan(cfg: SplanConfig): Promise<ExtractResult> {
  const token = await login(cfg.pbKey)
  const api = async (path: string): Promise<unknown> => {
    const r = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!r.ok) throw new Error(`splan.ru вернул ${r.status} на ${path.split('?')[0]}`)
    return r.json()
  }

  const widget = dataOf(await api(`/widgets/${cfg.widgetId}?model=Obj`)) as { obj_id?: number } | null
  const objId = Number(widget?.obj_id ?? 0)
  if (!objId) throw new Error(`виджет splan.ru ${cfg.widgetId} не привязан к объекту`)

  const obj = dataOf(await api(`/objects/${objId}`)) as { obj_kind?: string; currency?: string; title?: string } | null
  const warnings: string[] = []
  // Цены отдаются числом без валюты, поэтому доллары проверяем у объекта:
  // рупии, записанные как доллары, испортили бы всю статистику цен.
  const usd = String(obj?.currency ?? '').toUpperCase() === 'USD'
  if (!usd) warnings.push(`цены объекта в ${obj?.currency ?? 'неизвестной валюте'} — в историю не пишем`)

  const units = obj?.obj_kind === 'mkd'
    ? flatsToUnits(asArray(await api('/mkd/flats?per_page=-1&with_relations=1')), objId, usd)
    : areasToUnits(asArray(await api(`/igs/areas/filter?per_page=-1&with_relations=1&obj_ids[]=${objId}`)), usd)

  if (!units.length) throw new Error(`в объекте splan.ru ${objId} нет юнитов`)
  return { units, warnings }
}

async function login(pbKey: string): Promise<string> {
  const r = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pb_key: pbKey }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!r.ok) throw new Error(`splan.ru не пустил по ключу виджета: ${r.status}`)
  const token = (await r.json() as { access_token?: string }).access_token
  if (!token) throw new Error('splan.ru не выдал токен по ключу виджета')
  return token
}

// Участок посёлка: земля своя, дом на ней — отдельная запись проекта.
function areasToUnits(rows: Array<Record<string, unknown>>, usd: boolean): ScrapedUnit[] {
  return rows.flatMap(a => {
    const key = text(a.number) || text(a.article)
    if (!key) return []
    const house = (asArray(a.house_projects)[0] ?? {}) as Record<string, unknown>
    const areaM2 = num(house.total_square)
    const priceUsd = usd ? num(a.final_with_house_price) ?? num(a.final_price) ?? num(a.total_price) : null
    return [{
      unitKey: key,
      unitType: text(house.name) || null,
      bedrooms: int(house.bedrooms_count),
      areaM2,
      landM2: num(a.square),
      floor: null,
      status: statusOf((a.area_status as Record<string, unknown> | null)?.name),
      priceUsd,
      pricePerM2: priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null,
      raw: { source: 'splan', number: key, status: text((a.area_status as Record<string, unknown> | null)?.name) },
    }]
  })
}

// Квартиры отдаются пространством целиком: фильтр по объекту этот раздел
// API игнорирует, поэтому отбираем свои по вложенному объекту.
function flatsToUnits(rows: Array<Record<string, unknown>>, objId: number, usd: boolean): ScrapedUnit[] {
  return rows.flatMap(f => {
    if (Number((f.object as Record<string, unknown> | null)?.id ?? 0) !== objId) return []
    const key = text(f.number) || text(f.article)
    if (!key) return []
    const areaM2 = num(f.square)
    const priceUsd = usd ? num(f.final_price) ?? num(f.total_price) : null
    return [{
      unitKey: key,
      unitType: text((f.mkd_flat_type as Record<string, unknown> | null)?.name) || text(f.flat_kind) || null,
      bedrooms: int(f.rooms_count),
      areaM2,
      landM2: null,
      floor: text(f.floor_flat_number) || null,
      status: statusOf((f.status as Record<string, unknown> | null)?.name),
      priceUsd,
      pricePerM2: round(num(f.final_price_per_meter)) ?? (priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null),
      raw: { source: 'splan', number: key, status: text((f.status as Record<string, unknown> | null)?.name) },
    }]
  })
}

// Названия статусов ведёт сам застройщик, и пишет их то по-русски, то
// по-английски — иногда в одном пространстве сразу двумя языками.
const STATUS_WORDS: Record<string, UnitStatus> = {
  'свободен': 'available', 'свободно': 'available', 'свободна': 'available', 'в продаже': 'available',
  'free': 'available', 'available': 'available',
  'продан': 'sold', 'продано': 'sold', 'продана': 'sold', 'sold': 'sold',
  'забронирован': 'reserved', 'забронировано': 'reserved', 'бронь': 'reserved',
  'reserved': 'reserved', 'booked': 'reserved',
}

function statusOf(v: unknown): UnitStatus {
  return STATUS_WORDS[text(v).toLowerCase()] ?? 'unknown'
}

function dataOf(v: unknown): unknown {
  return (v as { data?: unknown } | null)?.data ?? null
}

function asArray(v: unknown): Array<Record<string, unknown>> {
  const d = Array.isArray(v) ? v : dataOf(v)
  return Array.isArray(d) ? (d as Array<Record<string, unknown>>) : []
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
}

// Числа приходят и строкой с единицами («112.00 м²»), и числом, и нулём
// вместо «не задано».
function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(text(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function round(v: number | null): number | null {
  return v === null ? null : Math.round(v)
}

function int(v: unknown): number | null {
  const n = num(v)
  return n === null ? null : Math.round(n)
}
