import { permanentRedirect } from 'next/navigation'
import { VillasCatalog } from '../../ru/villy/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter } from '../../ru/villy/_lib'
import { buildCanonicalPath } from '@/lib/villa-seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const ruCanonical = buildCanonicalPath(f)
  const enCanonical = ruCanonical
    ? ruCanonical.replace('/ru/villy', '/en/villas')
    : '/en/villas'
  return buildMetadataEn(f, {
    canonicalPath: enCanonical,
    noIndex: !ruCanonical && hasAnyFilter(f),
  })
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  const ruCanonical = buildCanonicalPath(filters)
  if (ruCanonical && ruCanonical !== '/ru/villy' && hasAnyFilter(filters)) {
    permanentRedirect(ruCanonical.replace('/ru/villy', '/en/villas'))
  }
  return <VillasCatalog filters={filters} page={1} basePath="/en/villas" lang="en" />
}
