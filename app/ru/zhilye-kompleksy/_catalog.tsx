import { Header } from '@/components/Header'
import { ComplexCard } from '@/components/ComplexCard'
import { ComplexesSeoContent } from '@/components/ComplexesSeoContent'
import { ComplexCatalogSearchBar } from '@/components/ComplexCatalogSearchBar'
import { ComplexInfiniteScrollClient } from '@/components/ComplexInfiniteScrollClient'
import { ComplexFiltersBar } from '@/components/complex-filters/ComplexFiltersBar'
import { SubscribeCTA } from '@/components/SubscribeCTA'
import { DistrictIntroBlock } from '@/components/DistrictIntroBlock'
import { DistrictRelatedLinks } from '@/components/DistrictRelatedLinks'
import { getDistrictCopy, getDistrictCommercialMeta } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { buildListHref, buildMapHref } from '@/lib/complex-filter-href'
import { loadCatalogPage, buildHeading, buildHeadingLocalized, loadAll, passes, applySearch, type ComplexFilterState } from './_lib'
import { CatalogMap, type CatalogMapGroup } from '@/components/CatalogMap'
import { CatalogShell } from '@/components/CatalogShell'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { pluralRu } from '@/lib/plural-ru'

const COPY = {
  ru: {
    page: 'страница', of: 'из',
    complexes: (n: number) => `${n} ${pluralRu(n, ['комплекс', 'комплекса', 'комплексов'])}`,
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
  id: {
    page: 'halaman', of: 'dari',
    complexes: (n: number) => `${n} kompleks hunian`,
    emptySearch: (q: string) => `Tidak ada hasil untuk "${q}"`,
    emptyFilters: 'Tidak ada yang cocok dengan filter yang dipilih',
    searchPlaceholder: 'Cari kompleks, wilayah, pengembang…',
  },
  fr: {
    page: 'page', of: 'sur',
    complexes: (n: number) => `${n} résidences`,
    emptySearch: (q: string) => `Aucun résultat pour « ${q} »`,
    emptyFilters: 'Aucun résultat pour les filtres sélectionnés',
    searchPlaceholder: 'Rechercher résidences, quartiers, promoteurs…',
  },
  de: {
    page: 'Seite', of: 'von',
    complexes: (n: number) => `${n} Wohnanlagen`,
    emptySearch: (q: string) => `Nichts gefunden für „${q}“`,
    emptyFilters: 'Keine Treffer für die gewählten Filter',
    searchPlaceholder: 'Wohnanlagen, Gegenden, Bauträger suchen…',
  },
  zh: {
    page: '页', of: '/',
    complexes: (n: number) => `${n} 个住宅区`,
    emptySearch: (q: string) => `未找到“${q}”的结果`,
    emptyFilters: '没有符合所选筛选条件的结果',
    searchPlaceholder: '搜索住宅区、地区、开发商…',
  },
  nl: {
    page: 'pagina', of: 'van',
    complexes: (n: number) => `${n} wooncomplexen`,
    emptySearch: (q: string) => `Niets gevonden voor „${q}”`,
    emptyFilters: 'Niets komt overeen met de geselecteerde filters',
    searchPlaceholder: 'Zoek wooncomplexen, gebieden, ontwikkelaars…',
  },
  ban: {
    page: 'kaca', of: 'saking',
    complexes: (n: number) => `${n} kompleks`,
    emptySearch: (q: string) => `Nenten wenten hasil antuk «${q}»`,
    emptyFilters: 'Nenten wenten sane cocok ring filter sane kapilih',
    searchPlaceholder: 'Rerehin kompleks, wewidangan, pangwangun…',
  },
  pl: {
    page: 'strona', of: 'z',
    complexes: (n: number) => `${n} kompleksów mieszkaniowych`,
    emptySearch: (q: string) => `Nie znaleziono wyników dla „${q}”`,
    emptyFilters: 'Brak wyników dla wybranych filtrów',
    searchPlaceholder: 'Szukaj kompleksów, dzielnic, deweloperów…',
  },
  uk: {
    page: 'сторінка', of: 'з',
    complexes: (n: number) => `${n} ${pluralRu(n, ['житловий комплекс', 'житлові комплекси', 'житлових комплексів'])}`,
    emptySearch: (q: string) => `Нічого не знайдено за запитом «${q}»`,
    emptyFilters: 'Немає результатів за вибраними фільтрами',
    searchPlaceholder: 'Пошук комплексів, районів, забудовників…',
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
  if (f.area) sp.set('area', f.area.join(','))
  return sp.toString()
}

export async function ComplexesCatalog({
  filters,
  page = 1,
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
  const copy = pickCopy(COPY, lang)

  // Карта рядом со списком (владелец 20.11.2026, макет CatB).
  // Карта показывает всё под фильтрами, без выбранной области (?area): иначе
  // после «Показать N здесь» соседние объекты исчезали с карты, а при сдвиге
  // кнопка считала только уже выбранные (21.11.2026).
  const mapFilters = { ...filters, area: null }
  // Цена «от» в подсказке карты — самая низкая из вилл и апартаментов ЖК.
  const fromPrice = (p: { villas?: { from: number }; apartments?: { from: number } } | undefined) => {
    const v = [p?.villas?.from, p?.apartments?.from].filter((x): x is number => x != null && x > 0)
    return v.length ? Math.min(...v) : null
  }
  const mapGroups: CatalogMapGroup[] = await (async () => {
    const all = await loadAll()
    let rows = all.enriched.filter(e => passes(e, mapFilters))
    if (filters.q.trim()) rows = applySearch(rows, filters.q)
    const by = new globalThis.Map<string, CatalogMapGroup>()
    for (const e of rows) {
      const slug = e.slug
      if (e.lat == null || e.lng == null || !slug || slug.startsWith('-')) continue
      const lat = Number(e.lat.toFixed(4)), lng = Number(e.lng.toFixed(4)), key = `${lat},${lng}`
      let g = by.get(key)
      if (!g) { g = { key, lat, lng, items: [] }; by.set(key, g) }
      g.items.push({ slug, title: e.name ?? slug, href: switchLangPath(`/ru/zhilye-kompleksy/o/${slug}`, lang), priceUsd: fromPrice(all.prices.get(e.id)), priceFrom: true, thumb: all.manifest[e.id]?.[0] ?? e.coverUrl ?? null })
    }
    return [...by.values()]
  })().catch(() => [])

  // Use complex tab hrefs (not the apartments ones from CatalogTabs defaults).
  const mapTabHref = buildMapHref(filters, lang)

  const isSingleDistrictHub = filters.district.length === 1
    && filters.year.length === 0
    && filters.types.length === 0
    && filters.q.trim().length === 0
    && actualPage === 1
  const districtSlug = isSingleDistrictHub
    ? (DISTRICT_TO_SLUG[filters.district[0]] ?? filters.district[0].toLowerCase())
    : null
  const districtCopy = districtSlug ? getDistrictCopy(districtSlug, lang) : null
  const districtMeta = districtSlug ? getDistrictCommercialMeta(districtSlug, lang, 'complex', totalCount) : null
  const heading = (lang === 'ru' ? districtMeta?.heading : undefined)
    ?? (lang === 'ru' ? buildHeading(filters) : buildHeadingLocalized(filters, lang))
  const sectionRoot = switchLangPath('/ru/zhilye-kompleksy', lang)

  return (
    <>
      <Header active="zhilye-kompleksy" />

      <CatalogShell
        lang={lang}
        heading={<>
          {heading}
          {actualPage > 1 && (
            <span className="text-[var(--color-text-muted)] font-normal text-[20px] md:text-[24px]">
              {' '}— {copy.page} {actualPage}
            </span>
          )}
        </>}
        count={<>
          {copy.complexes(totalCount)}
          {totalPages > 1 && ` · ${copy.page} ${actualPage} ${copy.of} ${totalPages}`}
        </>}
        mapHref={mapTabHref}
        intro={districtCopy && (
          <DistrictIntroBlock copy={districtCopy} lang={lang} totalCount={totalCount} sectionRoot={sectionRoot} />
        )}
        search={<ComplexCatalogSearchBar initial={filters.q} current={filters} view="list" placeholder={copy.searchPlaceholder} />}
        filters={<ComplexFiltersBar state={filters} options={options} view="list" lang={lang} />}
        
        map={mapGroups.length > 0 ? <CatalogMap groups={mapGroups} lang={lang} /> : null}
      >
        {cards.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            {isSearch ? copy.emptySearch(filters.q) : copy.emptyFilters}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2">
              {cards.map((c, i) => <ComplexCard key={c.id} c={c} lang={lang} priority={i < 2} />)}
            </div>

            {/* key: другие фильтры или область карты — догрузка начинается заново,
                а не дописывает к новому списку карточки старого (и опоздавший
                ответ старого запроса уже некуда дописать). */}
            <ComplexInfiniteScrollClient
              key={toQueryString(filters)}
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

        {districtCopy && districtSlug && (
          <DistrictRelatedLinks
            lang={lang}
            districtName={districtCopy.name}
            districtSlug={districtSlug}
            currentKind="complex"
          />
        )}

        <ComplexesSeoContent filters={filters} variant="list" lang={lang} />

        <div className="h-16" />
      </CatalogShell>
    </>
  )
}
