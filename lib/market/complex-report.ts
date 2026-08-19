// Данные для карточки одного комплекса: что продавалось, когда и почём,
// и как двигались цены по каждому юниту.
//
// Комплекс адресуется парой застройщик+название, а не источником: один
// комплекс нередко разложен по нескольким листам (виллы отдельно,
// апартаменты отдельно), и в отчёте они должны быть вместе.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sbAdmin } from './apply'
import type { UnitStatus } from './types'

export type ComplexUnit = {
  id: number
  unit_key: string
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

export type PriceTrack = {
  unit_key: string
  currentPrice: number | null
  status: UnitStatus
  changes: Array<{ d: string; from: number | null; to: number | null }>
}

export type ComplexReport = {
  developer: string
  complex: string
  units: ComplexUnit[]
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
    .select('id, unit_key, unit_type, bedrooms, area_m2, status, price_usd, price_per_m2, first_seen, last_seen, sold_at, returned_count')
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
    units,
    totals: totals(units),
    salesByDay: salesByDay(soldEvents, days),
    soldEvents,
    priceTracks: priceTracks(units, decorated),
    otherEvents: decorated.filter(e => e.kind === 'returned' || e.kind === 'reserved' || e.kind === 'gone'),
    sources: await loadSources(sb, developer, complex),
  }
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
