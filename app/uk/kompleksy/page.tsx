// English mirror of /ru/zhilye-kompleksy. Same component, just lang='uk'
// — so layout, filters, sort, infinite scroll all stay identical and
// future RU updates land in EN automatically.

import { ComplexesCatalog } from '../../ru/zhilye-kompleksy/_catalog'
import { parseQueryFilters, buildMetadataEn, hasAnyFilter, loadAll } from '../../ru/zhilye-kompleksy/_lib'
import { buildCanonicalPath } from '@/lib/complex-seo-routes'
import { generateCategoryMeta } from '@/lib/seo'
import { villaCategoryStats } from '@/lib/category-stats'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const base = buildMetadataEn(f, {
    canonicalPath: '/uk/kompleksy',
    noIndex: hasAnyFilter(f) && buildCanonicalPath(f) !== null,
  })
  if (!hasAnyFilter(f)) {
    const cat = generateCategoryMeta({ category: 'complexes', locale: 'en', ...villaCategoryStats((await loadAll()).enriched) })
    return { ...base, title: cat.title, description: cat.description }
  }
  return base
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)
  return (
    <ComplexesCatalog
      filters={filters}
      page={1}
      basePath="/uk/kompleksy"
      lang="uk"
    />
  )
}
