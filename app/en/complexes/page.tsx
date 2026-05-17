// English mirror of /ru/zhilye-kompleksy. Same component, just lang='en'
// — so layout, filters, sort, infinite scroll all stay identical and
// future RU updates land in EN automatically.

import { ComplexesCatalog } from '../../ru/zhilye-kompleksy/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter } from '../../ru/zhilye-kompleksy/_lib'
import { buildCanonicalPath } from '@/lib/complex-seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  return buildMetadataEn(f, {
    canonicalPath: '/en/complexes',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  return (
    <ComplexesCatalog
      filters={filters}
      page={1}
      basePath="/en/complexes"
      lang="en"
    />
  )
}
