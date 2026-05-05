import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { CatalogTabs } from '@/components/CatalogTabs'
import { VillaCard } from '@/components/VillaCard'
import { VillasSeoContent } from '@/components/VillasSeoContent'
import { RelatedVillaFilters } from '@/components/RelatedVillaFilters'
import { VillaCatalogSearchBar } from '@/components/VillaCatalogSearchBar'
import { VillaInfiniteScrollClient } from '@/components/VillaInfiniteScrollClient'
import { VillaFiltersBar } from '@/components/villa-filters/VillaFiltersBar'
import { buildListHref, buildMapHref } from '@/lib/villa-filter-href'
import { loadCatalogPage, buildHeading, buildHeadingEn, type VillaFilterState } from './_lib'
import type { Lang } from '@/lib/i18n'

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
  basePath,
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
  const heading = lang === 'en' ? buildHeadingEn(filters) : buildHeading(filters)
  const copy = COPY[lang]

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

        <CatalogTabs active="list" listHref={buildListHref(filters)} mapHref={buildMapHref(filters)} />

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

        <RelatedVillaFilters filters={filters} options={options} lang={lang} />

        <VillasSeoContent filters={filters} variant="list" lang={lang} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
