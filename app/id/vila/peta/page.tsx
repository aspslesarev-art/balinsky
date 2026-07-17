import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { VillaFiltersBar } from '@/components/villa-filters/VillaFiltersBar'
import { VillasMap, type VillaPoint, type VillaPointGroup } from '@/components/VillasMap'
import { loadReviewHeat } from '@/lib/reviews-heat'
import { VillasSeoContent } from '@/components/VillasSeoContent'
import { VillaCatalogSearchBar } from '@/components/VillaCatalogSearchBar'
import { buildListHref, buildMapHref } from '@/lib/villa-filter-href'
import {
  parseQueryFilters,
  buildOptions,
  passes,
  applySearch,
  loadAll,
  buildMetadataEn,
  buildHeadingLoc,
  firstString,
} from '../../../ru/villy/_lib'
import { tField } from '@/lib/i18n'

type SP = Promise<Record<string, string | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = parseQueryFilters(sp)
  const meta = buildMetadataEn(f, { canonicalPath: '/id/vila', noIndex: true })
  meta.title = `Map · Villas | Balinsky`
  return meta
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const filters = parseQueryFilters(sp)

  const { enriched, manifest } = await loadAll()
  const options = buildOptions(enriched, filters)
  let filtered = enriched.filter(e => passes(e, filters))
  if (filters.q.trim()) filtered = applySearch(filtered, filters.q)

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
      tField(e.data, 'SEO:Title', 'id') ?? firstString(e.data['Имя ENG']) ?? firstString(e.data['Name']) ?? slug
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    const item: VillaPoint = { id: e.id, slug, title, priceUsd: e.priceUsd, thumb: manifest[e.id]?.[0] ?? null }
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
  const heat = await loadReviewHeat()

  return (
    <>
      <Header active="villy" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{buildHeadingLoc(filters, 'id')}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">{totalPoints} objek di peta{totalPoints !== groups.length && ` · ${groups.length} titik`}</div>

        <CatalogTabs active="map" listHref={buildListHref(filters, 'id')} mapHref={buildMapHref(filters, 'id')} lang="id" />

        <div className="mt-6">
          <VillaCatalogSearchBar initial={filters.q} current={filters} view="map" placeholder="Cari vila, area, pengembang…" />
        </div>

        <div className="mt-4">
          <VillaFiltersBar state={filters} options={options} view="map" lang="id" />
        </div>

        <div className="mt-6">
          <VillasMap apiKey={apiKey} groups={groups} heatCells={heat.cells} heatMax={heat.max} lang="id" />
        </div>

        <VillasSeoContent filters={filters} variant="map" lang="id" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
