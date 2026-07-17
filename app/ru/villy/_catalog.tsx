import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { VillaCard } from '@/components/VillaCard'
import { VillasSeoContent } from '@/components/VillasSeoContent'
import { RelatedVillaFilters } from '@/components/RelatedVillaFilters'
import { VillaCatalogSearchBar } from '@/components/VillaCatalogSearchBar'
import { VillaInfiniteScrollClient } from '@/components/VillaInfiniteScrollClient'
import { VillaFiltersBar } from '@/components/villa-filters/VillaFiltersBar'
import { DistrictIntroBlock } from '@/components/DistrictIntroBlock'
import { DistrictRelatedLinks } from '@/components/DistrictRelatedLinks'
import { getDistrictCopy, getDistrictCommercialMeta } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { SubscribeCTA } from '@/components/SubscribeCTA'
import { buildListHref, buildMapHref } from '@/lib/villa-filter-href'
import { loadCatalogPage, buildHeadingLoc, type VillaFilterState } from './_lib'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    page: 'страница', of: 'из',
    objects: (n: number) => `${n} объектов`,
    emptySearch: (q: string) => `По запросу «${q}» ничего не найдено`,
    emptyFilters: 'Ничего не найдено по выбранным фильтрам',
    searchPlaceholder: 'Поиск по виллам, районам, застройщикам…',
  },
  en: {
    page: 'page', of: 'of',
    objects: (n: number) => `${n} listings`,
    emptySearch: (q: string) => `Nothing found for "${q}"`,
    emptyFilters: 'Nothing matches the selected filters',
    searchPlaceholder: 'Search villas, districts, developers…',
  },
  id: {
    page: 'halaman', of: 'dari',
    objects: (n: number) => `${n} properti`,
    emptySearch: (q: string) => `Tidak ada hasil untuk "${q}"`,
    emptyFilters: 'Tidak ada yang cocok dengan filter yang dipilih',
    searchPlaceholder: 'Cari vila, area, pengembang…',
  },
  fr: {
    page: 'page', of: 'sur',
    objects: (n: number) => `${n} biens`,
    emptySearch: (q: string) => `Aucun résultat pour "${q}"`,
    emptyFilters: 'Aucun résultat pour les filtres sélectionnés',
    searchPlaceholder: 'Rechercher villas, quartiers, promoteurs…',
  },
  de: {
    page: 'Seite', of: 'von',
    objects: (n: number) => `${n} Objekte`,
    emptySearch: (q: string) => `Nichts gefunden für „${q}“`,
    emptyFilters: 'Keine Treffer für die gewählten Filter',
    searchPlaceholder: 'Villen, Regionen, Bauträger suchen…',
  },
  zh: {
    page: '页', of: '共',
    objects: (n: number) => `${n} 套房源`,
    emptySearch: (q: string) => `未找到与“${q}”相关的结果`,
    emptyFilters: '没有符合所选筛选条件的结果',
    searchPlaceholder: '搜索别墅、地区、开发商…',
  },
  nl: {
    page: 'pagina', of: 'van',
    objects: (n: number) => `${n} objecten`,
    emptySearch: (q: string) => `Niets gevonden voor "${q}"`,
    emptyFilters: 'Niets komt overeen met de geselecteerde filters',
    searchPlaceholder: "Zoek villa's, wijken, ontwikkelaars…",
  },
  ban: {
    page: 'kaca', of: 'saking',
    objects: (n: number) => `${n} properti`,
    emptySearch: (q: string) => `Nenten wenten sane kapanggih antuk "${q}"`,
    emptyFilters: 'Nenten wenten sane cocok sareng filter sane kapilih',
    searchPlaceholder: 'Rereh vila, wewengkon, pangwangun…',
  },
} as const

function toQueryString(f: VillaFilterState): string {
  const sp = new URLSearchParams()
  if (f.q && f.q.trim()) sp.set('q', f.q.trim())
  if (f.priceMin != null) sp.set('price_min', String(f.priceMin))
  if (f.priceMax != null) sp.set('price_max', String(f.priceMax))
  if (f.district.length) sp.set('district', f.district.join(','))
  if (f.bedrooms.length) sp.set('bedrooms', f.bedrooms.join(','))
  if (f.status.length) sp.set('status', f.status.join(','))
  if (f.permit.length) sp.set('permit', f.permit.join(','))
  if (f.year.length) sp.set('year', f.year.join(','))
  if (f.developer.length) sp.set('developer', f.developer.join(','))
  return sp.toString()
}

export async function VillasCatalog({
  filters,
  page = 1,
  lang = 'ru',
}: {
  filters: VillaFilterState
  page?: number
  basePath: string
  lang?: Lang
}) {
  const { cards, totalCount, totalPages, hasMore, options, page: actualPage } =
    await loadCatalogPage(filters, page, lang)
  const isSearch = filters.q.trim().length > 0
  const copy = pickCopy(COPY, lang)

  // Single-district filter with no other narrowing → show the rich
  // SEO intro block for that district above the grid. Strict check
  // keeps the block off mixed filter combos (e.g. district + 2 bedrooms),
  // which would push the grid down without adding relevant content.
  const isSingleDistrictHub = filters.district.length === 1
    && filters.bedrooms.length === 0
    && filters.status.length === 0
    && filters.style.length === 0
    && filters.priceMin == null && filters.priceMax == null
    && filters.q.trim().length === 0
    && actualPage === 1
  const districtSlug = isSingleDistrictHub
    ? (DISTRICT_TO_SLUG[filters.district[0]] ?? filters.district[0].toLowerCase())
    : null
  const districtCopy = districtSlug ? getDistrictCopy(districtSlug, lang) : null
  const districtMeta = districtSlug ? getDistrictCommercialMeta(districtSlug, lang, 'villa', totalCount) : null
  // H1 uses the commercial heading for single-district hubs («Купить
  // виллу в Нуса Дуа, Бали — 47 вилл 2026»). Other combos keep the
  // descriptive buildHeading so each combo page has a unique H1.
  const heading = (lang === 'ru' ? districtMeta?.heading : undefined)
    ?? buildHeadingLoc(filters, lang)
  const sectionRoot = switchLangPath('/ru/villy', lang)

  return (
    <>
      <Header active="villy" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {heading}
          {actualPage > 1 && (
            <span className="text-[var(--color-text-muted)] font-normal text-[20px] md:text-[24px]"> — {copy.page} {actualPage}</span>
          )}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {copy.objects(totalCount)}
          {totalPages > 1 && ` · ${copy.page} ${actualPage} ${copy.of} ${totalPages}`}
        </div>

        {districtCopy && (
          <DistrictIntroBlock copy={districtCopy} lang={lang} totalCount={totalCount} sectionRoot={sectionRoot} />
        )}

        <CatalogTabs active="list" listHref={buildListHref(filters, lang)} mapHref={buildMapHref(filters, lang)} lang={lang} />

        <div className="mt-6">
          <VillaCatalogSearchBar initial={filters.q} current={filters} view="list" placeholder={copy.searchPlaceholder} />
        </div>

        <div className="mt-4">
          <VillaFiltersBar state={filters} options={options} view="list" lang={lang} />
        </div>

        {cards.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            {isSearch ? copy.emptySearch(filters.q) : copy.emptyFilters}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map(c => <VillaCard key={c.id} a={c} lang={lang} />)}
            </div>
            <VillaInfiniteScrollClient
              initialOffset={cards.length}
              initialHasMore={hasMore}
              searchString={toQueryString(filters)}
            />
          </>
        )}

        {/* Telegram alerts CTA — under the catalog so the visitor sees
            it after browsing some results. Filters get collapsed:
            multi-district → first, multi-bedrooms → min/max range. */}
        {cards.length > 0 && (
          <div className="mt-10">
            <SubscribeCTA
              lang={lang}
              filter={{
                kind: 'villa',
                district: filters.district[0],
                bedrooms_min: filters.bedrooms.length > 0 ? Math.min(...filters.bedrooms.map(Number).filter(Number.isFinite)) : undefined,
                bedrooms_max: filters.bedrooms.length > 0 ? Math.max(...filters.bedrooms.map(Number).filter(Number.isFinite)) : undefined,
                price_min_usd: filters.priceMin ?? undefined,
                price_max_usd: filters.priceMax ?? undefined,
                str_only: filters.goal === 'invest' || undefined,
                query: filters.q.trim() || undefined,
              }}
            />
          </div>
        )}

        <RelatedVillaFilters filters={filters} options={options} lang={lang} />

        {districtCopy && districtSlug && (
          <DistrictRelatedLinks
            lang={lang}
            districtName={districtCopy.name}
            districtSlug={districtSlug}
            currentKind="villa"
          />
        )}

        <VillasSeoContent filters={filters} variant="list" lang={lang} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
