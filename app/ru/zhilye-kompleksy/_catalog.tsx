import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { ComplexCard } from '@/components/ComplexCard'
import { ComplexesSeoContent } from '@/components/ComplexesSeoContent'
import { ComplexCatalogSearchBar } from '@/components/ComplexCatalogSearchBar'
import { ComplexInfiniteScrollClient } from '@/components/ComplexInfiniteScrollClient'
import { ComplexFiltersBar } from '@/components/complex-filters/ComplexFiltersBar'
import { buildListHref, buildMapHref } from '@/lib/complex-filter-href'
import { loadCatalogPage, buildHeading, type ComplexFilterState } from './_lib'

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
}: {
  filters: ComplexFilterState
  page?: number
  basePath: string
}) {
  const { cards, totalCount, totalPages, hasMore, options, page: actualPage } =
    await loadCatalogPage(filters, page)
  const isSearch = filters.q.trim().length > 0
  const heading = buildHeading(filters)

  // Use complex tab hrefs (not the apartments ones from CatalogTabs defaults).
  const listTabHref = buildListHref(filters)
  const mapTabHref = buildMapHref(filters)

  return (
    <>
      <Header active="zhilye-kompleksy" />

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
          {totalCount} комплексов
          {totalPages > 1 && ` · страница ${actualPage} из ${totalPages}`}
        </div>

        <CatalogTabs active="list" listHref={listTabHref} mapHref={mapTabHref} />

        <div className="mt-6">
          <ComplexCatalogSearchBar initial={filters.q} current={filters} view="list" />
        </div>

        <div className="mt-4">
          <ComplexFiltersBar state={filters} options={options} view="list" />
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
              {cards.map(c => <ComplexCard key={c.id} c={c} />)}
            </div>

            <ComplexInfiniteScrollClient
              initialOffset={cards.length}
              initialHasMore={hasMore}
              searchString={toQueryString(filters)}
            />
          </>
        )}

        <ComplexesSeoContent filters={filters} variant="list" />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
