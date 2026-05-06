// Site-wide internationalization.
//
// 1) Airtable field translation (tField). For lang='en' we look up
//    `<field> EN` first; if empty, render the literal column name as a
//    placeholder so editors immediately see what to fill in.
// 2) URL segment mapping. Russian and English versions of the site
//    live under different path roots — `villy` ↔ `villas`, etc.
// 3) UI dictionary. Hardcoded labels (breadcrumbs, sections, buttons)
//    by language.

export type Lang = 'ru' | 'en'

// ---- Airtable field unwrap + translate -----------------------------------

function unwrap(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    for (const x of v) {
      const u = unwrap(x); if (u) return u
    }
    return null
  }
  if (typeof v === 'object' && v !== null && 'value' in v) {
    return unwrap((v as { value: unknown }).value)
  }
  return null
}

/**
 * Resolve `field` from a raw_* data blob with English-fallback rules.
 *
 * - lang='ru'    → return data[field], unwrapped to a string
 * - lang='en'    → try data[`${field} EN`] then data[`${field} En`]; the
 *   first non-empty value wins. Falls back to the literal placeholder
 *   `${field} EN` so editors see which Airtable column to create. If the
 *   RU side is also empty, returns null.
 */
export function tField(
  data: Record<string, unknown> | null | undefined,
  field: string,
  lang: Lang,
): string | null {
  const d = data ?? {}
  if (lang === 'ru') return unwrap(d[field])
  const en = unwrap(d[`${field} EN`]) ?? unwrap(d[`${field} En`])
  if (en) return en
  const ru = unwrap(d[field])
  return ru ? `${field} EN` : null
}

/** Same as tField but never shows the placeholder — falls back to RU. */
export function tFieldOrRu(
  data: Record<string, unknown> | null | undefined,
  field: string,
  lang: Lang,
): string | null {
  const d = data ?? {}
  if (lang === 'ru') return unwrap(d[field])
  const en = unwrap(d[`${field} EN`]) ?? unwrap(d[`${field} En`])
  if (en) return en
  return unwrap(d[field])
}

// ---- Path-segment mapping ------------------------------------------------

// Top-level section segments. The detail-page slugs that follow them
// stay identical in both languages — listings carry one Airtable
// SEO:Slug, and we don't translate it.
const SEGMENTS: Record<string, string> = {
  villy: 'villas',
  apartamenty: 'apartments',
  'zhilye-kompleksy': 'complexes',
  zastrojshhiki: 'developers',
  arenda: 'rental',
  meropriyatiya: 'events',
  novosti: 'news',
  znaniya: 'knowledge',
  akcii: 'promo',
  izbrannoe: 'favourites',
  'kak-kupit': 'how-to-buy',
  rezervirovanie: 'reservation',
  'o-balinsky': 'about',
  karta: 'map',
}
const SEGMENTS_REV: Record<string, string> = Object.fromEntries(
  Object.entries(SEGMENTS).map(([ru, en]) => [en, ru]),
)

/** Convert a path segment in either direction. Pass-through for unknowns. */
export function localizeSegment(seg: string, target: Lang): string {
  if (target === 'en') return SEGMENTS[seg] ?? seg
  return SEGMENTS_REV[seg] ?? seg
}

/** Map `/ru/villy/o/X` ↔ `/en/villas/o/X`. */
export function switchLangPath(pathname: string, target: Lang): string {
  if (!pathname.startsWith('/')) pathname = '/' + pathname
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return `/${target}`
  const [head, ...rest] = parts
  if (head !== 'ru' && head !== 'en') return `/${target}`
  if (head === target) return pathname
  // Translate every section-name segment along the way; opaque tail
  // segments (slugs, IDs) pass through unchanged.
  const translated = rest.map(p => localizeSegment(p, target))
  return '/' + [target, ...translated].join('/')
}

// ---- UI dictionary -------------------------------------------------------

// Keep additions flat / typed at the leaves so consumers can autocomplete.
// The structure mirrors how it's used: `t('nav.villas', 'en')`.
export const UI = {
  ru: {
    'nav.villas': 'Виллы и дома',
    'nav.apartments': 'Апартаменты',
    'nav.complexes': 'Жилые комплексы',
    'nav.developers': 'Застройщики',
    'nav.rental': 'Аренда',
    'breadcrumbs.home': 'Главная',
    'breadcrumbs.villas': 'Виллы и дома',
    'breadcrumbs.apartments': 'Апартаменты',
    'breadcrumbs.complexes': 'Жилые комплексы',
    'breadcrumbs.developers': 'Застройщики',
    'price.label': 'Цена',
    'price.priceUpdated': 'Цена обновлена',
    'price.perSqm': 'за м²',
    'cta.buy': 'Купить',
    'cta.buyChat': 'Купить — чат в Telegram',
    'cta.buySeller': 'Купить — связаться с продавцом',
    'cta.reserve': 'Зарезервировать',
    'facts.bedrooms': 'Спальни',
    'facts.area': 'Площадь',
    'facts.land': 'Участок',
    'facts.year': 'Сдача',
    'facts.district': 'Район',
    'facts.airport': 'До аэропорта',
    'facts.priceM2': 'Цена за м²',
    'sections.faq': 'Часто задаваемые вопросы',
    'sections.location': 'Расположение',
    'sections.about': 'Об объекте',
    'sections.description': 'Описание',
    'sections.priceBreakdown': 'Разбивка по цене',
    'sections.investment': 'Инвестиционный потенциал',
    'sections.developer': 'Застройщик',
    'sections.complex': 'Жилой комплекс',
    'sections.related': 'Похожие объекты',
    'reserved.banner.title': 'Объект сейчас забронирован',
    'reserved.banner.until': 'Hold действует до',
    'misc.viewAll': 'Все →',
    'misc.loading': 'Загрузка…',
    'misc.empty': 'Пусто',
    'misc.notFound': 'Не найдено',
  },
  en: {
    'nav.villas': 'Villas',
    'nav.apartments': 'Apartments',
    'nav.complexes': 'Residential complexes',
    'nav.developers': 'Developers',
    'nav.rental': 'Long-term rental',
    'breadcrumbs.home': 'Home',
    'breadcrumbs.villas': 'Villas',
    'breadcrumbs.apartments': 'Apartments',
    'breadcrumbs.complexes': 'Residential complexes',
    'breadcrumbs.developers': 'Developers',
    'price.label': 'Price',
    'price.priceUpdated': 'Price updated',
    'price.perSqm': 'per m²',
    'cta.buy': 'Buy',
    'cta.buyChat': 'Buy — chat on Telegram',
    'cta.buySeller': 'Buy — contact seller',
    'cta.reserve': 'Reserve',
    'facts.bedrooms': 'Bedrooms',
    'facts.area': 'Area',
    'facts.land': 'Land plot',
    'facts.year': 'Completion',
    'facts.district': 'District',
    'facts.airport': 'To airport',
    'facts.priceM2': 'Price per m²',
    'sections.faq': 'Frequently asked questions',
    'sections.location': 'Location',
    'sections.about': 'About the property',
    'sections.description': 'Description',
    'sections.priceBreakdown': 'Price breakdown',
    'sections.investment': 'Investment potential',
    'sections.developer': 'Developer',
    'sections.complex': 'Residential complex',
    'sections.related': 'Similar properties',
    'reserved.banner.title': 'Currently reserved',
    'reserved.banner.until': 'Hold expires on',
    'misc.viewAll': 'View all →',
    'misc.loading': 'Loading…',
    'misc.empty': 'Empty',
    'misc.notFound': 'Not found',
  },
} as const

export type UIKey = keyof (typeof UI)['ru']

export function t(key: UIKey, lang: Lang): string {
  return UI[lang][key] ?? UI.ru[key] ?? key
}
