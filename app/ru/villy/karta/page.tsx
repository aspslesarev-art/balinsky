import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { VillaFiltersBar } from '@/components/villa-filters/VillaFiltersBar'
import { VillasMap, type VillaPoint, type VillaPointGroup } from '@/components/VillasMap'
import { VillasSeoContent } from '@/components/VillasSeoContent'
import { VillaCatalogSearchBar } from '@/components/VillaCatalogSearchBar'
import { buildListHref, buildMapHref } from '@/lib/villa-filter-href'
import {
  parseQueryFilters,
  buildOptions,
  passes,
  applySearch,
  loadAll,
  buildHeading,
  buildMetadata,
  firstString,
} from '../_lib'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const meta = buildMetadata(f, { canonicalPath: '/ru/villy', noIndex: true })
  meta.title = `Карта: ${buildHeading(f)} | Balinsky`
  return meta
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)

  const { enriched, manifest } = await loadAll()
  const options = buildOptions(enriched, filters)
  let filtered = enriched.filter(e => passes(e, filters))
  if (filters.q.trim()) filtered = applySearch(filtered, filters.q)

  // Group by rounded lat/lng (~11m precision) so listings in the same
  // residential complex collapse into one marker with a multi-item popup.
  const seenSlug = new Set<string>()
  const groupsByCoord = new globalThis.Map<string, VillaPointGroup>()
  let totalPoints = 0
  for (const e of filtered) {
    if (e.lat == null || e.lng == null) continue
    const slug = firstString(e.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    if (seenSlug.has(slug)) continue
    seenSlug.add(slug)
    const titleRaw =
      firstString(e.data['SEO:Title']) ?? firstString(e.data['Имя ENG']) ?? firstString(e.data['Name']) ?? slug
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    const item: VillaPoint = {
      id: e.id, slug, title, priceUsd: e.priceUsd, thumb: manifest[e.id]?.[0] ?? null,
    }
    const lat = Number(e.lat.toFixed(4))
    const lng = Number(e.lng.toFixed(4))
    const key = `${lat},${lng}`
    let g = groupsByCoord.get(key)
    if (!g) { g = { key, lat, lng, items: [] }; groupsByCoord.set(key, g) }
    g.items.push(item)
    totalPoints++
  }
  const groups: VillaPointGroup[] = [...groupsByCoord.values()]

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  return (
    <>
      <Header active="villy" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {buildHeading(filters)}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">{totalPoints} объектов на карте{totalPoints !== groups.length && ` · ${groups.length} точек`}</div>

        <CatalogTabs active="map" listHref={buildListHref(filters)} mapHref={buildMapHref(filters)} />

        <div className="mt-6">
          <VillaCatalogSearchBar initial={filters.q} current={filters} view="map" />
        </div>

        <div className="mt-4">
          <VillaFiltersBar state={filters} options={options} view="map" />
        </div>

        <div className="mt-6">
          <VillasMap apiKey={apiKey} groups={groups} />
        </div>

        <VillasSeoContent filters={filters} variant="map" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
