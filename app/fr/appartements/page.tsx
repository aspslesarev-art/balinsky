import { permanentRedirect } from 'next/navigation'
import { ApartamentyCatalog } from '../../ru/apartamenty/_catalog'
import { parseQueryFilters, buildMetadataLoc, hasAnyFilter, loadAll } from '../../ru/apartamenty/_lib'
import { buildCanonicalPath } from '@/lib/seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { apartmentCategoryStats } from '@/lib/category-stats'
import { hubPath } from '@/lib/hub-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const base = buildMetadataLoc(f, 'fr', {
    canonicalPath: '/fr/appartements',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'apartments', locale: 'fr', ...apartmentCategoryStats((await loadAll()).enriched) })
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
  const localCanonical = canonical ? hubPath(canonical, 'fr') : null
  if (localCanonical && canonical !== '/ru/apartamenty' && hasAnyFilter(filters)) {
    permanentRedirect(localCanonical)
  }
  return <ApartamentyCatalog filters={filters} page={1} basePath="/fr/appartements" lang="fr" />
}
