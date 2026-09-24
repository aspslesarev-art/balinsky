import { permanentRedirect } from 'next/navigation'
import { VillasCatalog } from '../../ru/villy/_catalog'
import { parseQueryFilters, buildMetadataLoc, hasAnyFilter, loadAll } from '../../ru/villy/_lib'
import { buildCanonicalPath } from '@/lib/villa-seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { villaCategoryStats } from '@/lib/category-stats'
import { hubPath } from '@/lib/hub-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  // EN has no canonical sub-route tree of its own — keep canonical at the
  // flat base path and rely on noindex for filtered combos to avoid
  // SEO duplication.
  const base = buildMetadataLoc(f, 'ban', {
    canonicalPath: '/ban/vila',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
  // TASK-13c: commercial "number + price + USP" meta on the bare category root.
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'villas', locale: 'ban', ...villaCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  // A filter combo that has a clean hub URL 308s onto it, so ?district=…
  // links consolidate on the indexable hub path (lib/hub-routes.ts).
  const canonical = buildCanonicalPath(filters)
  const localCanonical = canonical ? hubPath(canonical, 'ban') : null
  if (localCanonical && canonical !== '/ru/villy' && hasAnyFilter(filters)) {
    permanentRedirect(localCanonical)
  }
  return <VillasCatalog filters={filters} page={1} basePath="/ban/vila" lang="ban" />
}
