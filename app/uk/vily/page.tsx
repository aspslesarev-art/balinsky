import { VillasCatalog } from '../../ru/villy/_catalog'
import { parseQueryFilters, buildMetadataLoc, hasAnyFilter, loadAll } from '../../ru/villy/_lib'
import { buildCanonicalPath } from '@/lib/villa-seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { villaCategoryStats } from '@/lib/category-stats'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  // EN has no canonical sub-route tree of its own — keep canonical at the
  // flat base path and rely on noindex for filtered combos to avoid
  // SEO duplication.
  const base = buildMetadataLoc(f, 'uk', {
    canonicalPath: '/uk/vily',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
  // TASK-13c: commercial "number + price + USP" meta on the bare category root.
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'villas', locale: 'uk', ...villaCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  return <VillasCatalog filters={filters} page={1} basePath="/uk/vily" lang="uk" />
}
