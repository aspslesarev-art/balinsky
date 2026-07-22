// Process-memory cache with a TTL *and* a content-revision guard.
//
// The catalog loaders can't use unstable_cache (their datasets exceed the 2 MB
// per-item limit), so they cache in module memory — which revalidateTag can't
// touch. Wrapping them here means an admin edit still lands promptly: the
// revision bumped by the mutation invalidates the entry ahead of its TTL.
//
// The TTL stays as the backstop for anything that changes without a bump.

import { contentRev } from './content-version'

/**
 * @param kinds content kinds this dataset is built from — a bump on ANY of
 *   them drops the entry (the complexes catalog, for instance, folds in villa
 *   and apartment prices).
 * @param ttlMs upper bound on staleness when no bump arrives.
 * @param build loader to run on a miss; concurrent callers share one run.
 */
export function revisionedCache<T>(
  kinds: readonly string[],
  ttlMs: number,
  build: () => Promise<T>,
): () => Promise<T> {
  let cache: { ts: number; sig: string; data: T } | null = null
  let inflight: Promise<T> | null = null

  async function signature(): Promise<string> {
    const revs = await Promise.all(kinds.map(k => contentRev(k)))
    return revs.join('.')
  }

  return async function load(): Promise<T> {
    const sig = await signature()
    if (cache && cache.sig === sig && Date.now() - cache.ts < ttlMs) return cache.data
    if (inflight) return inflight
    inflight = build()
      .then(data => { cache = { ts: Date.now(), sig, data }; return data })
      .finally(() => { inflight = null })
    return inflight
  }
}
