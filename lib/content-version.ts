// Flush signal for the module-level caches that revalidateTag can't reach.
//
// The three catalog loaders (app/ru/{villy,apartamenty,zhilye-kompleksy}/_lib.ts)
// and the detail-page by-id caches hold their data in plain process memory —
// unstable_cache can't take it (villa rows exceed the 2 MB per-item limit).
// Next's cache APIs have no way to invalidate process memory, so before this
// existed an admin edit stayed invisible for the full TTL on every warm
// instance.
//
// Contract: an admin mutation bumps the row for its kind; loaders compare the
// revision they cached against the current one and rebuild when it moved.
// Reads are batched (one small query covering every kind) and memoised for
// REV_TTL_MS, so this costs at most two round-trips per minute per instance.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// How stale a revision reading may be. This is the floor on how fast an admin
// edit can surface, so keep it well under the loaders' own TTLs.
const REV_TTL_MS = 30_000

type RevMap = Record<string, number>

let _revs: { ts: number; data: RevMap } | null = null
let _inflight: Promise<RevMap> | null = null

async function fetchRevs(): Promise<RevMap> {
  const { data, error } = await sb.from('content_version').select('kind, rev')
  if (error) throw new Error(`content_version: ${error.message}`)
  const out: RevMap = {}
  for (const r of (data ?? []) as { kind: string; rev: number }[]) out[r.kind] = Number(r.rev)
  return out
}

async function loadRevs(): Promise<RevMap> {
  if (_revs && Date.now() - _revs.ts < REV_TTL_MS) return _revs.data
  if (_inflight) return _inflight
  _inflight = fetchRevs()
    .then(data => { _revs = { ts: Date.now(), data }; return data })
    .catch(() => {
      // A hiccup on the version table must never take the catalog down — fall
      // back to the last known revisions (or "no signal"), which leaves the
      // caller's own TTL as the freshness guarantee.
      return _revs?.data ?? {}
    })
    .finally(() => { _inflight = null })
  return _inflight
}

/**
 * Current revision for a content kind (`villas`, `complexes`, …).
 * Returns 0 when the kind has never been bumped or the table is unreachable —
 * callers treat that as "no signal" and fall back to their TTL.
 */
export async function contentRev(kind: string): Promise<number> {
  return (await loadRevs())[kind] ?? 0
}

/** Bump a kind's revision. Called after every admin mutation. */
export async function bumpContentRev(kind: string): Promise<void> {
  const { error } = await sb.rpc('bump_content_version', { p_kind: kind })
  if (error) throw new Error(`bump_content_version(${kind}): ${error.message}`)
  _revs = null // this instance must not serve its own pre-bump reading
}
