import { permanentRedirect } from 'next/navigation'
import { ApartamentyCatalog } from '../../ru/apartamenty/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter } from '../../ru/apartamenty/_lib'
import { buildCanonicalPath } from '@/lib/seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const ruCanonical = buildCanonicalPath(f)
  const enCanonical = ruCanonical
    ? ruCanonical.replace('/ru/apartamenty', '/en/apartments')
    : '/en/apartments'
  return buildMetadataEn(f, {
    canonicalPath: enCanonical,
    noIndex: !ruCanonical && hasAnyFilter(f),
  })
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  const ruCanonical = buildCanonicalPath(filters)
  if (ruCanonical && ruCanonical !== '/ru/apartamenty' && hasAnyFilter(filters)) {
    permanentRedirect(ruCanonical.replace('/ru/apartamenty', '/en/apartments'))
  }
  return <ApartamentyCatalog filters={filters} page={1} basePath="/en/apartments" lang="en" />
}
