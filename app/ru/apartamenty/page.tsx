import { permanentRedirect } from 'next/navigation'
import { ApartamentyCatalog } from './_catalog'
import { parseQueryFilters, buildMetadata, hasAnyFilter, loadAll } from './_lib'
import { buildCanonicalPath } from '@/lib/seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { apartmentCategoryStats } from '@/lib/category-stats'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const canonical = buildCanonicalPath(f)
  const base = buildMetadata(f, {
    canonicalPath: canonical ?? '/ru/apartamenty',
    noIndex: !canonical && hasAnyFilter(f),
  })
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'apartments', locale: 'ru', ...apartmentCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)

  // If this query combo maps to a clean canonical URL, redirect there.
  // The base "/ru/apartamenty" path itself is canonical for empty filters,
  // so don't redirect when there are no filters at all.
  const canonical = buildCanonicalPath(filters)
  if (canonical && canonical !== '/ru/apartamenty' && hasAnyFilter(filters)) {
    permanentRedirect(canonical)
  }

  return <ApartamentyCatalog filters={filters} page={1} basePath="/ru/apartamenty" />
}
