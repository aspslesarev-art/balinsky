import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { ComplexFiltersBar } from '@/components/complex-filters/ComplexFiltersBar'
import { ComplexesMap, type ComplexPoint } from '@/components/ComplexesMap'
import { ComplexesSeoContent } from '@/components/ComplexesSeoContent'
import { ComplexCatalogSearchBar } from '@/components/ComplexCatalogSearchBar'
import { buildListHref, buildMapHref } from '@/lib/complex-filter-href'
import {
  parseQueryFilters,
  buildOptions,
  passes,
  applySearch,
  loadAll,
  buildMetadataEn,
} from '../../../ru/zhilye-kompleksy/_lib'

type SP = Promise<Record<string, string | undefined>>

const TYPE_EN: Record<string, string> = {
  'Апартаменты': 'Apartments',
  'Виллы': 'Villas',
  'Виллы и дома': 'Villas',
  'Таунхаусы': 'Townhouses',
  'Дома': 'Houses',
}

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const meta = buildMetadataEn(f, { canonicalPath: '/en/complexes', noIndex: true })
  meta.title = `Map · Residential complexes | Balinsky`
  return meta
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)

  const { enriched } = await loadAll()
  const options = buildOptions(enriched, filters)
  let filtered = enriched.filter(e => passes(e, filters))
  if (filters.q.trim()) filtered = applySearch(filtered, filters.q)

  const points: ComplexPoint[] = []
  const seenSlug = new Set<string>()
  for (const e of filtered) {
    if (e.lat == null || e.lng == null) continue
    if (!e.slug || !e.name) continue
    if (seenSlug.has(e.slug)) continue
    seenSlug.add(e.slug)
    const types = e.types.length > 0 ? e.types.map(t => TYPE_EN[t] ?? t).join(', ') : null
    points.push({ id: e.id, slug: e.slug, name: e.name, location: e.district, types, coverUrl: e.coverUrl, lat: e.lat, lng: e.lng })
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  return (
    <>
      <Header active="zhilye-kompleksy" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">Map · Residential complexes in Bali</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">{points.length} complexes on the map</div>

        <CatalogTabs active="map" listHref={buildListHref(filters, 'en')} mapHref={buildMapHref(filters, 'en')} lang="en" />

        <div className="mt-6">
          <ComplexCatalogSearchBar initial={filters.q} current={filters} view="map" placeholder="Search complexes, districts, developers…" />
        </div>

        <div className="mt-4">
          <ComplexFiltersBar state={filters} options={options} view="map" lang="en" />
        </div>

        <div className="mt-6">
          <ComplexesMap apiKey={apiKey} points={points} lang="en" />
        </div>

        <ComplexesSeoContent filters={filters} variant="map" lang="en" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
