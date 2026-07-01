import { permanentRedirect } from 'next/navigation'
import { VillasCatalog } from './_catalog'
import { parseQueryFilters, buildMetadata, hasAnyFilter, loadAll } from './_lib'
import { buildCanonicalPath } from '@/lib/villa-seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { villaCategoryStats } from '@/lib/category-stats'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const canonical = buildCanonicalPath(f)
  const base = buildMetadata(f, {
    canonicalPath: canonical ?? '/ru/villy',
    noIndex: !canonical && hasAnyFilter(f),
  })
  // TASK-13c: commercial "number + price + USP" meta on the bare category root.
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'villas', locale: 'ru', ...villaCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  const canonical = buildCanonicalPath(filters)
  if (canonical && canonical !== '/ru/villy' && hasAnyFilter(filters)) {
    permanentRedirect(canonical)
  }
  return <VillasCatalog filters={filters} page={1} basePath="/ru/villy" />
}
