import { VillasCatalog } from '../../ru/villy/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter } from '../../ru/villy/_lib'
import { buildCanonicalPath } from '@/lib/villa-seo-routes'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  // EN has no canonical sub-route tree of its own — keep canonical at the
  // flat base path and rely on noindex for filtered combos to avoid
  // SEO duplication.
  return buildMetadataEn(f, {
    canonicalPath: '/en/villas',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  return <VillasCatalog filters={filters} page={1} basePath="/en/villas" lang="en" />
}
