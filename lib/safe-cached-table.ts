// Defensive wrapper around unstable_cache for "load whole table" patterns.
//
// Without this, a transient Supabase flake during a regen window
// gets cached as an empty result for the full revalidate TTL —
// every page that depends on that loader 404s for an hour.
//
// safeCachedTable() guards three failure modes:
//   1. PostgREST returned an error → throw (Next drops the slot,
//      retries on the next request).
//   2. Result is empty AND we said the table can never legitimately
//      be empty → throw (same outcome — no poisoned cache).
//   3. Result is non-empty → cache as normal.
//
// Pair with a fresh cache key whenever you adopt this on an existing
// loader so the previously-poisoned slot is invalidated on deploy.
//
// Reading by id (where null is a legitimate "not found") should NOT
// use this helper — only "load every row of <table>" patterns.

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type SafeOpts = {
  cacheKey: string         // unique slot id; bump on deploy to clear poisoned data
  table: string            // raw_villas | raw_developers | etc.
  select: string           // 'airtable_id, data, logo_url' etc.
  limit?: number           // default 2000
  revalidate?: number      // seconds, default 600 (10 min)
  // When true (default), an empty result is treated as a bug — we
  // throw so Next doesn't cache zero rows for the next hour. Set
  // false only for tables that can legitimately be empty.
  treatEmptyAsError?: boolean
}

export type RawRow = Record<string, unknown> & { airtable_id: string; data: Record<string, unknown> }

export function safeCachedTable<T = RawRow>(opts: SafeOpts): () => Promise<T[]> {
  const {
    cacheKey, table, select,
    limit = 2000, revalidate = 600,
    treatEmptyAsError = true,
  } = opts

  return unstable_cache(
    async (): Promise<T[]> => {
      const { data, error } = await sb.from(table).select(select).limit(limit)
      if (error) {
        // Throwing prevents the empty/null fallback from being
        // committed to the cache slot — Next discards the failure
        // and re-tries on the next request.
        throw new Error(`safeCachedTable(${table}): ${error.message}`)
      }
      const rows = (data ?? []) as T[]
      if (treatEmptyAsError && rows.length === 0) {
        throw new Error(`safeCachedTable(${table}): refusing to cache empty result`)
      }
      return rows
    },
    [cacheKey],
    { revalidate },
  )
}
