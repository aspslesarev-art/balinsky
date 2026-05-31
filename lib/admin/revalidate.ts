// Refresh the public site after an admin data mutation. Reuses the shared
// kind → tag/paths map so behaviour matches the sync-driven
// /api/revalidate-content endpoint exactly.

import { revalidateTag, revalidatePath } from 'next/cache'
import { KIND_TO_TAGS, KIND_TO_PATHS } from '@/lib/content-revalidate-map'
import type { CollectionConfig } from './adapters/types'

export function revalidateCollection(cfg: CollectionConfig): void {
  const kind = cfg.revalidateKind
  if (!kind) return
  const tag = KIND_TO_TAGS[kind]
  if (tag) revalidateTag(tag, 'max')
  for (const route of KIND_TO_PATHS[kind] ?? []) {
    revalidatePath(route.path, route.type)
  }
}
