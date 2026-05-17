import { ApartamentyCatalog } from '../../ru/apartamenty/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter } from '../../ru/apartamenty/_lib'
import { buildCanonicalPath } from '@/lib/seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  return buildMetadataEn(f, {
    canonicalPath: '/en/apartments',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  return <ApartamentyCatalog filters={filters} page={1} basePath="/en/apartments" lang="en" />
}
