import { permanentRedirect } from 'next/navigation'
import { ComplexesCatalog } from './_catalog'
import { parseQueryFilters, buildMetadata, hasAnyFilter } from './_lib'
import { buildCanonicalPath } from '@/lib/complex-seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const canonical = buildCanonicalPath(f)
  return buildMetadata(f, {
    canonicalPath: canonical ?? '/ru/zhilye-kompleksy',
    noIndex: !canonical && hasAnyFilter(f),
  })
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  const canonical = buildCanonicalPath(filters)
  if (canonical && canonical !== '/ru/zhilye-kompleksy' && hasAnyFilter(filters)) {
    permanentRedirect(canonical)
  }
  return <ComplexesCatalog filters={filters} page={1} basePath="/ru/zhilye-kompleksy" />
}
