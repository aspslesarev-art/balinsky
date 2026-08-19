// Сквозной срез по всем юнитам рынка — без захода в конкретный комплекс.
//
// Отдаём таблицу целиком и фильтруем на клиенте: несколько тысяч строк в
// компактном виде весят немного, зато любой фильтр и сортировка работают
// мгновенно, без похода на сервер на каждый чих.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sbAdmin } from './apply'
import type { UnitStatus } from './types'
import type { UnitKind } from './classify'

export type MarketUnitRow = {
  id: number
  developer: string
  complex: string
  unit_key: string
  kind: UnitKind | null
  building: string | null
  unit_type: string | null
  bedrooms: number | null
  area_m2: number | null
  status: UnitStatus
  price_usd: number | null
  price_per_m2: number | null
  sold_at: string | null
  returned_count: number
  // Насколько цена сдвинулась за период наблюдения, в процентах.
  // null — цена не менялась.
  priceChangePct: number | null
}

export type MarketUnitsReport = {
  units: MarketUnitRow[]
  trackingSince: string | null
}

export async function loadMarketUnits(
  opts: { days?: number; sb?: SupabaseClient } = {},
): Promise<MarketUnitsReport> {
  const sb = opts.sb ?? sbAdmin()
  const days = opts.days ?? 90
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)

  const [rows, moves, trackingSince] = await Promise.all([
    loadUnits(sb),
    loadPriceMoves(sb, since),
    loadTrackingSince(sb),
  ])

  const units: MarketUnitRow[] = rows.map(u => ({
    ...u,
    price_usd: u.price_usd === null ? null : Number(u.price_usd),
    price_per_m2: u.price_per_m2 === null ? null : Number(u.price_per_m2),
    area_m2: u.area_m2 === null ? null : Number(u.area_m2),
    priceChangePct: moves.get(u.id) ?? null,
  }))

  return {
    units,
    trackingSince,
  }
}

// Дата, с которой вообще идёт наблюдение. Отдельным запросом, потому что
// в выборке юнитов сами даты больше не участвуют.
async function loadTrackingSince(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb
    .from('market_units')
    .select('first_seen')
    .order('first_seen', { ascending: true })
    .limit(1)
  return (data?.[0] as { first_seen?: string } | undefined)?.first_seen ?? null
}

type RawUnit = Omit<MarketUnitRow, 'priceChangePct'>

async function loadUnits(sb: SupabaseClient): Promise<RawUnit[]> {
  const out: RawUnit[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('market_units')
      // Даты первого и последнего среза на этой странице не показываются,
      // а на трёх с половиной тысячах строк они заметно утяжеляют ответ —
      // они есть в карточке комплекса.
      .select('id, developer, complex, unit_key, kind, building, unit_type, bedrooms, area_m2, status, price_usd, price_per_m2, sold_at, returned_count')
      .order('developer', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`чтение market_units: ${error.message}`)
    if (!data?.length) break
    out.push(...(data as RawUnit[]))
    if (data.length < 1000) break
  }
  return out
}

// Суммарный сдвиг цены по юниту: от самой ранней «было» до самой поздней
// «стало». Промежуточные шаги здесь не нужны — они видны в карточке
// комплекса.
async function loadPriceMoves(sb: SupabaseClient, since: string): Promise<Map<number, number>> {
  const first = new Map<number, { d: string; price: number }>()
  const last = new Map<number, { d: string; price: number }>()

  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from('market_unit_events')
      .select('unit_id, d, kind, old_price, new_price')
      .in('kind', ['price_up', 'price_down'])
      .gte('d', since)
      .order('d', { ascending: true })
      .range(from, from + 999)
    if (!data?.length) break

    for (const e of data as Array<{ unit_id: number; d: string; old_price: number | null; new_price: number | null }>) {
      if (e.old_price !== null && !first.has(e.unit_id)) first.set(e.unit_id, { d: e.d, price: Number(e.old_price) })
      if (e.new_price !== null) last.set(e.unit_id, { d: e.d, price: Number(e.new_price) })
    }
    if (data.length < 1000) break
  }

  const out = new Map<number, number>()
  for (const [unitId, from] of first) {
    const to = last.get(unitId)
    if (!to || !from.price || to.price === from.price) continue
    out.set(unitId, ((to.price - from.price) / from.price) * 100)
  }
  return out
}
