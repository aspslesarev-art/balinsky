// Per-request cached developer track-record stats. Loads every
// complex once per request and groups them by developer name; detail
// pages then ask `getDeveloperStats(name)` and get back
// `{ ready, total }` without re-querying Supabase.
//
// Used to enrich wishlist snapshots so the comparison table can show
// "✓ 14 ready · 3 in progress" next to a builder's name without a
// per-row server round-trip.

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { buildDeveloperStats, type ComplexStats } from './developer-score'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// buildDeveloperStats only reads these four complex fields — projecting them
// out of the `data` JSONB (~8MB for the full column) drops the response to
// ~14KB, which also lets unstable_cache actually store it (the cache store has
// the same ~2MB ceiling as the fetch cache). `->` returns the raw JSON value,
// so reconstructing { data: {...} } is byte-identical to the old full read.
type StatRow = { dev: unknown; status: unknown; ready: unknown; units: unknown }
const CPX_STATS_SELECT =
  'dev:data->Developer1,' +
  'status:data->"Статус",' +
  'ready:data->"Готовность",' +
  'units:data->"Total quantity of units"'

// Cross-request cache of the slim rows (serialisable — unstable_cache can't
// store a Map). At ~10k req/day this collapsed raw_complexes reads to ~hourly.
const _loadStatRows = unstable_cache(
  async (): Promise<StatRow[]> => {
    const { data } = await sb.from('raw_complexes').select(CPX_STATS_SELECT).limit(2000)
    return (data ?? []) as unknown as StatRow[]
  },
  ['developer-stat-rows-v1'],
  { revalidate: 3600 },
)

// Per-request map build from the cached rows (react cache dedups within a render).
export const loadAllDeveloperStats = cache(async (): Promise<Map<string, ComplexStats>> => {
  const rows = (await _loadStatRows()).map(r => ({
    data: {
      Developer1: r.dev,
      'Статус': r.status,
      'Готовность': r.ready,
      'Total quantity of units': r.units,
    } as Record<string, unknown>,
  }))
  return buildDeveloperStats(rows)
})

const loadAllStats = loadAllDeveloperStats

export type DeveloperStats = ComplexStats & {
  inProgress: number
  unitsInProgress: number
}

export async function getDeveloperStats(
  name: string | null | undefined,
): Promise<DeveloperStats | null> {
  if (!name) return null
  const all = await loadAllStats()
  const trimmed = name.trim()
  // Try exact match, then case-insensitive — Airtable spelling varies.
  let match = all.get(trimmed)
  if (!match) {
    const lc = trimmed.toLowerCase()
    for (const [k, v] of all) {
      if (k.toLowerCase() === lc) { match = v; break }
    }
  }
  if (!match) return null
  return {
    total: match.total,
    ready: match.ready,
    unitsTotal: match.unitsTotal,
    unitsReady: match.unitsReady,
    inProgress: Math.max(0, match.total - match.ready),
    unitsInProgress: Math.max(0, match.unitsTotal - match.unitsReady),
  }
}
