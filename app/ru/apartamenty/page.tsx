import { permanentRedirect } from 'next/navigation'
import { ApartamentyCatalog } from './_catalog'
import { parseQueryFilters, buildMetadata, hasAnyFilter } from './_lib'
import { buildCanonicalPath } from '@/lib/seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const canonical = buildCanonicalPath(f)
  return buildMetadata(f, {
    canonicalPath: canonical ?? '/ru/apartamenty',
    noIndex: !canonical && hasAnyFilter(f),
  })
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
