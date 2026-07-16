import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { ApartmentCard } from '@/components/ApartmentCard'
import { SeoContent } from '@/components/SeoContent'
import { DistrictIntroBlock } from '@/components/DistrictIntroBlock'
import { DistrictRelatedLinks } from '@/components/DistrictRelatedLinks'
import { getDistrictCopy, getDistrictCommercialMeta } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { CatalogSearchBar } from '@/components/CatalogSearchBar'
import { InfiniteScrollClient } from '@/components/InfiniteScrollClient'
import { FiltersBar } from '@/components/filters/FiltersBar'
import type { FilterState } from '@/components/filters/FiltersBar'
import { SubscribeCTA } from '@/components/SubscribeCTA'
import { buildListHref, buildMapHref } from '@/lib/filter-href'
import { loadCatalogPage, buildHeading, buildHeadingEn } from './_lib'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    page: 'страница', of: 'из',
    objects: (n: number) => `${n} объектов`,
    emptySearch: (q: string) => `По запросу «${q}» ничего не найдено`,
    emptyFilters: 'Ничего не найдено по выбранным фильтрам',
    searchPlaceholder: 'Поиск по апартаментам, районам, застройщикам…',
  },
  en: {
    page: 'page', of: 'of',
    objects: (n: number) => `${n} listings`,
    emptySearch: (q: string) => `Nothing found for "${q}"`,
    emptyFilters: 'Nothing matches the selected filters',
    searchPlaceholder: 'Search apartments, districts, developers…',
  },
} as const

function toQueryString(f: FilterState): string {
  const sp = new URLSearchParams()
  if (f.q && f.q.trim()) sp.set('q', f.q.trim())
  if (f.priceMin != null) sp.set('price_min', String(f.priceMin))
  if (f.priceMax != null) sp.set('price_max', String(f.priceMax))
  if (f.district.length) sp.set('district', f.district.join(','))
  if (f.bedrooms.length) sp.set('bedrooms', f.bedrooms.join(','))
  if (f.floor.length) sp.set('floor', f.floor.join(','))
  if (f.developer.length) sp.set('developer', f.developer.join(','))
  if (f.status.length) sp.set('status', f.status.join(','))
  if (f.permit.length) sp.set('permit', f.permit.join(','))
  if (f.features.length) sp.set('features', f.features.join(','))
  return sp.toString()
}

export async function ApartamentyCatalog({
  filters,
  page = 1,
  lang = 'ru',
}: {
  filters: FilterState
  page?: number
  basePath: string
  lang?: Lang
}) {
  const { cards, totalCount, totalPages, hasMore, options, page: actualPage } =
    await loadCatalogPage(filters, page, lang)
  const isSearch = filters.q.trim().length > 0
  const copy = pickCopy(COPY, lang)

  const isSingleDistrictHub = filters.district.length === 1
    && filters.bedrooms.length === 0
    && filters.status.length === 0
    && filters.priceMin == null && filters.priceMax == null
    && filters.q.trim().length === 0
    && actualPage === 1
  const districtSlug = isSingleDistrictHub
    ? (DISTRICT_TO_SLUG[filters.district[0]] ?? filters.district[0].toLowerCase())
    : null
  const districtCopy = districtSlug ? getDistrictCopy(districtSlug, lang) : null
  const districtMeta = districtSlug ? getDistrictCommercialMeta(districtSlug, lang, 'apartment', totalCount) : null
  const heading = districtMeta?.heading
    ?? (lang === 'ru' ? buildHeading(filters) : buildHeadingEn(filters))
  const sectionRoot = switchLangPath('/ru/apartamenty', lang)

  return (
    <>
      <Header active="apartamenty" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {heading}
          {actualPage > 1 && (
            <span className="text-[var(--color-text-muted)] font-normal text-[20px] md:text-[24px]">
              {' '}— {copy.page} {actualPage}
            </span>
          )}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {copy.objects(totalCount)}
          {totalPages > 1 && ` · ${copy.page} ${actualPage} ${copy.of} ${totalPages}`}
        </div>

        {districtCopy && (
          <DistrictIntroBlock copy={districtCopy} lang={lang} totalCount={totalCount} sectionRoot={sectionRoot} />
        )}

        <CatalogTabs
          active="list"
          listHref={buildListHref(filters, lang)}
          mapHref={buildMapHref(filters, lang)}
          lang={lang}
        />

        <div className="mt-6">
          <CatalogSearchBar initial={filters.q} current={filters} view="list" placeholder={copy.searchPlaceholder} />
        </div>

        <div className="mt-4">
          <FiltersBar state={filters} options={options} lang={lang} />
        </div>

        {cards.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            {isSearch ? copy.emptySearch(filters.q) : copy.emptyFilters}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map(c => <ApartmentCard key={c.id} a={c} lang={lang} />)}
            </div>

            <InfiniteScrollClient
              initialOffset={cards.length}
              initialHasMore={hasMore}
              searchString={toQueryString(filters)}
            />
          </>
        )}

        {cards.length > 0 && (
          <div className="mt-10">
            <SubscribeCTA
              lang={lang}
              filter={{
                kind: 'apartment',
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

        {districtCopy && districtSlug && (
          <DistrictRelatedLinks
            lang={lang}
            districtName={districtCopy.name}
            districtSlug={districtSlug}
            currentKind="apartment"
          />
        )}

        <SeoContent filters={filters} variant="list" lang={lang} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
