// Данные для карточки одного комплекса: что продавалось, когда и почём,
// и как двигались цены по каждому юниту.
//
// Комплекс адресуется парой застройщик+название, а не источником: один
// комплекс нередко разложен по нескольким листам (виллы отдельно,
// апартаменты отдельно), и в отчёте они должны быть вместе.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sbAdmin } from './apply'
import type { UnitStatus } from './types'
import { KIND_LABEL, type UnitKind } from './classify'

export type ComplexUnit = {
  id: number
  unit_key: string
  kind: UnitKind | null
  building: string | null
  unit_type: string | null
  bedrooms: number | null
  area_m2: number | null
  status: UnitStatus
  price_usd: number | null
  price_per_m2: number | null
  first_seen: string
  last_seen: string
  sold_at: string | null
  returned_count: number
}

export type ComplexEvent = {
  d: string
  kind: string
  unit_key: string
  unit_type: string | null
  area_m2: number | null
  old_price: number | null
  new_price: number | null
  old_status: string | null
  new_status: string | null
}

export type SalesDay = { d: string; sold: number; valueUsd: number }

// Точка истории юнита. Хранятся только моменты, когда что-то изменилось,
// плюс первый и последний день наблюдения: иначе на странице оказались бы
// десятки тысяч одинаковых строк «то же самое, что вчера».
export type UnitPoint = { d: string; status: UnitStatus; price: number | null }

export type PriceTrack = {
  unit_key: string
  currentPrice: number | null
  status: UnitStatus
  changes: Array<{ d: string; from: number | null; to: number | null }>
}

// Группа внутри комплекса: корпус, если застройщик его назвал, иначе
// тип продукта. Это тот самый уровень между комплексом и юнитом.
export type ComplexGroup = {
  key: string
  label: string
  kind: UnitKind | null
  building: string | null
  units: number
  available: number
  reserved: number
  sold: number
  soldPct: number | null
  availableValueUsd: number
  avgAreaM2: number | null
  avgPriceUsd: number | null
}

export type ComplexReport = {
  developer: string
  complex: string
  // Дата, с которой трекер видит этот комплекс. Всё, что было продано
  // раньше, попало к нам уже со статусом «продан» и в графике продаж не
  // отражается — там только переходы, случившиеся при нас.
  trackingSince: string
  units: ComplexUnit[]
  groups: ComplexGroup[]
  totals: {
    available: number
    reserved: number
    sold: number
    unknown: number
    availableValueUsd: number
    soldValueUsd: number
  }
  salesByDay: SalesDay[]
  soldEvents: ComplexEvent[]
  priceTracks: PriceTrack[]
  // unit.id → сжатая история наблюдений
  history: Record<number, UnitPoint[]>
  otherEvents: ComplexEvent[]
  sources: Array<{ source_url: string; source_kind: string; last_scan_at: string | null; last_status: string | null; last_error: string | null }>
}

export async function loadComplexReport(
  developer: string,
  complex: string,
  opts: { days?: number; sb?: SupabaseClient } = {},
): Promise<ComplexReport | null> {
  const sb = opts.sb ?? sbAdmin()
  const days = opts.days ?? 60

  const { data: unitRows } = await sb
    .from('market_units')
    .select('id, unit_key, kind, building, unit_type, bedrooms, area_m2, status, price_usd, price_per_m2, first_seen, last_seen, sold_at, returned_count')
    .eq('developer', developer)
    .eq('complex', complex)
    .order('unit_key', { ascending: true })

  const units = (unitRows ?? []) as ComplexUnit[]
  if (!units.length) return null

  const ids = units.map(u => u.id)
  const byId = new Map(units.map(u => [u.id, u]))

  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const events = await loadEvents(sb, ids, since)
  const decorated: ComplexEvent[] = events.map(e => {
    const u = byId.get(e.unit_id)
    return {
      d: e.d,
      kind: e.kind,
      unit_key: u?.unit_key ?? '—',
      unit_type: u?.unit_type ?? null,
      area_m2: u?.area_m2 ?? null,
      old_price: e.old_price,
      new_price: e.new_price,
      old_status: e.old_status,
      new_status: e.new_status,
    }
  })

  const soldEvents = decorated.filter(e => e.kind === 'sold')

  return {
    developer,
    complex,
    trackingSince: units.reduce((min, u) => (u.first_seen < min ? u.first_seen : min), units[0].first_seen),
    units,
    groups: groupsOf(units),
    totals: totals(units),
    salesByDay: salesByDay(soldEvents, days),
    soldEvents,
    priceTracks: priceTracks(units, decorated),
    history: await loadHistory(sb, ids, since),
    otherEvents: decorated.filter(e => e.kind === 'returned' || e.kind === 'reserved' || e.kind === 'gone'),
    sources: await loadSources(sb, developer, complex),
  }
}

export function groupKeyOf(u: Pick<ComplexUnit, 'kind' | 'building'>): string {
  return (u.building?.trim() || u.kind || 'unknown')
}

function groupsOf(units: ComplexUnit[]): ComplexGroup[] {
  const map = new Map<string, ComplexUnit[]>()
  for (const u of units) {
    const key = groupKeyOf(u)
    map.set(key, [...(map.get(key) ?? []), u])
  }

  const out: ComplexGroup[] = [...map.entries()].map(([key, list]) => {
    const known = list.filter(u => u.status !== 'unknown').length
    const sold = list.filter(u => u.status === 'sold').length
    const areas = list.map(u => u.area_m2).filter((v): v is number => v !== null)
    const prices = list.map(u => u.price_usd).filter((v): v is number => v !== null)
    const kind = list[0].kind ?? null
    return {
      key,
      // Корпус называем как назвал застройщик, иначе — типом продукта.
      label: list[0].building?.trim() || KIND_LABEL[kind ?? 'unknown'],
      kind,
      building: list[0].building ?? null,
      units: list.length,
      available: list.filter(u => u.status === 'available').length,
      reserved: list.filter(u => u.status === 'reserved').length,
      sold,
      soldPct: known ? Math.round((sold / known) * 1000) / 10 : null,
      availableValueUsd: list
        .filter(u => u.status === 'available')
        .reduce((s, u) => s + Number(u.price_usd ?? 0), 0),
      avgAreaM2: areas.length ? Math.round(areas.reduce((s, v) => s + Number(v), 0) / areas.length) : null,
      avgPriceUsd: prices.length ? Math.round(prices.reduce((s, v) => s + Number(v), 0) / prices.length) : null,
    }
  })

  return out.sort((a, b) => b.units - a.units)
}

function totals(units: ComplexUnit[]): ComplexReport['totals'] {
  return units.reduce(
    (acc, u) => ({
      available: acc.available + (u.status === 'available' ? 1 : 0),
      reserved: acc.reserved + (u.status === 'reserved' ? 1 : 0),
      sold: acc.sold + (u.status === 'sold' ? 1 : 0),
      unknown: acc.unknown + (u.status === 'unknown' ? 1 : 0),
      availableValueUsd: acc.availableValueUsd + (u.status === 'available' ? Number(u.price_usd ?? 0) : 0),
      soldValueUsd: acc.soldValueUsd + (u.status === 'sold' ? Number(u.price_usd ?? 0) : 0),
    }),
    { available: 0, reserved: 0, sold: 0, unknown: 0, availableValueUsd: 0, soldValueUsd: 0 },
  )
}

// Ряд для столбиков: день без продаж остаётся с нулём, чтобы на графике
// была видна пауза, а не склеенные подряд продажи.
function salesByDay(soldEvents: ComplexEvent[], days: number): SalesDay[] {
  const byDay = new Map<string, { sold: number; valueUsd: number }>()
  for (const e of soldEvents) {
    const cur = byDay.get(e.d) ?? { sold: 0, valueUsd: 0 }
    cur.sold++
    cur.valueUsd += Number(e.old_price ?? e.new_price ?? 0)
    byDay.set(e.d, cur)
  }

  const out: SalesDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10)
    const v = byDay.get(d)
    out.push({ d, sold: v?.sold ?? 0, valueUsd: v?.valueUsd ?? 0 })
  }
  return out
}

// История цены нужна только там, где цена реально двигалась — иначе
// список превращается в копию каталога.
function priceTracks(units: ComplexUnit[], events: ComplexEvent[]): PriceTrack[] {
  const moves = new Map<string, PriceTrack['changes']>()
  for (const e of events) {
    if (e.kind !== 'price_up' && e.kind !== 'price_down') continue
    const list = moves.get(e.unit_key) ?? []
    list.push({ d: e.d, from: e.old_price === null ? null : Number(e.old_price), to: e.new_price === null ? null : Number(e.new_price) })
    moves.set(e.unit_key, list)
  }

  return units
    .filter(u => moves.has(u.unit_key))
    .map(u => ({
      unit_key: u.unit_key,
      currentPrice: u.price_usd === null ? null : Number(u.price_usd),
      status: u.status,
      changes: (moves.get(u.unit_key) ?? []).sort((a, b) => a.d.localeCompare(b.d)),
    }))
}

// Дневные срезы, сжатые до точек изменения. День, в который у юнита ни
// цена, ни статус не отличаются от предыдущего, ничего не рассказывает.
async function loadHistory(
  sb: SupabaseClient,
  unitIds: number[],
  since: string,
): Promise<Record<number, UnitPoint[]>> {
  const raw = new Map<number, UnitPoint[]>()

  for (let i = 0; i < unitIds.length; i += 300) {
    for (let from = 0; ; from += 1000) {
      const { data } = await sb
        .from('market_unit_daily')
        .select('unit_id, d, status, price_usd')
        .in('unit_id', unitIds.slice(i, i + 300))
        .gte('d', since)
        .order('d', { ascending: true })
        .range(from, from + 999)
      if (!data?.length) break
      for (const row of data as Array<{ unit_id: number; d: string; status: UnitStatus; price_usd: number | null }>) {
        const list = raw.get(row.unit_id) ?? []
        list.push({ d: row.d, status: row.status, price: row.price_usd === null ? null : Number(row.price_usd) })
        raw.set(row.unit_id, list)
      }
      if (data.length < 1000) break
    }
  }

  const out: Record<number, UnitPoint[]> = {}
  for (const [unitId, points] of raw) {
    const sorted = points.sort((a, b) => a.d.localeCompare(b.d))
    const kept: UnitPoint[] = []
    for (const [idx, p] of sorted.entries()) {
      const prev = sorted[idx - 1]
      const changed = !prev || prev.status !== p.status || prev.price !== p.price
      const isEdge = idx === 0 || idx === sorted.length - 1
      if (changed || isEdge) kept.push(p)
    }
    out[unitId] = kept
  }
  return out
}

type RawEvent = {
  unit_id: number
  d: string
  kind: string
  old_price: number | null
  new_price: number | null
  old_status: string | null
  new_status: string | null
}

async function loadEvents(sb: SupabaseClient, unitIds: number[], since: string): Promise<RawEvent[]> {
  const out: RawEvent[] = []
  // Список id бывает в тысячи элементов — режем на порции, иначе запрос
  // упирается в длину URL.
  for (let i = 0; i < unitIds.length; i += 300) {
    const { data } = await sb
      .from('market_unit_events')
      .select('unit_id, d, kind, old_price, new_price, old_status, new_status')
      .in('unit_id', unitIds.slice(i, i + 300))
      .gte('d', since)
      .order('d', { ascending: false })
    out.push(...((data ?? []) as RawEvent[]))
  }
  return out
}

async function loadSources(sb: SupabaseClient, developer: string, complex: string) {
  const { data } = await sb
    .from('market_sources')
    .select('source_url, source_kind, last_scan_at, last_status, last_error')
    .eq('developer', developer)
    .eq('complex', complex)
  return (data ?? []) as ComplexReport['sources']
}
