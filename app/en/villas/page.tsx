import { permanentRedirect } from 'next/navigation'
import { VillasCatalog } from '../../ru/villy/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter, loadAll } from '../../ru/villy/_lib'
import { buildCanonicalPath } from '@/lib/villa-seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { hubPath } from '@/lib/hub-routes'
import { villaCategoryStats } from '@/lib/category-stats'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  // EN has no canonical sub-route tree of its own — keep canonical at the
  // flat base path and rely on noindex for filtered combos to avoid
  // SEO duplication.
  const base = buildMetadataEn(f, {
    canonicalPath: '/en/villas',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
  // TASK-13c: commercial "number + price + USP" meta on the bare category root.
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'villas', locale: 'en', ...villaCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  // Same as RU: a filter combo that has a clean hub URL 308s onto it, so
  // ?district=… links consolidate on the indexable hub path.
  const canonical = buildCanonicalPath(filters)
  const localCanonical = canonical ? hubPath(canonical, 'en') : null
  if (localCanonical && canonical !== '/ru/villy' && hasAnyFilter(filters)) {
    permanentRedirect(localCanonical)
  }
  return <VillasCatalog filters={filters} page={1} basePath="/en/villas" lang="en" />
}
