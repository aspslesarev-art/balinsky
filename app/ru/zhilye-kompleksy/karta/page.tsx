import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { ComplexFiltersBar } from '@/components/complex-filters/ComplexFiltersBar'
import { ComplexesMap, type ComplexPoint, type ComplexPointGroup } from '@/components/ComplexesMap'
import { loadReviewHeat } from '@/lib/reviews-heat'
import { ComplexesSeoContent } from '@/components/ComplexesSeoContent'
import { ComplexCatalogSearchBar } from '@/components/ComplexCatalogSearchBar'
import { buildListHref, buildMapHref } from '@/lib/complex-filter-href'
import {
  parseQueryFilters,
  buildOptions,
  passes,
  applySearch,
  loadAll,
  buildHeading,
  buildMetadata,
} from '../_lib'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const meta = buildMetadata(f, { canonicalPath: '/ru/zhilye-kompleksy', noIndex: true })
  meta.title = `Карта: ${buildHeading(f)} | Balinsky`
  return meta
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)

  const { enriched } = await loadAll()
  const options = buildOptions(enriched, filters)
  let filtered = enriched.filter(e => passes(e, filters))
  if (filters.q.trim()) filtered = applySearch(filtered, filters.q)

  const seenSlug = new Set<string>()
  const groupsByCoord = new globalThis.Map<string, ComplexPointGroup>()
  let totalPoints = 0
  for (const e of filtered) {
    if (e.lat == null || e.lng == null) continue
    if (!e.slug || !e.name) continue
    if (seenSlug.has(e.slug)) continue
    seenSlug.add(e.slug)
    const item: ComplexPoint = {
      id: e.id, slug: e.slug, name: e.name, location: e.district,
      types: e.types.length > 0 ? e.types.join(', ') : null,
      coverUrl: e.coverUrl,
    }
    const lat = Number(e.lat.toFixed(4))
    const lng = Number(e.lng.toFixed(4))
    const key = `${lat},${lng}`
    let g = groupsByCoord.get(key)
    if (!g) { g = { key, lat, lng, items: [] }; groupsByCoord.set(key, g) }
    g.items.push(item)
    totalPoints++
  }
  const groups: ComplexPointGroup[] = [...groupsByCoord.values()]

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''
  const heat = await loadReviewHeat()

  return (
    <>
      <Header active="zhilye-kompleksy" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {buildHeading(filters)}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {totalPoints} комплексов на карте{totalPoints !== groups.length && ` · ${groups.length} точек`}
        </div>

        <CatalogTabs
          active="map"
          listHref={buildListHref(filters)}
          mapHref={buildMapHref(filters)}
        />

        <div className="mt-6">
          <ComplexCatalogSearchBar initial={filters.q} current={filters} view="map" />
        </div>

        <div className="mt-4">
          <ComplexFiltersBar state={filters} options={options} view="map" />
        </div>

        <div className="mt-6">
          <ComplexesMap apiKey={apiKey} groups={groups} heatCells={heat.cells} heatMax={heat.max} />
        </div>

        <ComplexesSeoContent filters={filters} variant="map" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
