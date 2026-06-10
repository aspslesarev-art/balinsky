import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Smart default ordering for the catalogs: rank by "coolness" (villa
// investment score), popularity (page views) and freshness, then add a small
// time-bucketed jitter so the list rotates over the day without breaking
// pagination or caching (the order is stable within a bucket). TOP-pinned
// listings are handled separately by each catalog and stay on top.

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type ViewKind = 'villa' | 'apartment' | 'complex'

// Aggregate page_views → {airtable_id: count} over a recent window. Projected
// select (id column only) + JS tally, cached so the table is read rarely.
async function _viewCounts(kind: ViewKind): Promise<Record<string, number>> {
  const since = new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString()
  const { data, error } = await sb
    .from('page_views')
    .select('airtable_id')
    .eq('kind', kind)
    .gte('created_at', since)
    .not('airtable_id', 'is', null)
    .limit(200000)
  if (error || !data) return {}
  const out: Record<string, number> = {}
  for (const r of data as { airtable_id: string | null }[]) {
    const id = r.airtable_id
    if (id) out[id] = (out[id] ?? 0) + 1
  }
  return out
}

export async function loadViewCounts(kind: ViewKind): Promise<Record<string, number>> {
  return unstable_cache(() => _viewCounts(kind), ['view-counts-v1', kind], {
    revalidate: 1800,
    tags: ['content:views'],
  })()
}

// Deterministic 0..1 hash of a string (FNV-1a) — used for the rotation jitter.
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 100000) / 100000
}

// The shuffle re-seeds every ~3h, so the catalog "breathes" through the day but
// stays consistent across pages within that window.
const BUCKET_MS = 3 * 3600 * 1000
function currentBucket(): string {
  return String(Math.floor(Date.now() / BUCKET_MS))
}

export type RankInput = {
  id: string
  investmentScore?: number | null // 0..100 (villas only)
  views?: number
  updatedMs?: number | null
  hasPhoto?: boolean
}

// Balanced jitter: top items stay near the top, tiers shuffle within themselves.
const JITTER = 0.16

/**
 * Sort items by the smart composite (descending). Pure of TOP-pins — apply
 * those after. `get` maps each item to its ranking signals.
 */
export function smartSort<T>(items: T[], get: (t: T) => RankInput): T[] {
  const bucket = currentBucket()
  const inputs = items.map(get)
  const maxViews = inputs.reduce((m, i) => Math.max(m, i.views ?? 0), 0)
  const hasInvestment = inputs.some(i => i.investmentScore != null)
  const now = Date.now()

  const scored = items.map((t, idx) => {
    const i = inputs[idx]
    const inv = i.investmentScore != null ? Math.max(0, Math.min(1, i.investmentScore / 100)) : 0.45
    const views = maxViews > 0 ? Math.log1p(i.views ?? 0) / Math.log1p(maxViews) : 0
    const ageDays = i.updatedMs ? (now - i.updatedMs) / 864e5 : 200
    const recency = Math.max(0, 1 - ageDays / 365)
    const photo = i.hasPhoto ? 1 : 0
    const quality = hasInvestment
      ? 0.44 * inv + 0.28 * views + 0.18 * recency + 0.10 * photo
      : 0.50 * views + 0.34 * recency + 0.16 * photo
    const score = quality + JITTER * hash01(`${i.id}:${bucket}`)
    return { t, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map(x => x.t)
}
