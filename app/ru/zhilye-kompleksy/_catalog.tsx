import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { ComplexCard } from '@/components/ComplexCard'
import { ComplexesSeoContent } from '@/components/ComplexesSeoContent'
import { ComplexCatalogSearchBar } from '@/components/ComplexCatalogSearchBar'
import { ComplexInfiniteScrollClient } from '@/components/ComplexInfiniteScrollClient'
import { ComplexFiltersBar } from '@/components/complex-filters/ComplexFiltersBar'
import { SubscribeCTA } from '@/components/SubscribeCTA'
import { DistrictIntroBlock } from '@/components/DistrictIntroBlock'
import { getDistrictCopy } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { buildListHref, buildMapHref } from '@/lib/complex-filter-href'
import { loadCatalogPage, buildHeading, buildHeadingEn, type ComplexFilterState } from './_lib'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    page: 'страница', of: 'из',
    complexes: (n: number) => `${n} комплексов`,
    emptySearch: (q: string) => `По запросу «${q}» ничего не найдено`,
    emptyFilters: 'Ничего не найдено по выбранным фильтрам',
    searchPlaceholder: 'Поиск по комплексам, районам, застройщикам…',
  },
  en: {
    page: 'page', of: 'of',
    complexes: (n: number) => `${n} residential complexes`,
    emptySearch: (q: string) => `Nothing found for "${q}"`,
    emptyFilters: 'Nothing matches the selected filters',
    searchPlaceholder: 'Search complexes, districts, developers…',
  },
} as const

function toQueryString(f: ComplexFilterState): string {
  const sp = new URLSearchParams()
  if (f.q && f.q.trim()) sp.set('q', f.q.trim())
  if (f.district.length) sp.set('district', f.district.join(','))
  if (f.types.length) sp.set('types', f.types.join(','))
  if (f.status.length) sp.set('status', f.status.join(','))
  if (f.permit.length) sp.set('permit', f.permit.join(','))
  if (f.year.length) sp.set('year', f.year.join(','))
  if (f.developer.length) sp.set('developer', f.developer.join(','))
  return sp.toString()
}

export async function ComplexesCatalog({
  filters,
  page = 1,
  basePath,
  lang = 'ru',
}: {
  filters: ComplexFilterState
  page?: number
  basePath: string
  lang?: Lang
}) {
  const { cards, totalCount, totalPages, hasMore, options, page: actualPage } =
    await loadCatalogPage(filters, page, lang)
  const isSearch = filters.q.trim().length > 0
  const heading = lang === 'en' ? buildHeadingEn(filters) : buildHeading(filters)
  const copy = COPY[lang]

  // Use complex tab hrefs (not the apartments ones from CatalogTabs defaults).
  const listTabHref = buildListHref(filters)
  const mapTabHref = buildMapHref(filters)

  const isSingleDistrictHub = filters.district.length === 1
    && filters.year.length === 0
    && filters.types.length === 0
    && filters.q.trim().length === 0
    && actualPage === 1
  const districtCopy = isSingleDistrictHub
    ? getDistrictCopy(DISTRICT_TO_SLUG[filters.district[0]] ?? filters.district[0].toLowerCase(), lang)
    : null
  const sectionRoot = lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'

  return (
    <>
      <Header active="zhilye-kompleksy" />

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
          {copy.complexes(totalCount)}
          {totalPages > 1 && ` · ${copy.page} ${actualPage} ${copy.of} ${totalPages}`}
        </div>

        {districtCopy && (
          <DistrictIntroBlock copy={districtCopy} lang={lang} totalCount={totalCount} sectionRoot={sectionRoot} />
        )}

        <CatalogTabs active="list" listHref={listTabHref} mapHref={mapTabHref} />

        <div className="mt-6">
          <ComplexCatalogSearchBar initial={filters.q} current={filters} view="list" placeholder={copy.searchPlaceholder} />
        </div>

        <div className="mt-4">
          <ComplexFiltersBar state={filters} options={options} view="list" lang={lang} />
        </div>

        {cards.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            {isSearch ? copy.emptySearch(filters.q) : copy.emptyFilters}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map(c => <ComplexCard key={c.id} c={c} lang={lang} />)}
            </div>

            <ComplexInfiniteScrollClient
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
                kind: 'complex',
                district: filters.district[0],
                query: filters.q.trim() || undefined,
              }}
            />
          </div>
        )}

        <ComplexesSeoContent filters={filters} variant="list" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
