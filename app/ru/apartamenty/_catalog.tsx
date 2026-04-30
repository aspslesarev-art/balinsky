import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { ApartmentCard } from '@/components/ApartmentCard'
import { SeoContent } from '@/components/SeoContent'
import { CatalogSearchBar } from '@/components/CatalogSearchBar'
import { InfiniteScrollClient } from '@/components/InfiniteScrollClient'
import { FiltersBar } from '@/components/filters/FiltersBar'
import type { FilterState } from '@/components/filters/FiltersBar'
import { buildListHref, buildMapHref } from '@/lib/filter-href'
import { loadCatalogPage, buildHeading } from './_lib'

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
  return sp.toString()
}

export async function ApartamentyCatalog({
  filters,
  page = 1,
  basePath,
}: {
  filters: FilterState
  page?: number
  /** URL of the current view sans /page/N suffix, e.g. `/ru/apartamenty/pandawa`. */
  basePath: string
}) {
  const { cards, totalCount, totalPages, hasMore, options, page: actualPage } =
    await loadCatalogPage(filters, page)
  const isSearch = filters.q.trim().length > 0
  const heading = buildHeading(filters)

  return (
    <>
      <Header active="apartamenty" />

      <PageContainer>
        <h1 className="pt-8 mb-2 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          {heading}
          {actualPage > 1 && (
            <span className="text-[var(--color-text-muted)] font-normal text-[20px] md:text-[24px]">
              {' '}— страница {actualPage}
            </span>
          )}
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-6">
          {totalCount} объектов
          {totalPages > 1 && ` · страница ${actualPage} из ${totalPages}`}
        </div>

        <CatalogTabs
          active="list"
          listHref={buildListHref(filters)}
          mapHref={buildMapHref(filters)}
        />

        <div className="mt-6">
          <CatalogSearchBar initial={filters.q} current={filters} view="list" />
        </div>

        <div className="mt-4">
          <FiltersBar state={filters} options={options} />
        </div>

        {cards.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            {isSearch
              ? `По запросу «${filters.q}» ничего не найдено`
              : 'Ничего не найдено по выбранным фильтрам'}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {cards.map(c => <ApartmentCard key={c.id} a={c} />)}
            </div>

            <InfiniteScrollClient
              initialOffset={cards.length}
              initialHasMore={hasMore}
              searchString={toQueryString(filters)}
            />
          </>
        )}

        <SeoContent filters={filters} variant="list" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
