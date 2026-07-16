// Site-wide internationalization.
//
// 1) Airtable field translation (tField). For a non-RU lang we look up
//    `<field> <SUFFIX>` (e.g. `<field> EN`, `<field> ID`, `<field> FR`).
//    If empty, we fall back down a chain (id/fr → en → ru) so a missing
//    translation degrades to the next most useful language, never to a
//    debug placeholder.
// 2) URL segment mapping. Each language lives under its own path root and
//    localized section segments — `villy` ↔ `villas` ↔ `vila` ↔ `villas`.
//    Listing slugs that follow the section segment are identical across
//    languages (one Airtable SEO:Slug), only the section segment differs.
// 3) UI dictionary. Hardcoded labels (breadcrumbs, sections, buttons) by
//    language, with the same fallback chain as tField.

export type Lang = 'ru' | 'en' | 'id' | 'fr'

/** All supported languages, RU first (source/x-default). */
export const LANGS: readonly Lang[] = ['ru', 'en', 'id', 'fr'] as const

/** Non-RU languages that have a fallback chain toward RU. */
type NonRuLang = Exclude<Lang, 'ru'>

// Per-language fallback order when a translation is missing. RU is the
// ultimate source, EN is the second-most-useful for id/fr audiences.
const FALLBACK: Record<NonRuLang, NonRuLang[]> = {
  en: [],
  id: ['en'],
  fr: ['en'],
}

// Airtable column suffixes to probe for each non-RU language. Case
// variants cover editors who typed `En`/`Id`/`Fr`.
const FIELD_SUFFIX: Record<NonRuLang, string[]> = {
  en: [' EN', ' En'],
  id: [' ID', ' Id'],
  fr: [' FR', ' Fr'],
}

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

// Try every Airtable column suffix for a single language. Returns the
// first non-empty value, or null.
function fieldForLang(
  d: Record<string, unknown>,
  field: string,
  lang: NonRuLang,
): string | null {
  for (const suf of FIELD_SUFFIX[lang]) {
    const v = unwrap(d[`${field}${suf}`])
    if (v) return v
  }
  return null
}

/**
 * Resolve `field` from a raw_* data blob with a fallback chain.
 *
 * - lang='ru'         → data[field]
 * - lang='en'         → data[`${field} EN`] → data[field]
 * - lang='id'/'fr'    → data[`${field} ID|FR`] → data[`${field} EN`] → data[field]
 *
 * Never returns the `<field> LANG` placeholder — a missing translation
 * degrades to the next language in the chain, and ultimately to RU.
 */
export function tField(
  data: Record<string, unknown> | null | undefined,
  field: string,
  lang: Lang,
): string | null {
  const d = data ?? {}
  if (lang === 'ru') return unwrap(d[field])
  const own = fieldForLang(d, field, lang)
  if (own) return own
  for (const next of FALLBACK[lang]) {
    const v = fieldForLang(d, field, next)
    if (v) return v
  }
  return unwrap(d[field])
}

/**
 * Same as tField. Kept as a separate export for call sites that used the
 * old "never show placeholder" variant — behaviour is now identical since
 * tField no longer emits placeholders.
 */
export const tFieldOrRu = tField

// ---- Path-segment mapping ------------------------------------------------

// Section segments per language, keyed by the canonical RU segment. The
// detail-page slugs that follow (o/[slug], [year], [district]) stay
// identical across languages. Folder names under app/<lang>/ MUST match
// these exact values so the URLs and the hreflang cluster line up.
const SEGMENT_TABLE: Record<string, Record<NonRuLang, string>> = {
  villy:              { en: 'villas',      id: 'vila',                     fr: 'villas' },
  apartamenty:        { en: 'apartments',  id: 'apartemen',                fr: 'appartements' },
  'zhilye-kompleksy': { en: 'complexes',   id: 'kompleks',                 fr: 'residences' },
  zastrojshhiki:      { en: 'developers',  id: 'pengembang',               fr: 'promoteurs' },
  arenda:             { en: 'rental',      id: 'sewa',                     fr: 'location' },
  meropriyatiya:      { en: 'events',      id: 'acara',                    fr: 'evenements' },
  novosti:            { en: 'news',        id: 'berita',                   fr: 'actualites' },
  znaniya:            { en: 'knowledge',   id: 'panduan',                  fr: 'guide' },
  akcii:              { en: 'promo',       id: 'promo',                    fr: 'offres' },
  izbrannoe:          { en: 'favourites',  id: 'favorit',                  fr: 'favoris' },
  'kak-kupit':        { en: 'how-to-buy',  id: 'cara-beli',                fr: 'comment-acheter' },
  rezervirovanie:     { en: 'reservation', id: 'reservasi',                fr: 'reservation' },
  'o-balinsky':       { en: 'about',       id: 'tentang',                  fr: 'a-propos' },
  karta:              { en: 'map',         id: 'peta',                     fr: 'carte' },
  poisk:              { en: 'search',      id: 'cari',                     fr: 'recherche' },
  kontakty:           { en: 'contact',     id: 'kontak',                   fr: 'contact' },
  sdano:              { en: 'completed-in', id: 'selesai-tahun',           fr: 'livre-en' },
  'zhizn-na-bali':    { en: 'living-in-bali', id: 'hidup-di-bali',         fr: 'vivre-a-bali' },
  'investicii-v-nedvizhimost-bali': { en: 'bali-property-investment', id: 'investasi-properti-bali', fr: 'investissement-immobilier-bali' },
  'invest-tour':      { en: 'invest-tour', id: 'invest-tour',              fr: 'invest-tour' },
  cookie:             { en: 'cookie',      id: 'cookie',                   fr: 'cookie' },
  'politika-konfidencialnosti': { en: 'privacy', id: 'privasi',           fr: 'confidentialite' },
  usloviya:           { en: 'terms',       id: 'ketentuan',                fr: 'conditions' },
}

// value(in any language) -> canonical RU key. Built once at module load.
const SEG_TO_CANON: Record<string, string> = {}
for (const [ru, m] of Object.entries(SEGMENT_TABLE)) {
  SEG_TO_CANON[ru] = ru
  for (const l of ['en', 'id', 'fr'] as const) SEG_TO_CANON[m[l]] = ru
}

/** Convert a single path segment to `target`. Pass-through for unknowns. */
export function localizeSegment(seg: string, target: Lang): string {
  const canon = SEG_TO_CANON[seg] ?? seg
  if (target === 'ru') return canon
  return SEGMENT_TABLE[canon]?.[target] ?? canon
}

/** Detect the language from a pathname's first segment. Defaults to RU. */
export function detectLang(pathname: string): Lang {
  const head = pathname.split('/').filter(Boolean)[0]
  return (LANGS as readonly string[]).includes(head) ? (head as Lang) : 'ru'
}

/** Map e.g. `/ru/villy/o/X` ↔ `/en/villas/o/X` ↔ `/id/vila/o/X`. */
export function switchLangPath(pathname: string, target: Lang): string {
  if (!pathname.startsWith('/')) pathname = '/' + pathname
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return `/${target}`
  const [head, ...rest] = parts
  if (!(LANGS as readonly string[]).includes(head)) return `/${target}`
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
  id: {
    'nav.villas': 'Vila',
    'nav.apartments': 'Apartemen',
    'nav.complexes': 'Kompleks hunian',
    'nav.developers': 'Pengembang',
    'nav.rental': 'Sewa jangka panjang',
    'breadcrumbs.home': 'Beranda',
    'breadcrumbs.villas': 'Vila',
    'breadcrumbs.apartments': 'Apartemen',
    'breadcrumbs.complexes': 'Kompleks hunian',
    'breadcrumbs.developers': 'Pengembang',
    'price.label': 'Harga',
    'price.priceUpdated': 'Harga diperbarui',
    'price.perSqm': 'per m²',
    'cta.buy': 'Beli',
    'cta.buyChat': 'Beli — chat di Telegram',
    'cta.buySeller': 'Beli — hubungi penjual',
    'cta.reserve': 'Reservasi',
    'facts.bedrooms': 'Kamar tidur',
    'facts.area': 'Luas',
    'facts.land': 'Luas tanah',
    'facts.year': 'Serah terima',
    'facts.district': 'Distrik',
    'facts.airport': 'Ke bandara',
    'facts.priceM2': 'Harga per m²',
    'sections.faq': 'Pertanyaan yang sering diajukan',
    'sections.location': 'Lokasi',
    'sections.about': 'Tentang properti',
    'sections.description': 'Deskripsi',
    'sections.priceBreakdown': 'Rincian harga',
    'sections.investment': 'Potensi investasi',
    'sections.developer': 'Pengembang',
    'sections.complex': 'Kompleks hunian',
    'sections.related': 'Properti serupa',
    'reserved.banner.title': 'Sedang direservasi',
    'reserved.banner.until': 'Hold berlaku hingga',
    'misc.viewAll': 'Lihat semua →',
    'misc.loading': 'Memuat…',
    'misc.empty': 'Kosong',
    'misc.notFound': 'Tidak ditemukan',
  },
  fr: {
    'nav.villas': 'Villas',
    'nav.apartments': 'Appartements',
    'nav.complexes': 'Résidences',
    'nav.developers': 'Promoteurs',
    'nav.rental': 'Location longue durée',
    'breadcrumbs.home': 'Accueil',
    'breadcrumbs.villas': 'Villas',
    'breadcrumbs.apartments': 'Appartements',
    'breadcrumbs.complexes': 'Résidences',
    'breadcrumbs.developers': 'Promoteurs',
    'price.label': 'Prix',
    'price.priceUpdated': 'Prix mis à jour',
    'price.perSqm': 'par m²',
    'cta.buy': 'Acheter',
    'cta.buyChat': 'Acheter — chat sur Telegram',
    'cta.buySeller': 'Acheter — contacter le vendeur',
    'cta.reserve': 'Réserver',
    'facts.bedrooms': 'Chambres',
    'facts.area': 'Surface',
    'facts.land': 'Terrain',
    'facts.year': 'Livraison',
    'facts.district': 'Quartier',
    'facts.airport': "Vers l'aéroport",
    'facts.priceM2': 'Prix au m²',
    'sections.faq': 'Questions fréquentes',
    'sections.location': 'Emplacement',
    'sections.about': 'À propos du bien',
    'sections.description': 'Description',
    'sections.priceBreakdown': 'Détail du prix',
    'sections.investment': "Potentiel d'investissement",
    'sections.developer': 'Promoteur',
    'sections.complex': 'Résidence',
    'sections.related': 'Biens similaires',
    'reserved.banner.title': 'Actuellement réservé',
    'reserved.banner.until': "Réservation valable jusqu'au",
    'misc.viewAll': 'Tout voir →',
    'misc.loading': 'Chargement…',
    'misc.empty': 'Vide',
    'misc.notFound': 'Introuvable',
  },
} as const

/**
 * Pick a language entry from a local `{ ru, en, ... }` copy object with an
 * id/fr → en → ru fallback. Mirrors the old `COPY[lang]` behaviour (which
 * only had ru/en) while tolerating the new id/fr languages: per-page copy
 * that hasn't been translated yet degrades to English, then Russian, never
 * to `undefined`. Add `id`/`fr` keys to a dict to override the fallback.
 */
export function pickCopy<D extends Record<'ru' | 'en', unknown>>(
  dict: D,
  lang: Lang,
): D['ru'] | D['en'] {
  const d = dict as Record<string, D['ru'] | D['en']>
  return d[lang] ?? d.en ?? d.ru
}

export type UIKey = keyof (typeof UI)['ru']

/** Translate a UI key with an id/fr → en → ru fallback chain. */
export function t(key: UIKey, lang: Lang): string {
  const own = UI[lang][key]
  if (own) return own
  if (lang !== 'ru' && lang !== 'en') {
    for (const next of FALLBACK[lang]) {
      const v = UI[next][key]
      if (v) return v
    }
  }
  return UI.ru[key] ?? key
}
