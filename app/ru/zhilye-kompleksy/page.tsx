import { permanentRedirect } from 'next/navigation'
import { ComplexesCatalog } from './_catalog'
import { parseQueryFilters, buildMetadata, hasAnyFilter, loadAll } from './_lib'
import { buildCanonicalPath } from '@/lib/complex-seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { villaCategoryStats } from '@/lib/category-stats'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const canonical = buildCanonicalPath(f)
  const base = buildMetadata(f, {
    canonicalPath: canonical ?? '/ru/zhilye-kompleksy',
    noIndex: !canonical && hasAnyFilter(f),
  })
  if (!hasAnyFilter(f)) {
    // Complexes template uses count + devCount only; villaCategoryStats yields
    // both (price comes out null, unused here).
    const cat = generateCategoryMeta({ category: 'complexes', locale: 'ru', ...villaCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
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
