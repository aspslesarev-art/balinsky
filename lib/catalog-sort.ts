// Сортировка каталогов вилл и апартаментов (?sort=…).
//
// Без параметра — прежний «умный» порядок (доходность + просмотры + свежесть,
// ТОП-объекты сверху). Параметр живёт в URL как остальные фильтры: middleware
// переписывает любой URL с параметрами на динамический /q, так что голый
// каталог остаётся в ISR, а сортировка не плодит кэшируемых страниц.
// Отсортированный вид никогда не канонический (buildCanonicalPath → null),
// поэтому чистые SEO-адреса /ru/villy/canggu сортировку не получают —
// ссылка уходит в query-форму.
import { pickCopy, type Lang } from './i18n'

export const CATALOG_SORTS = ['price-asc', 'price-desc', 'yield-desc', 'sqm-asc'] as const
export type CatalogSort = typeof CATALOG_SORTS[number]

export function parseCatalogSort(v: string | undefined | null): CatalogSort | undefined {
  return v && (CATALOG_SORTS as readonly string[]).includes(v) ? (v as CatalogSort) : undefined
}

type SortKeys = {
  price: number | null
  // Доходность сайта до налогов (единицы не важны, лишь бы одни у всех).
  // null — не посчитана или жёлтая земля (посуточно сдавать нельзя).
  yield: number | null
  pricePerSqm: number | null
}

// Объекты без значения по выбранному ключу всегда уходят в конец — иначе
// «цена ↑» открывалась бы виллами «цена по запросу». Сортировка стабильная:
// при равных значениях сохраняется прежний умный порядок.
export function applyCatalogSort<T>(items: T[], sort: CatalogSort, keys: (item: T) => SortKeys): T[] {
  const pick = (k: SortKeys): number | null => {
    if (sort === 'price-asc' || sort === 'price-desc') return k.price
    if (sort === 'yield-desc') return k.yield
    return k.pricePerSqm
  }
  const dir = sort === 'price-asc' || sort === 'sqm-asc' ? 1 : -1
  const withKey = items.map((item, i) => ({ item, i, v: pick(keys(item)) }))
  withKey.sort((a, b) => {
    const av = a.v != null && Number.isFinite(a.v) && a.v > 0 ? a.v : null
    const bv = b.v != null && Number.isFinite(b.v) && b.v > 0 ? b.v : null
    if (av == null && bv == null) return a.i - b.i
    if (av == null) return 1
    if (bv == null) return -1
    return (av - bv) * dir || a.i - b.i
  })
  return withKey.map(x => x.item)
}

// Цена за м²: цена / площадь (свежая, как в карточке), иначе поле
// «Цена м²» из базы.
export function pricePerSqmOf(priceUsd: number | null, area: number | null, stored: number | null | undefined): number | null {
  if (priceUsd != null && priceUsd > 0 && area != null && area > 0) return priceUsd / area
  if (stored != null && Number.isFinite(stored) && stored > 0) return stored
  return null
}

export const SORT_COPY = {
  ru: { label: 'Сортировка', default: 'Сначала интересные', 'price-asc': 'Сначала дешевле', 'price-desc': 'Сначала дороже', 'yield-desc': 'Доходность выше', 'sqm-asc': 'Дешевле за м²' },
  en: { label: 'Sort', default: 'Recommended', 'price-asc': 'Price: low to high', 'price-desc': 'Price: high to low', 'yield-desc': 'Highest yield', 'sqm-asc': 'Lowest price per m²' },
  id: { label: 'Urutkan', default: 'Rekomendasi', 'price-asc': 'Harga terendah', 'price-desc': 'Harga tertinggi', 'yield-desc': 'Imbal hasil tertinggi', 'sqm-asc': 'Harga per m² terendah' },
  fr: { label: 'Trier', default: 'Recommandés', 'price-asc': 'Prix croissant', 'price-desc': 'Prix décroissant', 'yield-desc': 'Meilleur rendement', 'sqm-asc': 'Prix au m² le plus bas' },
  de: { label: 'Sortieren', default: 'Empfohlen', 'price-asc': 'Preis aufsteigend', 'price-desc': 'Preis absteigend', 'yield-desc': 'Höchste Rendite', 'sqm-asc': 'Niedrigster m²-Preis' },
  zh: { label: '排序', default: '推荐', 'price-asc': '价格从低到高', 'price-desc': '价格从高到低', 'yield-desc': '收益率最高', 'sqm-asc': '每平方米价格最低' },
  nl: { label: 'Sorteren', default: 'Aanbevolen', 'price-asc': 'Prijs oplopend', 'price-desc': 'Prijs aflopend', 'yield-desc': 'Hoogste rendement', 'sqm-asc': 'Laagste prijs per m²' },
  ban: { label: 'Urutang', default: 'Rekomendasi', 'price-asc': 'Aji pinih murah', 'price-desc': 'Aji pinih mael', 'yield-desc': 'Asil pinih ageng', 'sqm-asc': 'Aji per m² pinih murah' },
  pl: { label: 'Sortuj', default: 'Polecane', 'price-asc': 'Cena rosnąco', 'price-desc': 'Cena malejąco', 'yield-desc': 'Najwyższa rentowność', 'sqm-asc': 'Najniższa cena za m²' },
  uk: { label: 'Сортування', default: 'Спершу цікаві', 'price-asc': 'Спершу дешевші', 'price-desc': 'Спершу дорожчі', 'yield-desc': 'Вища дохідність', 'sqm-asc': 'Дешевше за м²' },
} as const

export function sortCopy(lang: Lang) {
  return pickCopy(SORT_COPY, lang)
}
