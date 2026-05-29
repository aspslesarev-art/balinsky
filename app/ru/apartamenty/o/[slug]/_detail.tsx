// Shared apartment-detail renderer for both /ru/apartamenty/o/[slug]
// and /en/apartments/o/[slug]. Layout / data fetching live here only.

import type { ReactNode } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  BedDouble, Square, Building2, Calendar, FileCheck2, Lock, MapPin, Plane,
  ChevronRight, Layers, HardHat, Star,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { ApartmentCard, type ApartmentCardData } from '@/components/ApartmentCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { getDeveloperStats } from '@/lib/developer-stats'
import { loadAllVideos, matchesLang as videoMatchesLang } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { PageViewTracker } from '@/components/PageViewTracker'
import dynamic from 'next/dynamic'
// Heavy client widgets — pulled off the initial JS bundle. Both render
// below the fold on detail pages, so late hydration is invisible.
const InvestmentWidget = dynamic(
  () => import('@/components/InvestmentWidget').then(m => ({ default: m.InvestmentWidget })),
)
const LandProfileBlock = dynamic(
  () => import('@/components/LandProfileBlock').then(m => ({ default: m.LandProfileBlock })),
)
import { RentalCompareSection } from '@/components/RentalCompareSection'
import { LazyMount } from '@/components/LazyMount'
import { ManagerCard } from '@/components/ManagerCard'
import { ContactBlock } from '@/components/ContactBlock'
import { loadManagersByDeveloperName } from '@/lib/managers'
import { PriceCtaCard } from '@/components/PriceCtaCard'
import { findActiveReservation } from '@/lib/reservations'
import { loadLandProfile, landAllowsBuilding } from '@/lib/land-profile'
import { loadMarketStats } from '@/lib/complex-market-stats'
import { MarketStatsBlock } from '@/components/MarketStatsBlock'
import { InlinePrice } from '@/components/InlinePrice'
import { VillaPresentationButton } from '@/components/VillaPresentation'
import { tField, type Lang } from '@/lib/i18n'
import { normalizeSlug } from '@/lib/slug-normalize'
import { loadEnTranslations, mergeEnTranslations } from '@/lib/en-translations'
import { pluralRu } from '@/lib/plural-ru'
import { districtRu } from '@/lib/district-ru'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null, lang: Lang): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  if (lang === 'en') return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`
}

const COPY = {
  ru: {
    home: 'Главная', aptCrumb: 'Апартаменты',
    sqm: 'м²', floor: 'Этаж', bali: 'Бали', completed: 'Сдан',
    factsHeading: 'Характеристики',
    factArea: 'Площадь', factFloor: 'Этаж', factCompletion: 'Сдача',
    factPermits: 'Разрешения', factLeasehold: 'Лизхолд', factDistrict: 'Район',
    factAirport: 'До аэропорта', factGround: 'Цокольный',
    factLeaseValue: (l: string) => `${l} лет`,
    descHeading: 'Описание',
    complexLabel: 'Жилой комплекс',
    developerLabel: 'Застройщик',
    openComplex: 'Открыть страницу комплекса',
    openDeveloper: 'Открыть страницу застройщика',
    completedShort: 'сдан',
    completion: (y: string) => `сдача ${y}`,
    units: (n: number) => `${n} ${pluralRu(n, ['юнит', 'юнита', 'юнитов'])}`,
    sellingSeparately: 'Продаётся отдельно (вне комплекса)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Бали, Индонезия`,
    relatedHeading: 'По теме',
    related: {
      allApartments: 'Все апартаменты Бали',
      complexes: 'Жилые комплексы',
      villas: 'Виллы',
      developers: 'Застройщики Бали',
      apartmentsIn: (d: string) => `Апартаменты в ${d}`,
    },
    faqHeading: 'Часто задаваемые вопросы',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `Сколько стоит ${title}?`,
        a: price ? `Текущая цена объекта — ${price}. Актуальный прайс всегда указан в карточке выше.` : 'Цена уточняется. Свяжитесь для актуального прайса.' },
      { q: `Где находится ${title}?`,
        a: district ? `Объект расположен в районе ${district} на Бали. Точные координаты — на карте выше.` : 'Точное расположение и координаты — на карте выше.' },
      { q: 'Можно ли иностранцу купить апартаменты на Бали?',
        a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды) у нотариуса PPAT. Большинство застройщиков работают с международными покупателями.' },
      { q: 'Какой срок лизхолда?',
        a: lease ? `Базовый срок — ${lease} лет. Условия продления уточняйте у застройщика.` : 'Срок лизхолда уточняйте у застройщика. Стандартно 25–80 лет с возможностью продления.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` в районе ${district}` : ''} на Бали${price ? `. Цена ${price}.` : '.'} Фото, планировка, документы.`,
  },
  en: {
    home: 'Home', aptCrumb: 'Apartments',
    sqm: 'm²', floor: 'Floor', bali: 'Bali', completed: 'Completed',
    factsHeading: 'Specs',
    factArea: 'Area', factFloor: 'Floor', factCompletion: 'Completion',
    factPermits: 'Permits', factLeasehold: 'Leasehold', factDistrict: 'District',
    factAirport: 'To airport', factGround: 'Ground floor',
    factLeaseValue: (l: string) => `${l} years`,
    descHeading: 'Description',
    complexLabel: 'Residential complex',
    developerLabel: 'Developer',
    openComplex: 'Open complex page',
    openDeveloper: 'Open developer page',
    completedShort: 'completed',
    completion: (y: string) => `completion ${y}`,
    units: (n: number) => `${n} units`,
    sellingSeparately: 'Sold separately (not part of a complex)',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesia`,
    relatedHeading: 'Related',
    related: {
      allApartments: 'All Bali apartments',
      complexes: 'Residential complexes',
      villas: 'Villas',
      developers: 'Bali developers',
      apartmentsIn: (d: string) => `Apartments in ${d}`,
    },
    faqHeading: 'Frequently asked questions',
    faq: (title: string, district: string | null, price: string | null, lease: string | null) => [
      { q: `How much does ${title} cost?`,
        a: price ? `Current asking price is ${price}. Live price is always shown in the card above.` : 'Price on request. Contact us for current pricing.' },
      { q: `Where is ${title} located?`,
        a: district ? `The property is in ${district}, Bali. Exact coordinates on the map above.` : 'Exact location and coordinates on the map above.' },
      { q: 'Can a foreigner buy a Bali apartment?',
        a: 'Yes. The deal is closed via leasehold (long-term lease) at a PPAT notary. Most developers work with international buyers.' },
      { q: 'What is the leasehold term?',
        a: lease ? `Base term is ${lease} years. Check extension conditions with the developer.` : 'Check the leasehold term with the developer — typically 25–80 years with extension options.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} in Bali${price ? `. Price ${price}.` : '.'} Photos, layout, documents.`,
  },
} as const

export const revalidate = 3600
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`
const DEV_LOOKUP_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_developers.json`
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ slug: string }>
type Row = { airtable_id: string; data: Record<string, unknown> }
// Slim: проекция только нужных полей вместо всего data (~75кб/строка
// → ~300б/строка, -99% egress). findParentComplex матчит по name;
// карточка parentComplex в правой колонке статьи использует остальное.
type ComplexRow = {
  airtable_id: string
  slug: string | null
  cover_url: string | null
  name: string | null
  district: string | null
  district_alt: string | null
  types: unknown
  year: string | null
  year_trail: string | null
  units: number | null
  status: string | null
}

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}
function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/\s/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
function parseGeo(v: unknown): number | null {
  // Airtable's «Geo» / «Geo 2» columns surface as arrays of strings
  // (often with stray whitespace, e.g. ['-8.840928 ']) for apartment
  // rows. The original `numberOrNull(v)` didn't recurse into arrays —
  // every apartment ended up with lat=null, lng=null, and the
  // InvestmentWidget + interactive map silently skipped rendering.
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeo(v[0])
  return null
}
function fmtUsd(n: number | null): string | null {
  if (n == null) return null
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}
function cleanTitle(s: string | null): string | null {
  if (!s) return null
  return s.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() || null
}
// Reject titles whose formula was missing the complex slot ("Апартаменты
// в  - 38 м²"). Same heuristic as in _lib.ts.
function isMalformedAptTitle(s: string | null): boolean {
  if (!s) return false
  return /(?:\s{2}|в\s+-|in\s+-|—\s*-|\bв\s*$)/i.test(s)
}
function fallbackAptTitle(district: string | null, area: number | null, bedrooms: number | null, lang: 'ru' | 'en'): string {
  const parts: string[] = [lang === 'en' ? 'Apartment' : 'Апартаменты']
  if (district) parts.push(lang === 'en' ? `in ${district}` : `в ${district}`)
  const tail: string[] = []
  if (area != null) tail.push(lang === 'en' ? `${area} m²` : `${area} м²`)
  if (bedrooms != null) {
    const word = pluralRu(bedrooms, ['спальня', 'спальни', 'спален'])
    tail.push(lang === 'en' ? `${bedrooms} BR` : `${bedrooms} ${word}`)
  }
  return [parts.join(' '), tail.join(', ')].filter(Boolean).join(' — ')
}

// Slug → id index. Loaded from Storage manifest (avoids 14MB raw_apartments query).
// `aliases` carries the legacy "dirty" Airtable slug (cyrillic look-
// alikes, parens, etc.) so old GSC-cached URLs can resolve to the
// same id and 301 to the canonical clean slug.
type AptIndexEntry = { id: string; slug: string; district: string | null; aliases?: string[] }
const APT_INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_apartments-index.json`
let _aptIndexCache: { ts: number; data: AptIndexEntry[] } | null = null
let _aptIndexInflight: Promise<AptIndexEntry[]> | null = null

async function _loadApartmentIndex(): Promise<AptIndexEntry[]> {
  if (_aptIndexCache && Date.now() - _aptIndexCache.ts < 30 * 60 * 1000) return _aptIndexCache.data
  if (_aptIndexInflight) return _aptIndexInflight
  _aptIndexInflight = (async () => {
    try {
      const r = await fetch(APT_INDEX_URL, { next: { revalidate: 10 } })
      if (!r.ok) return _aptIndexCache?.data ?? []
      const j = await r.json() as { items: AptIndexEntry[] }
      const items = j.items ?? []
      _aptIndexCache = { ts: Date.now(), data: items }
      return items
    } catch {
      return _aptIndexCache?.data ?? []
    }
  })().finally(() => { _aptIndexInflight = null })
  return _aptIndexInflight
}
const _loadApartmentById = unstable_cache(
  async (id: string): Promise<Row | null> => {
    const [{ data }, enCache] = await Promise.all([
      sb.from('raw_apartments').select('airtable_id, data').eq('airtable_id', id).maybeSingle(),
      loadEnTranslations('apartments'),
    ])
    const raw = (data as Row | null) ?? null
    if (!raw) return null
    // Mirror what the catalog loader does — merge cached EN translations
    // into the row so tField() picks them up. Detail page never hits the
    // catalog loadAllApartments, so the merge has to live here too.
    return { ...raw, data: mergeEnTranslations(raw.data, raw.airtable_id, enCache) }
  },
  ['apartment-by-id-detail-v2'],
  { revalidate: 3600 },
)
const _loadAptManifest = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    try {
      const r = await fetch(PHOTO_MANIFEST_URL)
      return r.ok ? r.json() : {}
    } catch { return {} }
  },
  ['apt-manifest-detail'],
  { revalidate: 3600 },
)
const _loadDevLookup = unstable_cache(
  async (): Promise<Record<string, string>> => {
    // Throw on fetch failure so empty {} doesn't get cached for an
    // hour and break developer cross-links on every apartment page.
    const r = await fetch(DEV_LOOKUP_URL)
    if (!r.ok) throw new Error(`dev-lookup http_${r.status}`)
    const j = await r.json() as Record<string, string>
    if (Object.keys(j).length === 0) throw new Error('dev-lookup returned empty — refusing to cache')
    return j
  },
  ['dev-lookup-detail-v2'],
  { revalidate: 600 },
)
// Full developer index (slug + logo + a few highlights) so the apartment
// detail page can render the same rich developer card the villa page
// shows — clickable link to /ru/zastrojshhiki/<slug>, logo, top 3
// editorial bullets from «Репутация и опыт». Mirrors villy/_detail.tsx.
type DeveloperLite = {
  slug: string
  name: string
  logoUrl: string | null
  highlights: string[]
}
// JSON-projection вместо `data` целиком: -98% egress на этом индексе.
type DeveloperSlimRow = {
  airtable_id: string
  logo_url: string | null
  published: boolean | null
  name: string | null
  slug: string | null
  reputation: string | null
  construction: string | null
}
const _loadDevelopersIndex = unstable_cache(
  async (): Promise<DeveloperLite[]> => {
    const { data, error } = await sb.from('raw_developers').select(`
      airtable_id, logo_url,
      published:data->"Публикация",
      name:data->Developer,
      slug:data->"SEO:Slug",
      reputation:data->"Репутация и опыт",
      construction:data->"Строительство и недвижимость"
    `).limit(200)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const rows = (data ?? []) as DeveloperSlimRow[]
    if (rows.length === 0) throw new Error('raw_developers returned 0 rows — refusing to cache empty')
    const out: DeveloperLite[] = []
    for (const r of rows) {
      if (r.published !== true) continue
      if (!r.name || !r.slug) continue
      const sourceText = r.reputation ?? r.construction ?? ''
      const highlights = sourceText
        .split('\n')
        .map(l => l.replace(/^[\s•\-–—·]+/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
      out.push({ slug: r.slug, name: r.name, logoUrl: r.logo_url, highlights })
    }
    return out
  },
  ['apt-developers-index-v2'],
  { revalidate: 600 },
)
function findDeveloperByName(targetName: string | null, list: DeveloperLite[]): DeveloperLite | null {
  if (!targetName) return null
  const t = targetName.toLowerCase().trim()
  return list.find(d => d.name.toLowerCase() === t)
    ?? list.find(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()))
    ?? null
}
// Complexes — small set (186 rows), but full data ~9MB. Module cache + paginated fetch.
let _complexesCache: { ts: number; data: ComplexRow[] } | null = null
let _complexesInflight: Promise<ComplexRow[]> | null = null

async function _loadAllComplexes(): Promise<ComplexRow[]> {
  if (_complexesCache && Date.now() - _complexesCache.ts < 30 * 60 * 1000) return _complexesCache.data
  if (_complexesInflight) return _complexesInflight
  _complexesInflight = (async () => {
    try {
      const out: ComplexRow[] = []
      for (let from = 0; from < 1000; from += 100) {
        // Slim projection: 189 строк × ~75кб/data = ~14МБ → теперь ~70кб.
        const { data, error } = await sb.from('raw_complexes').select(`
          airtable_id, slug, cover_url,
          name:data->Project,
          district_alt:data->Location,
          district:data->"Location 2",
          types:data->"Типы юнитов",
          year:data->"Year of completion",
          year_trail:data->"Year of completion ",
          units:data->"Total quantity of units",
          status:data->"Статус"
        `).range(from, from + 99)
        if (error || !data || data.length === 0) break
        out.push(...(data as ComplexRow[]))
        if (data.length < 100) break
      }
      _complexesCache = { ts: Date.now(), data: out }
      return out
    } catch { return _complexesCache?.data ?? [] }
  })().finally(() => { _complexesInflight = null })
  return _complexesInflight
}


// Resolve a URL slug (possibly the dirty alias from a legacy GSC link)
// to { row, canonicalSlug }. Detail page redirects 301 when the URL
// slug isn't already canonical.
async function resolveApartment(urlSlug: string): Promise<{ row: Row; canonicalSlug: string } | null> {
  const idx = await _loadApartmentIndex()
  // Direct match on the canonical slug (the common case).
  let entry = idx.find(e => e.slug === urlSlug)
  if (!entry) {
    // Alias lookup: normalised version of the URL slug, then any
    // explicit alias the index carries.
    const normalised = normalizeSlug(urlSlug)
    entry = idx.find(e => e.slug === normalised) || idx.find(e => e.aliases?.includes(urlSlug))
  }
  if (!entry) return null
  const row = await _loadApartmentById(entry.id)
  if (!row) return null
  return { row, canonicalSlug: entry.slug }
}

async function loadApartmentBySlug(slug: string): Promise<Row | null> {
  const r = await resolveApartment(slug)
  return r?.row ?? null
}

// Best-effort match of apartment to its parent complex by extracting the
// complex name from the SEO:Title and finding it in raw_complexes.
function findParentComplex(aptTitle: string, complexes: ComplexRow[]): ComplexRow | null {
  const lower = aptTitle.toLowerCase()
  let best: { c: ComplexRow; len: number } | null = null
  for (const c of complexes) {
    if (!c.name) continue
    const n = c.name.toLowerCase()
    if (n.length < 4) continue
    if (lower.includes(n)) {
      if (!best || n.length > best.len) best = { c, len: n.length }
    }
  }
  return best?.c ?? null
}

async function loadOtherApartmentsInDistrict(district: string | null, exceptId: string, lang: Lang = 'ru') {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadApartmentIndex(), _loadAptManifest()])
  const candidates = idx.filter(e => e.id !== exceptId && e.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadApartmentById(c.id)))
  const out: (ApartmentCardData & { id: string })[] = []
  for (const r of rows) {
    if (!r) continue
    const slug = firstString(r.data['SEO:Slug'])
    if (!slug) continue
    // tField returns EN if available (RU fallback after the i18n fix).
    const titleRaw = tField(r.data, 'SEO:Title', lang) ?? tField(r.data, 'ИИ Имя', lang) ?? slug
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    out.push({
      id: r.airtable_id,
      slug,
      title,
      priceUsd: numberOrNull(r.data['price_usd'] ?? r.data['Цена']),
      bedrooms: numberOrNull(r.data['Комнаты']),
      area: numberOrNull(r.data['Площадь']),
      floor: firstString(r.data['Этаж']),
      photos: manifest[r.airtable_id] ?? [],
    })
  }
  return out
}

export async function generateApartmentMetadata(slug: string, lang: Lang) {
  const a = await loadApartmentBySlug(slug)
  if (!a) return { robots: { index: false } }
  const d = a.data
  const c = COPY[lang]
  const titleRaw = tField(d, 'SEO:Title', lang) ?? tField(d, 'ИИ Имя', lang) ?? slug
  let title = cleanTitle(titleRaw) ?? slug
  if (isMalformedAptTitle(title)) {
    title = fallbackAptTitle(firstString(d['Location filter']), numberOrNull(d['Площадь']), numberOrNull(d['Комнаты']), lang)
  }
  const seoText = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  const districtRaw = firstString(d['Location filter'])
  // Cyrillic district on /ru, raw Latin on /en. Raw is preserved for
  // Schema.org address fields where Latin is canonical.
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  const price = fmtUsd(numberOrNull(d['price_usd'] ?? d['Цена']))
  const description = seoText
    ? seoText.slice(0, 160).trim() + (seoText.length > 160 ? '…' : '')
    : c.metaFallback(title, district, price)
  const ruPath = `/ru/apartamenty/o/${slug}`
  const enPath = `/en/apartments/o/${slug}`
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: `${title} | Balinsky`,
    description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: { title, description, type: 'website' as const, url: `${SITE_URL}${path}` },
  }
}

export async function ApartmentDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = COPY[lang]
  // Canonical-slug redirect: legacy GSC links carry dirty slugs
  // (cyrillic look-alikes, parens). Resolve resolves either form and
  // tells us the canonical; redirect 301 if the URL doesn't match.
  const resolved = await resolveApartment(slug)
  if (!resolved) notFound()
  if (resolved.canonicalSlug !== slug) {
    const path = lang === 'en'
      ? `/en/apartments/o/${resolved.canonicalSlug}`
      : `/ru/apartamenty/o/${resolved.canonicalSlug}`
    permanentRedirect(path)
  }
  const a = resolved.row

  const d = a.data
  const [manifest, devMap, complexes] = await Promise.all([
    _loadAptManifest(),
    _loadDevLookup(),
    _loadAllComplexes(),
  ])

  const titleRaw = tField(d, 'ИИ Имя', lang) ?? tField(d, 'SEO:Title', lang) ?? slug
  let title = cleanTitle(titleRaw) ?? slug
  const photos = (manifest[a.airtable_id] ?? []).slice(0, 12)
  const districtRaw = firstString(d['Location filter'])
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  if (isMalformedAptTitle(title)) {
    title = fallbackAptTitle(district, area, bedrooms, lang)
  }
  const floor = firstString(d['Этаж'])
  const priceNum = numberOrNull(d['price_usd'] ?? d['Цена'])
  const priceM2 = numberOrNull(d['Цена м²'])
  const priceUpdatedAt = firstString(d['Обновление цены']) ?? firstString(d['Последнее обновление']) ?? firstString(d['Обновлено'])
  const yearRaw = firstString(d['Year of completion'])
  const status = firstString(d['Статус'])
  const permit = firstString(d['Разрешение'])
  const lease = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const seoText = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  // Resale: drop the developer-manager CTA and route the visitor to
  // the owner's direct link stored in «Контакт продавца».
  const dealTypeRaw = (firstString(d['Тип сделки']) ?? '').toLowerCase()
  const isResale = /перепрод|resale|вторич|secondary/.test(dealTypeRaw)
  const sellerUrl = isResale ? firstString(d['Контакт продавца']) : null

  // Developer lookup via apartment-base devmap
  const devRefs = Array.isArray(d['Developer']) ? (d['Developer'] as unknown[]) : []
  const devName = devRefs
    .map(id => (typeof id === 'string' ? devMap[id] : null))
    .find(n => !!n) ?? null
  const devStats = await getDeveloperStats(devName)

  // Parent complex (best-effort by name match in title)
  const parentComplex = findParentComplex(title, complexes)
  const parentComplexName = parentComplex?.name ?? null

  const [otherApts, managers, activeReservation, landProfile, marketStats, developers] = await Promise.all([
    loadOtherApartmentsInDistrict(district, a.airtable_id, lang),
    loadManagersByDeveloperName(devName),
    findActiveReservation('apartment', a.airtable_id),
    loadLandProfile('apartment', a.airtable_id),
    loadMarketStats('apartment', a.airtable_id),
    _loadDevelopersIndex(),
  ])
  const developer = findDeveloperByName(devName, developers)
  const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  // Videos for parent complex (or empty), filtered by site language.
  const allVideos = (await loadAllVideos().catch(() => []))
    .filter(v => videoMatchesLang(v, lang))
  const aptVideos = parentComplex?.slug
    ? allVideos.filter(v => v.complexes.some(c => c.slug === parentComplex.slug)).slice(0, 6)
    : []

  const facts: { Icon: typeof BedDouble; label: string; value: ReactNode }[] = [
    bedrooms != null && { Icon: BedDouble, label: lang === 'en' ? 'Bedrooms' : 'Спальни', value: `${bedrooms} BR` },
    area != null && { Icon: Square, label: c.factArea, value: `${area} ${c.sqm}` },
    floor && { Icon: Layers, label: c.factFloor, value: floor === 'GROUND FLOOR' ? c.factGround : floor },
    yearRaw && { Icon: Calendar, label: c.factCompletion, value: status?.toLowerCase().includes('построен') ? c.completed : yearRaw },
    permit && permit.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: c.factPermits, value: permit },
    lease && { Icon: Lock, label: c.factLeasehold, value: c.factLeaseValue(lease) },
    district && { Icon: MapPin, label: c.factDistrict, value: district },
    fmtAirportDistance(lat, lng, lang) && { Icon: Plane, label: c.factAirport, value: fmtAirportDistance(lat, lng, lang)! },
    // Price/m² lives in the PriceCtaCard right under the hero, no need
    // to duplicate it here.
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: ReactNode }[]

  const faqItems = c.faq(title, district, fmtUsd(priceNum), lease)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    url: lang === 'en' ? `${SITE_URL}/en/apartments/o/${slug}` : `${SITE_URL}/ru/apartamenty/o/${slug}`,
    category: 'Apartment',
  }
  if (photos.length > 0) productJsonLd.image = photos.slice(0, 5)
  productJsonLd.description = seoText?.slice(0, 500)
    ?? (lang === 'en'
      ? `${bedrooms ? bedrooms + '-bedroom ' : ''}apartment${district ? ` in ${district}` : ''}, Bali, Indonesia`
      : `${bedrooms ? bedrooms + '-комнатные ' : ''}апартаменты${district ? ` в ${district}` : ''} на Бали, Индонезия`)
  productJsonLd.brand = { '@type': 'Brand', name: devName ?? 'Balinsky' }
  if (priceNum != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceNum),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: lang === 'en' ? `${SITE_URL}/en/apartments/o/${slug}` : `${SITE_URL}/ru/apartamenty/o/${slug}`,
      // Real-estate sales don't ship and don't return — explicit
      // declarations satisfy Google Merchant validator without faking
      // e-commerce semantics.
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'USD' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ID' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'ID',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
      },
    }
  }

  const placeJsonLd: Record<string, unknown> | null =
    lat != null && lng != null
      ? {
          '@context': 'https://schema.org',
          '@type': 'Apartment',
          name: title,
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'ID',
            addressRegion: 'Bali',
            addressLocality: districtRaw ?? 'Bali',
          },
          geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
          numberOfRooms: bedrooms ?? undefined,
          floorSize: area != null ? { '@type': 'QuantitativeValue', value: area, unitCode: 'MTK' } : undefined,
          // No offers on Apartment — Schema Validator warns "Offer
          // expected on Product / Service". Price lives on the separate
          // Product JSON-LD a bit below.
        }
      : null

  const home = lang === 'en' ? '/en' : '/ru'
  const apartmentsRoot = lang === 'en' ? '/en/apartments' : '/ru/apartamenty'
  const complexesRoot = lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'
  const villasRoot = lang === 'en' ? '/en/villas' : '/ru/villy'
  const developersRoot = lang === 'en' ? '/en/developers' : '/ru/zastrojshhiki'

  return (
    <>
      <Header active="apartamenty" />
      <PageViewTracker kind="apartment" slug={slug} title={title} airtableId={a.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.aptCrumb, href: apartmentsRoot },
          ...(district ? [{ label: district, href: `${apartmentsRoot}/${district.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: title },
        ]} />

        <section className="mb-6 mt-2">
          <PhotoGalleryHero
            photos={photos}
            alt={title}
            wishlistItem={{
              kind: 'apartment', slug, title,
              photo: photos[0] ?? null,
              priceUsd: priceNum ?? null,
              district: district ?? null,
              bedrooms: bedrooms ?? null,
              area: area ?? null,
              floor: floor ?? null,
              pricePerSqmUsd: priceM2 ?? null,
              pricePerSqmYearUsd: numberOrNull(d['Цена м² в год']),
              leaseYears: lease ? Number(lease) || null : null,
              permit: permit && permit.toLowerCase() !== 'нет' ? permit : null,
              status: status ?? null,
              claimedYieldPct: (() => {
                const y = numberOrNull(d['Заявленная доходность'])
                return y != null ? Math.round(y * 1000) / 10 : null
              })(),
              landUse: firstString(d['Назначение земли']) ?? null,
              developerName: devName,
              developerCompletedCount: devStats?.ready ?? null,
              developerInProgressCount: devStats?.inProgress ?? null,
              airtableId: a.airtable_id,
            }}
          />
        </section>

        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href={apartmentsRoot} className="hover:text-[var(--color-text)]">{c.aptCrumb}</Link>
            {district && <> · {district}</>}
          </div>
          <h1 className="text-[18px] sm:text-[24px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.25] md:leading-[1.1] mb-3 [word-break:break-word] [overflow-wrap:anywhere]">
            {title}
          </h1>
          <div className="text-[15px] text-[var(--color-text-muted)] leading-relaxed mb-4 flex items-center flex-wrap gap-x-5 gap-y-1">
            {bedrooms != null && <span>{bedrooms} BR</span>}
            {area != null && <span>{area} {c.sqm}</span>}
            {floor && <span>{c.floor}: {floor}</span>}
            {district && <span>{district}, {c.bali}</span>}
          </div>
          {priceNum != null && (
            <PriceCtaCard
              priceUsd={priceNum}
              pricePerSqmUsd={priceM2}
              updatedAt={priceUpdatedAt}
              managerId={managers[0]?.id ?? null}
              sellerUrl={sellerUrl}
              listingKind="apartment"
              listingId={a.airtable_id}
              listingSlug={slug}
              listingTitle={title}
              reservedUntil={activeReservation?.expires_at ?? null}
              presentationButton={
                <VillaPresentationButton
                  variant="outline"
                  villaId={a.airtable_id}
                  slug={slug}
                  kind="apartment"
                  title={title}
                  district={district}
                  photos={photos}
                  priceUsd={priceNum}
                  pricePerM2={priceM2}
                  bedrooms={bedrooms}
                  area={area}
                  land={null}
                  yearLabel={yearRaw && status?.toLowerCase().includes('построен') ? c.completed : (yearRaw ?? null)}
                  lease={lease}
                  permit={permit}
                  lat={lat}
                  lng={lng}
                  seoText={seoText}
                />
              }
            />
          )}
        </section>

        {facts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {c.factsHeading}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {facts.map(({ Icon, label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                  <div className="flex items-center gap-2 mb-2 text-[var(--color-text-muted)]">
                    <Icon size={16} />
                    <span className="text-[12px] uppercase tracking-wide">{label}</span>
                  </div>
                  <div className="text-[16px] font-semibold text-[#111827]">{value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {seoText && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              {c.descHeading}
            </h2>
            <div className="prose-balinsky max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
              {seoText}
            </div>
          </section>
        )}

        {/* LandProfile + MarketStats — sits right under the description
            on villa pages too, so the buyer sees the zoning + neighbour
            rental data before getting to the developer / manager. */}
        {(
          landAllowsBuilding(landProfile, 'apartment')
          || (marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0))
        ) && (
          <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {landAllowsBuilding(landProfile, 'apartment') && (
              <LazyMount fallback={<div className="min-h-[480px] rounded-2xl bg-[var(--color-search-bg)]" />}>
                <LandProfileBlock data={landProfile!} lang={lang} />
              </LazyMount>
            )}
            {marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0) && (
              <MarketStatsBlock data={marketStats} lang={lang} />
            )}
          </section>
        )}

        {(parentComplex || developer || devName) && (
          <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COMPLEX (left) */}
            {parentComplex ? (
              <Link
                href={`${complexesRoot}/o/${parentComplex.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
              >
                {parentComplex.cover_url && (
                  <div className="relative h-[160px] bg-[var(--color-search-bg)]">
                    <Image src={parentComplex.cover_url} alt={parentComplexName ?? ''} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                    <Building2 size={14} /> {c.complexLabel}
                  </div>
                  <div className="text-[19px] font-semibold text-[#111827] mb-2">{parentComplexName}</div>
                  {(() => {
                    const pcDistrict = parentComplex.district ?? parentComplex.district_alt
                    const pcTypesRaw = Array.isArray(parentComplex.types) ? (parentComplex.types as unknown[]).map(String) : []
                    const pcYearRaw = parentComplex.year_trail ?? parentComplex.year
                    const pcStatus = parentComplex.status
                    const pcUnits = parentComplex.units
                    const hasMeta = pcDistrict || pcTypesRaw.length || pcYearRaw || pcUnits != null
                    return hasMeta ? (
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--color-text-muted)] mb-4">
                        {pcDistrict && <span>{pcDistrict}</span>}
                        {pcTypesRaw.length > 0 && <span>{pcTypesRaw.join(', ')}</span>}
                        {pcYearRaw && (
                          <span>{pcStatus?.toLowerCase().includes('построен') ? c.completedShort : c.completion(pcYearRaw)}</span>
                        )}
                        {pcUnits != null && <span>{c.units(pcUnits)}</span>}
                      </div>
                    ) : null
                  })()}
                  <div className="text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    {c.openComplex} <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 opacity-60">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <Building2 size={14} /> {c.complexLabel}
                </div>
                <div className="text-[15px] text-[var(--color-text-muted)]">{c.sellingSeparately}</div>
              </div>
            )}

            {/* DEVELOPER (right) */}
            {developer ? (
              <Link
                href={`${developersRoot}/${developer.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-2">
                    {developer.logoUrl ? (
                      <Image src={developer.logoUrl} alt={developer.name} width={56} height={56} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <HardHat size={28} className="text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                      <HardHat size={14} /> {c.developerLabel}
                    </div>
                    <div className="text-[19px] font-semibold text-[#111827] truncate">{developer.name}</div>
                  </div>
                </div>
                {developer.highlights.length > 0 && (
                  <div className="px-5 pb-2">
                    <ul className="space-y-1.5 text-[13px] text-[var(--color-text)]">
                      {developer.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Star size={12} className="mt-1 shrink-0 text-[var(--color-primary)]" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="px-5 pb-5 pt-2 text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {c.openDeveloper} <ChevronRight size={14} />
                </div>
              </Link>
            ) : devName ? (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <HardHat size={14} /> {c.developerLabel}
                </div>
                <div className="text-[19px] font-semibold text-[#111827]">{devName}</div>
              </div>
            ) : null}
          </section>
        )}

        {managers.length > 0 && <ManagerCard managers={managers} developerName={devName} />}

        <div className="mt-8">
          <ContactBlock lang={lang} listing={{ kind: 'apartment', slug, title }} />
        </div>

        {/* InvestmentWidget carries the interactive Google map + the
            three rental-yield scenarios (bad / normal / good) + Booking
            comparables grid + nearby places block. Same component
            villas use; the static iframe map that used to live above
            was just a worse duplicate. */}
        {lat != null && lng != null && (
          <LazyMount fallback={<div className="mt-12 mb-10 min-h-[600px]" />}>
            <InvestmentWidget villaId={a.airtable_id} apiKey={GMAPS_KEY} kind="apartment" lang={lang} />
          </LazyMount>
        )}

        <RentalCompareSection
          district={district}
          bedrooms={bedrooms}
          villaPriceUsd={priceNum}
          lang={lang}
        />

        {aptVideos.length > 0 && (
          <VideoGrid videos={aptVideos} title={parentComplexName ? (lang === 'en' ? `Videos: ${parentComplexName}` : `Видео: ${parentComplexName}`) : (lang === 'en' ? 'Videos' : 'Видео')} />
        )}

        {otherApts.length > 0 && district && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {lang === 'en' ? `Other apartments in ${district}` : `Другие апартаменты в районе ${district}`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherApts.map(o => <ApartmentCard key={o.id} a={o} lang={lang} />)}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">{c.relatedHeading}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: apartmentsRoot, label: c.related.allApartments },
              { href: complexesRoot, label: c.related.complexes },
              { href: villasRoot, label: c.related.villas },
              { href: developersRoot, label: c.related.developers },
              ...(district ? [
                { href: `${apartmentsRoot}/${district.toLowerCase().replace(/\s+/g, '-')}`, label: c.related.apartmentsIn(district) },
              ] : []),
              ...(bedrooms ? [
                { href: `${apartmentsRoot}/${bedrooms}-spaln${bedrooms === 1 ? 'ya' : 'i'}`, label: lang === 'en' ? `${bedrooms}-bedroom apartments` : `${bedrooms}-комнатные апартаменты` },
              ] : []),
            ].map(l => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="inline-flex items-center gap-1 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)]">
                  <ChevronRight size={14} className="text-[var(--color-primary)]" /> {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            {c.faqHeading}
          </h2>
          <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
            {faqItems.map((it, i) => (
              <details key={i} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[#111827]">
                  {it.q}
                  <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{it.a}</p>
              </details>
            ))}
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        {placeJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
