// Refresh the public site after an admin data mutation.
//
// Three layers have to be poked, and missing any one of them is what made
// admin edits look like they "didn't do anything":
//   1. content_version — the only way to flush the module-level caches in
//      app/ru/*/_lib.ts, which Next's cache APIs cannot reach.
//   2. cache tags + ISR paths — via the shared kind → tag/paths map, which
//      now covers all ten locales rather than just /ru and /en.
//   3. the slug → id index the detail pages resolve through.

import { revalidateTag, revalidatePath } from 'next/cache'
import { KIND_TO_TAGS, KIND_TO_PATHS } from '@/lib/content-revalidate-map'
import { bumpContentRev } from '@/lib/content-version'
import { syncDetailIndexEntry } from './detail-index'
import type { CollectionConfig } from './adapters/types'

/**
 * @param id record that changed, when known — its detail-index entry is
 *   refreshed too, since a create, a re-slug or a delete otherwise leaves
 *   the index pointing at the wrong row.
 */
export async function revalidateCollection(cfg: CollectionConfig, id?: string): Promise<void> {
  if (id) await syncDetailIndexEntry(cfg, id)

  const kind = cfg.revalidateKind
  if (!kind) return

  // Bump first: the tag/path invalidation below can trigger a regeneration
  // right away, and it must not rebuild from a stale module cache.
  await bumpContentRev(kind)

  const tag = KIND_TO_TAGS[kind]
  if (tag) revalidateTag(tag, 'max')
  for (const route of KIND_TO_PATHS[kind] ?? []) {
    revalidatePath(route.path, route.type)
  }
}
