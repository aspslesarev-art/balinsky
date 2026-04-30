import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { FiltersBar } from '@/components/filters/FiltersBar'
import { ApartmentsMap, type MapPoint, type MapPointGroup } from '@/components/ApartmentsMap'
import { SeoContent } from '@/components/SeoContent'
import { CatalogSearchBar } from '@/components/CatalogSearchBar'
import { buildListHref, buildMapHref } from '@/lib/filter-href'
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
  // Map view is utility, not a canonical SEO target — noindex.
  const meta = buildMetadata(f, { canonicalPath: '/ru/apartamenty', noIndex: true })
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

  // Build map points, dedupe by slug, then group by lat/lng so co-located
  // apartments appear under one marker with a count badge.
  const seenSlug = new Set<string>()
  const groupsByCoord = new globalThis.Map<string, MapPointGroup>()
  let pointCount = 0

  for (const e of filtered) {
    if (e.lat == null || e.lng == null) continue
    const slug = firstString(e.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    if (seenSlug.has(slug)) continue
    seenSlug.add(slug)
    const titleRaw =
      firstString(e.data['SEO:Title']) ?? firstString(e.data['Name']) ?? slug
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()

    const point: MapPoint = {
      id: e.id,
      slug,
      title,
      priceUsd: e.priceUsd,
      thumb: manifest[e.id]?.[0] ?? null,
    }

    // Round to ~10m precision so trivially-different coords still group.
    const lat = Number(e.lat.toFixed(4))
    const lng = Number(e.lng.toFixed(4))
    const key = `${lat},${lng}`
    let g = groupsByCoord.get(key)
    if (!g) {
      g = { key, lat, lng, items: [] }
      groupsByCoord.set(key, g)
    }
    g.items.push(point)
    pointCount++
  }

  const groups: MapPointGroup[] = [...groupsByCoord.values()]

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  return (
    <>
      <Header active="apartamenty" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#1A1A1A]">
          {buildHeading(filters)}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {pointCount} объектов на карте
          {pointCount !== groups.length && ` · ${groups.length} точек`}
        </div>

        <CatalogTabs
          active="map"
          listHref={buildListHref(filters)}
          mapHref={buildMapHref(filters)}
        />

        <div className="mt-6">
          <CatalogSearchBar initial={filters.q} current={filters} view="map" />
        </div>

        <div className="mt-4">
          <FiltersBar state={filters} options={options} view="map" />
        </div>

        <div className="mt-6">
          <ApartmentsMap apiKey={apiKey} groups={groups} />
        </div>

        <SeoContent filters={filters} variant="map" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
