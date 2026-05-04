// English mirror of /ru/zhilye-kompleksy. Same component, just lang='en'
// — so layout, filters, sort, infinite scroll all stay identical and
// future RU updates land in EN automatically.

import { permanentRedirect } from 'next/navigation'
import { ComplexesCatalog } from '../../ru/zhilye-kompleksy/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter } from '../../ru/zhilye-kompleksy/_lib'
import { buildCanonicalPath } from '@/lib/complex-seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  // Canonical points at the *EN* mirror of any canonical RU sub-route.
  const ruCanonical = buildCanonicalPath(f)
  const enCanonical = ruCanonical
    ? ruCanonical.replace('/ru/zhilye-kompleksy', '/en/complexes')
    : '/en/complexes'
  return buildMetadataEn(f, {
    canonicalPath: enCanonical,
    noIndex: !ruCanonical && hasAnyFilter(f),
  })
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  const ruCanonical = buildCanonicalPath(filters)
  if (ruCanonical && ruCanonical !== '/ru/zhilye-kompleksy' && hasAnyFilter(filters)) {
    permanentRedirect(ruCanonical.replace('/ru/zhilye-kompleksy', '/en/complexes'))
  }
  return (
    <ComplexesCatalog
      filters={filters}
      page={1}
      basePath="/en/complexes"
      lang="en"
    />
  )
}
