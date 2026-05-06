// Per-request cached developer track-record stats. Loads every
// complex once per request and groups them by developer name; detail
// pages then ask `getDeveloperStats(name)` and get back
// `{ ready, total }` without re-querying Supabase.
//
// Used to enrich wishlist snapshots so the comparison table can show
// "✓ 14 ready · 3 in progress" next to a builder's name without a
// per-row server round-trip.

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { buildDeveloperStats, type ComplexStats } from './developer-score'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const loadAllStats = cache(async (): Promise<Map<string, ComplexStats>> => {
  const { data } = await sb.from('raw_complexes').select('data').limit(2000)
  return buildDeveloperStats((data ?? []) as { data: Record<string, unknown> }[])
})

export type DeveloperStats = ComplexStats & { inProgress: number }

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
    inProgress: Math.max(0, match.total - match.ready),
  }
}
