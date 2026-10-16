// Пустая выдача каталога: сначала пробуем понять поисковую фразу как фильтры
// (lib/catalog-query-parser.ts), а если и так пусто — ослабляем условия по
// шагам и показываем ближайшие варианты вместо «ничего не найдено».
import { parseCatalogQuery } from './catalog-query-parser'
import { pickCopy, type Lang } from './i18n'

type Base = {
  q: string
  priceMin: number | null
  priceMax: number | null
  bedrooms: string[]
  district: string[]
}

// Текстовый поиск ничего не дал — разбираем фразу в фильтры. null — в
// фразе нет ни района, ни спален, ни цены.
export function filtersFromQuery<T extends Base>(f: T): T | null {
  if (!f.q.trim()) return null
  const p = parseCatalogQuery(f.q)
  if (!p.structured) return null
  const next: T = {
    ...f,
    q: p.rest,
    priceMin: p.priceMin ?? f.priceMin,
    priceMax: p.priceMax ?? f.priceMax,
    bedrooms: p.bedrooms.length ? p.bedrooms : f.bedrooms,
    district: p.district.length ? p.district : f.district,
  }
  // Только тип объекта («вилла») без других условий — это не повод
  // подменять выдачу: каталог и так про виллы.
  if (next.q === f.q && next.priceMin === f.priceMin && next.priceMax === f.priceMax
    && next.bedrooms === f.bedrooms && next.district === f.district) return null
  return next
}

export type RelaxStep = 'q' | 'price' | 'bedrooms' | 'district'

// Шаги ослабления — от самого мягкого к самому сильному. Каждый следующий
// включает предыдущие: сначала убираем текст, потом расширяем бюджет на 25%,
// потом соседнее число спален, потом район.
export function relaxSteps<T extends Base>(f: T): { step: RelaxStep; filters: T }[] {
  const out: { step: RelaxStep; filters: T }[] = []
  let cur = f
  if (cur.q.trim()) { cur = { ...cur, q: '' }; out.push({ step: 'q', filters: cur }) }
  if (cur.priceMax != null || cur.priceMin != null) {
    cur = {
      ...cur,
      priceMax: cur.priceMax != null ? Math.round(cur.priceMax * 1.25) : null,
      priceMin: cur.priceMin != null ? Math.round(cur.priceMin * 0.8) : null,
    }
    out.push({ step: 'price', filters: cur })
  }
  if (cur.bedrooms.length) {
    const nums = cur.bedrooms.map(Number).filter(Number.isFinite)
    const wider = new Set(cur.bedrooms)
    for (const n of nums) { if (n > 1) wider.add(String(n - 1)); wider.add(String(n + 1)) }
    cur = { ...cur, bedrooms: [...wider] }
    out.push({ step: 'bedrooms', filters: cur })
  }
  if (cur.district.length) { cur = { ...cur, district: [] }; out.push({ step: 'district', filters: cur }) }
  return out
}

const COPY = {
  ru: { title: 'Точных совпадений нет. Ближайшие варианты', q: 'без текста запроса', price: 'бюджет +25%', bedrooms: 'спален на одну больше или меньше', district: 'по всему Бали', all: 'Смотреть все' },
  en: { title: 'No exact matches. Closest options', q: 'without the search text', price: 'budget +25%', bedrooms: 'one bedroom more or less', district: 'all of Bali', all: 'See all' },
  id: { title: 'Tidak ada yang persis cocok. Pilihan terdekat', q: 'tanpa teks pencarian', price: 'anggaran +25%', bedrooms: 'kamar tidur lebih atau kurang satu', district: 'seluruh Bali', all: 'Lihat semua' },
  fr: { title: 'Aucun résultat exact. Options les plus proches', q: 'sans le texte de recherche', price: 'budget +25 %', bedrooms: 'une chambre de plus ou de moins', district: 'tout Bali', all: 'Tout voir' },
  de: { title: 'Keine exakten Treffer. Die nächsten Optionen', q: 'ohne Suchtext', price: 'Budget +25 %', bedrooms: 'ein Schlafzimmer mehr oder weniger', district: 'ganz Bali', all: 'Alle ansehen' },
  zh: { title: '没有完全匹配的结果。最接近的选项', q: '不含搜索文字', price: '预算 +25%', bedrooms: '卧室多一间或少一间', district: '整个巴厘岛', all: '查看全部' },
  nl: { title: 'Geen exacte resultaten. Dichtstbijzijnde opties', q: 'zonder zoektekst', price: 'budget +25%', bedrooms: 'één slaapkamer meer of minder', district: 'heel Bali', all: 'Alles bekijken' },
  ban: { title: 'Nenten wenten sane pateh. Pilihan sane nampek', q: 'tanpa teks rereh', price: 'anggaran +25%', bedrooms: 'kamar pules lebih utawi kirang asiki', district: 'sajebag Bali', all: 'Cingak makasami' },
  pl: { title: 'Brak dokładnych wyników. Najbliższe opcje', q: 'bez tekstu wyszukiwania', price: 'budżet +25%', bedrooms: 'o jedną sypialnię więcej lub mniej', district: 'całe Bali', all: 'Zobacz wszystkie' },
  uk: { title: 'Точних збігів немає. Найближчі варіанти', q: 'без тексту запиту', price: 'бюджет +25%', bedrooms: 'на одну спальню більше чи менше', district: 'по всьому Балі', all: 'Дивитися всі' },
} as const

export function alternativesCopy(lang: Lang) {
  return pickCopy(COPY, lang)
}

// Подпись «что ослабили»: «бюджет +25% · по всему Бали».
export function relaxNote(steps: RelaxStep[], lang: Lang): string {
  const c = pickCopy(COPY, lang)
  return steps.map(s => c[s]).join(' · ')
}
