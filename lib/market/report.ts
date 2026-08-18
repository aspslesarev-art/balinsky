// Выборки для страницы трекера рынка. Всё считается в базе, страница
// только раскладывает результат.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sbAdmin } from './apply'

export type StockRow = {
  developer: string
  complex: string
  available: number
  reserved: number
  sold: number
  unknown: number
  total: number
  available_value_usd: number | null
  last_seen: string | null
}

export type EventRow = {
  d: string
  kind: string
  developer: string
  complex: string
  unit_key: string
  unit_type: string | null
  area_m2: number | null
  old_status: string | null
  new_status: string | null
  old_price: number | null
  new_price: number | null
  price_change_pct: number | null
}

export type SourceHealth = {
  developer: string
  complex: string
  source_kind: string
  source_url: string
  last_status: string | null
  last_error: string | null
  last_units: number | null
  last_scan_at: string | null
}

export type MarketReport = {
  totals: {
    tracked: number
    available: number
    reserved: number
    sold: number
    unknown: number
    availableValueUsd: number
  }
  soldCounts: { today: number; week: number; month: number }
  returned: EventRow[]
  priceMoves: EventRow[]
  recentSold: EventRow[]
  stock: StockRow[]
  health: { ok: number; error: number; pending: number; problems: SourceHealth[] }
  coverage: { kind: string; count: number; scanned: number }[]
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10)
}

export async function loadMarketReport(sb: SupabaseClient = sbAdmin()): Promise<MarketReport> {
  const [totals, soldCounts, returned, priceMoves, recentSold, stock, health, coverage] = await Promise.all([
    loadTotals(sb),
    loadSoldCounts(sb),
    loadEvents(sb, ['returned'], 30, 50),
    loadEvents(sb, ['price_up', 'price_down'], 30, 60),
    loadEvents(sb, ['sold'], 30, 60),
    loadStock(sb),
    loadHealth(sb),
    loadCoverage(sb),
  ])
  return { totals, soldCounts, returned, priceMoves, recentSold, stock, health, coverage }
}

async function loadTotals(sb: SupabaseClient): Promise<MarketReport['totals']> {
  const { data } = await sb.from('market_current_stock').select('*')
  const rows = (data ?? []) as StockRow[]
  return rows.reduce(
    (acc, r) => ({
      tracked: acc.tracked + Number(r.total ?? 0),
      available: acc.available + Number(r.available ?? 0),
      reserved: acc.reserved + Number(r.reserved ?? 0),
      sold: acc.sold + Number(r.sold ?? 0),
      unknown: acc.unknown + Number(r.unknown ?? 0),
      availableValueUsd: acc.availableValueUsd + Number(r.available_value_usd ?? 0),
    }),
    { tracked: 0, available: 0, reserved: 0, sold: 0, unknown: 0, availableValueUsd: 0 },
  )
}

async function loadSoldCounts(sb: SupabaseClient): Promise<MarketReport['soldCounts']> {
  const count = async (from: string) => {
    const { count } = await sb
      .from('market_unit_events')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'sold')
      .gte('d', from)
    return count ?? 0
  }
  const [today, week, month] = await Promise.all([count(daysAgo(0)), count(daysAgo(7)), count(daysAgo(30))])
  return { today, week, month }
}

async function loadEvents(sb: SupabaseClient, kinds: string[], days: number, limit: number): Promise<EventRow[]> {
  const { data } = await sb
    .from('market_events_feed')
    .select('*')
    .in('kind', kinds)
    .gte('d', daysAgo(days))
    .order('d', { ascending: false })
    .limit(limit)
  return (data ?? []) as EventRow[]
}

async function loadStock(sb: SupabaseClient): Promise<StockRow[]> {
  const { data } = await sb.from('market_current_stock').select('*').order('available_value_usd', { ascending: false, nullsFirst: false })
  return (data ?? []) as StockRow[]
}

async function loadHealth(sb: SupabaseClient): Promise<MarketReport['health']> {
  const { data } = await sb
    .from('market_sources')
    .select('developer, complex, source_kind, source_url, last_status, last_error, last_units, last_scan_at')
    .eq('active', true)
  const rows = (data ?? []) as SourceHealth[]
  // Пустое предупреждение в last_error при статусе ok — это заметка
  // разбора, а не поломка; в проблемы такие строки тоже показываем,
  // потому что именно там видно «статус не определился».
  const problems = rows
    .filter(r => r.last_status === 'error' || (r.last_status === 'ok' && r.last_error))
    .sort((a, b) => (a.last_status === 'error' ? -1 : 1) - (b.last_status === 'error' ? -1 : 1))
    .slice(0, 40)
  return {
    ok: rows.filter(r => r.last_status === 'ok').length,
    error: rows.filter(r => r.last_status === 'error').length,
    pending: rows.filter(r => !r.last_status).length,
    problems,
  }
}

async function loadCoverage(sb: SupabaseClient): Promise<MarketReport['coverage']> {
  const { data } = await sb.from('market_sources').select('source_kind, last_status').eq('active', true)
  const rows = (data ?? []) as Array<{ source_kind: string; last_status: string | null }>
  const map = new Map<string, { count: number; scanned: number }>()
  for (const r of rows) {
    const e = map.get(r.source_kind) ?? { count: 0, scanned: 0 }
    e.count++
    if (r.last_status) e.scanned++
    map.set(r.source_kind, e)
  }
  return [...map.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.count - a.count)
}
