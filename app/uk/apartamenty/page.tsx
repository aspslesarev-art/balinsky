import { ApartamentyCatalog } from '../../ru/apartamenty/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter, loadAll } from '../../ru/apartamenty/_lib'
import { buildCanonicalPath } from '@/lib/seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { apartmentCategoryStats } from '@/lib/category-stats'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const base = buildMetadataEn(f, {
    canonicalPath: '/uk/apartamenty',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'apartments', locale: 'en', ...apartmentCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  return <ApartamentyCatalog filters={filters} page={1} basePath="/uk/apartamenty" lang="uk" />
}
