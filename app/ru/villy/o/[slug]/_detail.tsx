// Shared villa-detail renderer for both /ru/villy/o/[slug] and
// /en/villas/o/[slug]. Layout, data fetching and section order live
// here; locale-specific copy is in the COPY table below.

import type { ReactNode } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  BedDouble, Square, Trees, Calendar, FileCheck2, Lock, MapPin, Plane,
  ChevronRight, Building2, HardHat, Star, Palette,
} from 'lucide-react'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null, lang: 'ru' | 'en'): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  if (lang === 'en') return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`
}
import { Header } from '@/components/Header'
import { ExpandableText } from '@/components/ExpandableText'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { loadVillaLandProfile, landAllowsBuilding } from '@/lib/land-profile'
import { loadMarketStats } from '@/lib/complex-market-stats'
import { MarketStatsBlock } from '@/components/MarketStatsBlock'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import dynamic from 'next/dynamic'
// Heavy client widgets — pulled off the initial JS bundle. Both
// render below the fold on detail pages, so late hydration is invisible.
// LandProfileBlock — 474 LOC of charts/sliders; InvestmentWidget — 626 +
// Google Maps loader. Together ~30 KB gzipped that no longer ships in
// the initial chunk.
const InvestmentWidget = dynamic(
  () => import('@/components/InvestmentWidget').then(m => ({ default: m.InvestmentWidget })),
)
const LandProfileBlock = dynamic(
  () => import('@/components/LandProfileBlock').then(m => ({ default: m.LandProfileBlock })),
)
import { RentalCompareSection } from '@/components/RentalCompareSection'
import { LazyMount } from '@/components/LazyMount'
import { ManagerCard } from '@/components/ManagerCard'
import { loadNearbyPlaces } from '@/lib/nearby-places'
import { NearbyPlaces } from '@/components/NearbyPlaces'
import { loadManagersByDeveloperName, loadManagersByDeveloperSlug } from '@/lib/managers'
import { getDeveloperStats } from '@/lib/developer-stats'
import { PriceCtaCard } from '@/components/PriceCtaCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllVideos, matchesLang as videoMatchesLang } from '@/lib/videos'
import { loadVillaStyles } from '@/lib/villa-styles'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { findActiveReservation } from '@/lib/reservations'
import { VideoGrid } from '@/components/VideoGrid'
import { PageViewTracker } from '@/components/PageViewTracker'
import { VillaPresentationButton } from '@/components/VillaPresentation'
import { tField, type Lang } from '@/lib/i18n'
import { normalizeSlug } from '@/lib/slug-normalize'
import { loadEnTranslations, mergeEnTranslations } from '@/lib/en-translations'
import { pluralRu } from '@/lib/plural-ru'
import { districtRu } from '@/lib/district-ru'
import { geoChainString } from '@/lib/regency'
import { loadKbPageContent } from '@/lib/kb-page-content'
import { loadListingVision, altFor } from '@/lib/listing-features'
import { DistrictAboutCard } from '@/components/DistrictAboutCard'
import { getDistrictCopy } from '@/lib/districts'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { enLabel } from '@/lib/filter-i18n'

const COPY = {
  ru: {
    home: 'Главная', villasCrumb: 'Виллы и дома',
    sqm: 'м²', house: 'дом', land: 'земля', bali: 'Бали',
    completed: 'Сдан',
    factsHeading: 'Характеристики',
    factBedrooms: 'Спальни', factHouse: 'Дом', factLand: 'Земля', factCompletion: 'Сдача',
    factPermits: 'Разрешения', factLeasehold: 'Лизхолд', factDistrict: 'Район',
    factAirport: 'До аэропорта', factStyle: 'Стиль интерьера', factPriceM2: 'Цена за м²',
    factLeaseValue: (l: string) => `${l} лет`,
    descHeading: 'Описание',
    complexLabel: 'Жилой комплекс',
    completedShort: 'Сдан',
    completion: (y: string) => `Сдача ${y}`,
    units: (n: number) => `${n} ${pluralRu(n, ['юнит', 'юнита', 'юнитов'])}`,
    openComplex: 'Открыть страницу комплекса',
    sellingSeparately: 'Объект продаётся отдельно (не в составе комплекса)',
    developerLabel: 'Застройщик',
    openDeveloper: 'Открыть страницу застройщика',
    videosTitleComplex: (n: string) => `Видео: ${n}`,
    videosTitleDev: (n: string) => `Видео: ${n}`,
    videosTitleDefault: 'Видео',
    otherVillas: (d: string) => `Другие виллы в районе ${d}`,
    relatedHeading: 'По теме',
    related: {
      allVillas: 'Все виллы и дома Бали',
      apartments: 'Апартаменты на Бали',
      complexes: 'Жилые комплексы',
      developers: 'Застройщики Бали',
      villasIn: (d: string) => `Виллы в ${d}`,
    },
    faqHeading: 'Часто задаваемые вопросы',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `Сколько стоит ${title}?`,
        a: price ? `Текущая цена объекта — ${price}. Актуальный прайс всегда указан в карточке выше.` : 'Цена уточняется. Свяжитесь для актуального прайса.' },
      { q: `Где находится ${title}?`,
        a: district ? `Объект расположен в районе ${district} на Бали. Точные координаты — на карте выше.` : 'Точное расположение и координаты — на карте выше.' },
      { q: 'Можно ли иностранцу купить виллу на Бали?',
        a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды земли) у нотариуса PPAT, либо через индонезийское юр. лицо PT PMA.' },
      { q: 'Какой срок лизхолда?',
        a: lease ? `Базовый срок — ${lease} лет. Условия продления уточняйте у застройщика.` : 'Срок лизхолда уточняйте у застройщика. Стандартно 25–80 лет с возможностью продления.' },
      { q: 'Какая земля прилагается к вилле?',
        a: land != null ? `${land} м² собственного участка с виллой.` : 'Площадь участка уточняйте — указывается в карточке выше.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` в ${district}` : ''} на Бали${price ? `. Цена ${price}.` : '.'} Фото, площадь, земля, документы.`,
  },
  en: {
    home: 'Home', villasCrumb: 'Villas',
    sqm: 'm²', house: 'house', land: 'land', bali: 'Bali',
    completed: 'Completed',
    factsHeading: 'Specs',
    factBedrooms: 'Bedrooms', factHouse: 'House', factLand: 'Land', factCompletion: 'Completion',
    factPermits: 'Permits', factLeasehold: 'Leasehold', factDistrict: 'District',
    factAirport: 'To airport', factStyle: 'Interior style', factPriceM2: 'Price per m²',
    factLeaseValue: (l: string) => `${l} years`,
    descHeading: 'Description',
    complexLabel: 'Residential complex',
    completedShort: 'Completed',
    completion: (y: string) => `Completion ${y}`,
    units: (n: number) => `${n} units`,
    openComplex: 'Open complex page',
    sellingSeparately: 'Sold separately (not part of a complex)',
    developerLabel: 'Developer',
    openDeveloper: 'Open developer page',
    videosTitleComplex: (n: string) => `Videos: ${n}`,
    videosTitleDev: (n: string) => `Videos: ${n}`,
    videosTitleDefault: 'Videos',
    otherVillas: (d: string) => `Other villas in ${d}`,
    relatedHeading: 'Related',
    related: {
      allVillas: 'All Bali villas and houses',
      apartments: 'Apartments in Bali',
      complexes: 'Residential complexes',
      developers: 'Bali developers',
      villasIn: (d: string) => `Villas in ${d}`,
    },
    faqHeading: 'Frequently asked questions',
    faq: (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
      { q: `How much does ${title} cost?`,
        a: price ? `Current asking price is ${price}. Live price is always shown in the card above.` : 'Price on request. Contact us for current pricing.' },
      { q: `Where is ${title} located?`,
        a: district ? `The property is in ${district}, Bali. Exact coordinates on the map above.` : 'Exact location and coordinates on the map above.' },
      { q: 'Can a foreigner buy a Bali villa?',
        a: 'Yes. The deal is closed via leasehold (long-term land lease) at a PPAT notary, or through a PT PMA company.' },
      { q: 'What is the leasehold term?',
        a: lease ? `Base term is ${lease} years. Check extension conditions with the developer.` : 'Check the leasehold term with the developer — typically 25–80 years with extension options.' },
      { q: 'What land comes with the villa?',
        a: land != null ? `${land} m² private plot with the villa.` : 'Plot size on request — shown in the card above when available.' },
    ],
    metaFallback: (title: string, district: string | null, price: string | null) =>
      `${title}${district ? ` in ${district}` : ''} in Bali${price ? `. Price ${price}.` : '.'} Photos, layout, land, documents.`,
  },
} as const

export const revalidate = 3600
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Row = { airtable_id: string; data: Record<string, unknown> }

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
  if (Array.isArray(v) && v.length > 0) return numberOrNull(v[0])
  if (v && typeof v === 'object' && 'value' in v) return numberOrNull((v as { value: unknown }).value)
  return null
}
function parseGeo(v: unknown): number | null {
  return numberOrNull(v)
}
function fmtUsd(n: number | null): string | null {
  if (n == null) return null
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}
function cleanTitle(s: string | null): string | null {
  if (!s) return null
  return s.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() || null
}

// Slug index loaded from Storage manifest (built by scripts/sync-detail-indexes.mjs).
// Avoids the 21MB raw_villas query that hits Postgres statement timeout.
type IndexEntry = { id: string; slug: string; district: string | null; aliases?: string[] }
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_villas-index.json`
const INDEX_TTL_MS = 30 * 60 * 1000
let _indexCache: { ts: number; data: IndexEntry[] } | null = null
let _indexInflight: Promise<IndexEntry[]> | null = null

async function _loadVillaIndex(): Promise<IndexEntry[]> {
  if (_indexCache && Date.now() - _indexCache.ts < INDEX_TTL_MS) return _indexCache.data
  if (_indexInflight) return _indexInflight
  _indexInflight = (async () => {
    try {
      // no-store + 30-min in-memory cache: bypass Next data cache so a
      // freshly-uploaded _villas-index.json is picked up on the next
      // Lambda cold start instead of waiting for the ISR window to expire.
      const r = await fetch(INDEX_URL, { next: { revalidate: 10 } })
      if (!r.ok) return _indexCache?.data ?? []
      const j = await r.json() as { items: IndexEntry[] }
      const items = j.items ?? []
      _indexCache = { ts: Date.now(), data: items }
      return items
    } catch {
      return _indexCache?.data ?? []
    }
  })().finally(() => { _indexInflight = null })
  return _indexInflight
}

const _byIdCache = new Map<string, { ts: number; row: Row | null }>()
const BY_ID_TTL_MS = 5 * 60 * 1000
async function _loadVillaById(id: string): Promise<Row | null> {
  const cached = _byIdCache.get(id)
  if (cached && Date.now() - cached.ts < BY_ID_TTL_MS) return cached.row
  const [{ data }, enCache] = await Promise.all([
    sb.from('raw_villas').select('airtable_id, data').eq('airtable_id', id).maybeSingle(),
    loadEnTranslations('villas'),
  ])
  const raw = (data as Row | null) ?? null
  // Merge cached EN translations into the row's data so tField('SEO Text', 'en')
  // sees the translated value instead of the Airtable AI-error placeholder.
  // The detail page never hits loadAllVillas — its own _loadVillaById is the
  // only Supabase read path, so the merge has to happen here too.
  const row: Row | null = raw
    ? { ...raw, data: mergeEnTranslations(raw.data, raw.airtable_id, enCache) }
    : null
  _byIdCache.set(id, { ts: Date.now(), row })
  return row
}

let _manifestCache: { ts: number; data: Record<string, string[]> } | null = null
async function _loadManifest(): Promise<Record<string, string[]>> {
  if (_manifestCache && Date.now() - _manifestCache.ts < 30 * 60 * 1000) return _manifestCache.data
  try {
    const r = await fetch(cdnManifestUrl(PHOTO_MANIFEST_URL, 600), { next: { revalidate: 600 } })
    const j = r.ok ? await r.json() : {}
    _manifestCache = { ts: Date.now(), data: j }
    return j
  } catch { return _manifestCache?.data ?? {} }
}

async function resolveVilla(urlSlug: string): Promise<{ row: Row; canonicalSlug: string } | null> {
  const idx = await _loadVillaIndex()
  let entry = idx.find(e => e.slug === urlSlug)
  if (!entry) {
    const normalised = normalizeSlug(urlSlug)
    entry = idx.find(e => e.slug === normalised) || idx.find(e => e.aliases?.includes(urlSlug))
  }
  if (!entry) return null
  const row = await _loadVillaById(entry.id)
  if (!row) return null
  return { row, canonicalSlug: entry.slug }
}

async function loadVillaBySlug(slug: string): Promise<Row | null> {
  const r = await resolveVilla(slug)
  return r?.row ?? null
}

// === Parent complex + developer lookups ===

type ComplexLite = {
  id: string
  slug: string
  name: string
  district: string | null
  types: string[]
  year: string | null
  units: number | null
  status: string | null
  coverUrl: string | null
}

// Defensive: throw on PG error or empty result so the cache slot
// never gets poisoned with [] for the next hour. Bumped key v2 to
// drop the existing slot at deploy.
// JSON-projection: вместо `data` целиком (~75кб/строка) тянем только
// нужные поля (~250б/строка → -99% egress). Поля с пробелами и
// кириллицей оборачиваем в "..." — PostgREST это понимает.
type ComplexSlimRow = {
  airtable_id: string
  slug: string | null
  cover_url: string | null
  name: string | null
  district_alt: string | null
  district: string | null
  types: unknown
  year: string | null
  year_trail: string | null
  units: number | null
  status: string | null
}
const _loadComplexesIndex = unstable_cache(
  async (): Promise<ComplexLite[]> => {
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
    `).limit(500)
    if (error) throw new Error(`raw_complexes: ${error.message}`)
    const rows = (data ?? []) as ComplexSlimRow[]
    if (rows.length === 0) throw new Error('raw_complexes returned 0 rows — refusing to cache empty')
    // raw_complexes.cover_url указывает на мёртвый путь complex-covers/* (404).
    // Берём первое фото из синк-манифеста complex-photos (как ComplexCard),
    // cover_url оставляем fallback'ом.
    let complexPhotos: Record<string, string[]> = {}
    try {
      const r = await fetch(cdnManifestUrl(COMPLEX_PHOTO_MANIFEST_URL, 600), { next: { revalidate: 600 } })
      if (r.ok) complexPhotos = await r.json()
    } catch { /* fallback to cover_url below */ }
    const out: ComplexLite[] = []
    for (const c of rows) {
      if (!c.name || !c.slug) continue
      const types = Array.isArray(c.types) ? (c.types as unknown[]).map(x => String(x)) : []
      out.push({
        id: c.airtable_id,
        slug: c.slug,
        name: c.name,
        district: c.district ?? c.district_alt,
        types,
        year: c.year_trail ?? c.year,
        units: c.units,
        status: c.status,
        coverUrl: complexPhotos[c.airtable_id]?.[0] ?? c.cover_url,
      })
    }
    return out
  },
  ['villy-complex-index-v4'],
  { revalidate: 600 },
)

function findParentComplex(villaTitle: string, complexes: ComplexLite[]): ComplexLite | null {
  const lower = villaTitle.toLowerCase()
  let best: { c: ComplexLite; len: number } | null = null
  for (const c of complexes) {
    const n = c.name.toLowerCase()
    if (n.length < 4) continue
    if (lower.includes(n)) {
      if (!best || n.length > best.len) best = { c, len: n.length }
    }
  }
  return best?.c ?? null
}

type DeveloperLite = {
  slug: string
  name: string
  logoUrl: string | null
  highlights: string[]
}

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
  ['villy-developers-index-v3'],
  { revalidate: 600 },
)

function findDeveloperByName(targetName: string | null, list: DeveloperLite[]): DeveloperLite | null {
  if (!targetName) return null
  const t = targetName.toLowerCase().trim()
  // exact match first, then includes
  return list.find(d => d.name.toLowerCase() === t)
    ?? list.find(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()))
    ?? null
}

async function loadOtherVillasInDistrict(district: string | null, exceptId: string, lang: Lang = 'ru') {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadVillaIndex(), _loadManifest()])
  const candidates = idx.filter(e => e.id !== exceptId && e.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadVillaById(c.id)))
  const out: (VillaCardData & { id: string })[] = []
  for (const r of rows) {
    if (!r) continue
    const slug = firstString(r.data['SEO:Slug'])
    if (!slug) continue
    // tField returns EN if available (or RU fallback after the i18n.ts fix).
    // Without this the EN villa detail page was rendering Russian card
    // titles in the "Other villas in <district>" rail.
    const titleRaw = tField(r.data, 'SEO:Title', lang) ?? tField(r.data, 'ИИ Имя', lang) ?? slug
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    out.push({
      id: r.airtable_id,
      slug,
      title,
      priceUsd: numberOrNull(r.data['price'] ?? r.data['Цена']),
      bedrooms: numberOrNull(r.data['Комнаты']),
      area: numberOrNull(r.data['Площадь']),
      land: numberOrNull(r.data['Земля']),
      district: firstString(r.data['Location 2']) ?? firstString(r.data['Location']),
      status: firstString(r.data['Статус']),
      photos: manifest[r.airtable_id] ?? [],
    })
  }
  return out
}

export async function generateVillaMetadata(slug: string, lang: Lang) {
  const v = await loadVillaBySlug(slug)
  if (!v) return { robots: { index: false } }
  const d = v.data
  const c = COPY[lang]
  const titleRaw = tField(d, 'SEO:Title', lang) ?? tField(d, 'ИИ Имя', lang) ?? slug
  const title = cleanTitle(titleRaw) ?? slug
  const seoText = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  const districtRaw = firstString(d['Location 2']) ?? firstString(d['Location'])
  // Display surface for RU uses the Cyrillic district form to match
  // the AI-generated H1 / SEO text. Raw Latin name is still used for
  // canonical-path matching and Schema.org address fields.
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  const price = fmtUsd(numberOrNull(d['price'] ?? d['Цена']))
  const description = seoText
    ? seoText.slice(0, 160).trim() + (seoText.length > 160 ? '…' : '')
    : c.metaFallback(title, district, price)
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  // Compose the meta title from the AI title + a few facts. The AI
  // title often already mentions the district, bedrooms or area —
  // appending them blindly produces dupes like "… в Nyanyi · Nyanyi"
  // and pushes the string past Google's ~60-char cutoff. Drop any
  // part that already appears (case-insensitive) in the title.
  const titleLower = title.toLowerCase()
  const titleParts = [title]
  if (district && !titleLower.includes(district.toLowerCase())) titleParts.push(district)
  if (bedrooms != null && !titleLower.includes(`${bedrooms} br`) && !titleLower.includes(`${bedrooms} спальн`)) titleParts.push(`${bedrooms} BR`)
  if (area != null && !titleLower.includes(`${area} ${c.sqm}`) && !titleLower.includes(`${area}m²`)) titleParts.push(`${area} ${c.sqm}`)
  if (price && !titleLower.includes(price.toLowerCase())) titleParts.push(price)
  const seoTitle = `${titleParts.slice(0, 4).join(' · ')} | Balinsky`
  const ruPath = `/ru/villy/o/${slug}`
  const enPath = `/en/villas/o/${slug}`
  const path = lang === 'en' ? enPath : ruPath
  const inText = lang === 'en' ? 'in' : 'в'
  const dashPrice = price ? ` — ${price}` : ''
  // Same dedup as titleParts above — the AI base title usually already
  // contains the district, so only append it when it's genuinely missing
  // (otherwise we get "… в Bukit … в Bukit").
  const fallbackDistrict = district && !titleLower.includes(district.toLowerCase()) ? ` ${inText} ${district}` : ''
  return {
    title: seoTitle.length > 70 ? `${title}${fallbackDistrict}${dashPrice} | Balinsky` : seoTitle,
    description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: { title, description, type: 'website' as const, url: `${SITE_URL}${path}` },
  }
}

export async function VillaDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = COPY[lang]
  // Canonical-slug redirect: legacy GSC links carry dirty slugs
  // (cyrillic look-alikes, parens). resolveVilla finds either form
  // and tells us the canonical; we 301 if URL doesn't match.
  const resolved = await resolveVilla(slug)
  if (!resolved) notFound()
  if (resolved.canonicalSlug !== slug) {
    const path = lang === 'en'
      ? `/en/villas/o/${resolved.canonicalSlug}`
      : `/ru/villy/o/${resolved.canonicalSlug}`
    permanentRedirect(path)
  }
  const v = resolved.row

  const d = v.data
  const manifest = await _loadManifest()

  const titleRaw = tField(d, 'ИИ Имя', lang) ?? tField(d, 'SEO:Title', lang) ?? slug
  const title = cleanTitle(titleRaw) ?? slug
  const photos = (manifest[v.airtable_id] ?? []).slice(0, 12)
  const districtRaw = firstString(d['Location 2']) ?? firstString(d['Location'])
  // Show Cyrillic district on /ru, raw Latin on /en. Raw form is
  // kept around for the JSON-LD address + canonical-path matching.
  const district = lang === 'ru' ? districtRu(districtRaw) : districtRaw
  // District orientation card: only when the listing's district maps to a
  // real hub slug (DISTRICT_TO_SLUG) AND we have editorial copy for it.
  const districtSlug = districtRaw ? DISTRICT_TO_SLUG[districtRaw] ?? null : null
  const districtCopy = districtSlug ? getDistrictCopy(districtSlug, lang) : null
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  const land = numberOrNull(d['Земля'])
  const priceNum = numberOrNull(d['price'] ?? d['Цена'])
  const priceM2 = numberOrNull(d['Цена м²'])
  const priceUpdatedAt = firstString(d['Обновление цены']) ?? firstString(d['Последнее обновление']) ?? firstString(d['Обновлено'])
  const yearRaw = firstString(d['Year of completion'])
  const status = firstString(d['Статус'])
  const permit = firstString(d['Разрешение'])
  const lease = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const seoText = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  // Unique, AI-generated on-page write-up + FAQ (assistant_kb). Falls back to
  // the Airtable SEO Text / templated FAQ when not generated yet.
  const kb = await loadKbPageContent('villa', v.airtable_id, lang)
  const pageBody = kb?.body ?? seoText
  // Per-photo vision alt text (image SEO/accessibility).
  const vision = await loadListingVision('villa', v.airtable_id)
  const photoAlts = photos.map((_, i) => altFor(vision, i, lang, title))
  const developerName = firstString(d['Developer1']) ?? firstString(d['Developer'])
  const devStats = await getDeveloperStats(developerName)
  // Resale / secondary listings carry a direct seller URL — bypass the
  // developer's manager for those.
  const dealTypeRaw = (firstString(d['Тип сделки']) ?? '').toLowerCase()
  const isResale = /перепрод|resale|вторич|secondary/.test(dealTypeRaw)
  const sellerUrl = isResale ? firstString(d['Контакт продавца']) : null

  const [otherVillas, complexes, developers, stylesMap, scoresMap, activeReservation, landProfile, marketStats, nearby] = await Promise.all([
    loadOtherVillasInDistrict(district, v.airtable_id, lang),
    _loadComplexesIndex(),
    _loadDevelopersIndex(),
    loadVillaStyles(),
    loadAllVillaScores(),
    findActiveReservation('villa', v.airtable_id),
    loadVillaLandProfile(v.airtable_id),
    loadMarketStats('villa', v.airtable_id),
    loadNearbyPlaces(v.airtable_id).catch(() => null),
  ])
  const interiorStyle = stylesMap[v.airtable_id]?.style ?? null
  const villaScore = scoresMap.get(v.airtable_id) ?? null
  const bestCapRate = villaScore?.goodCapRate ?? null
  const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  const parentComplex = findParentComplex(title, complexes)
  const developer = findDeveloperByName(developerName, developers)
  const managers = developer?.slug
    ? await loadManagersByDeveloperSlug(developer.slug)
    : await loadManagersByDeveloperName(developerName)

  // Videos: prefer videos for parent complex, else for developer.
  // Filter by site language so an EN visitor doesn't see RU-only
  // videos (and vice versa); un-tagged videos pass through.
  const allVideos = (await loadAllVideos().catch(() => []))
    .filter(v => videoMatchesLang(v, lang))
  const videos = (() => {
    if (parentComplex?.slug) {
      const byComplex = allVideos.filter(v => v.complexes.some(c => c.slug === parentComplex.slug)).slice(0, 6)
      if (byComplex.length > 0) return byComplex
    }
    if (developer?.slug) {
      return allVideos.filter(v => v.developers.some(d => d.slug === developer.slug)).slice(0, 6)
    }
    return []
  })()

  const facts: { Icon: typeof BedDouble; label: string; value: ReactNode }[] = [
    bedrooms != null && { Icon: BedDouble, label: c.factBedrooms, value: `${bedrooms} BR` },
    area != null && { Icon: Square, label: c.factHouse, value: `${area} ${c.sqm}` },
    land != null && { Icon: Trees, label: c.factLand, value: `${land} ${c.sqm}` },
    yearRaw && { Icon: Calendar, label: c.factCompletion, value: status?.toLowerCase().includes('построен') ? c.completed : yearRaw },
    permit && permit.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: c.factPermits, value: permit },
    lease && { Icon: Lock, label: c.factLeasehold, value: c.factLeaseValue(lease) },
    district && { Icon: MapPin, label: c.factDistrict, value: district },
    fmtAirportDistance(lat, lng, lang) && { Icon: Plane, label: c.factAirport, value: fmtAirportDistance(lat, lng, lang)! },
    interiorStyle && { Icon: Palette, label: c.factStyle, value: lang === 'en' ? enLabel('style', interiorStyle) : interiorStyle },
    // Price/m² lives in the PriceCtaCard right under the hero, no need
    // to duplicate it here.
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: ReactNode }[]

  const faqItems = (kb?.faq && kb.faq.length) ? kb.faq : c.faq(title, district, fmtUsd(priceNum), lease, land)
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
    url: lang === 'en' ? `${SITE_URL}/en/villas/o/${slug}` : `${SITE_URL}/ru/villy/o/${slug}`,
    category: 'Villa',
  }
  if (photos.length > 0) productJsonLd.image = photos.slice(0, 5)
  // Google's Product validator flags missing description; fall back to
  // a generated "<bedrooms>-BR villa in <district>, Bali" line so the
  // field is never empty.
  productJsonLd.description = seoText?.slice(0, 500)
    ?? (lang === 'en'
      ? `${bedrooms ? bedrooms + '-bedroom ' : ''}villa${district ? ` in ${district}` : ''}, Bali, Indonesia`
      : `${bedrooms ? bedrooms + '-комнатная ' : ''}вилла${district ? ` в ${district}` : ''} на Бали, Индонезия`)
  // Brand → developer name when known, otherwise generic "Balinsky"
  // so the GTIN/brand validator stops flagging this row.
  productJsonLd.brand = { '@type': 'Brand', name: developerName ?? 'Balinsky' }
  if (priceNum != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceNum),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: lang === 'en' ? `${SITE_URL}/en/villas/o/${slug}` : `${SITE_URL}/ru/villy/o/${slug}`,
      // Real-estate sales don't ship and don't return — explicit
      // declarations that say so satisfy Google Merchant validator
      // without faking e-commerce semantics.
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'USD' },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'ID',
        },
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
          '@type': 'SingleFamilyResidence',
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
          // lotSize isn't part of schema.org SingleFamilyResidence — the
          // Schema Validator flags it as unknown. Surface land area via
          // additionalProperty/PropertyValue, which is the canonical
          // open-ended extension point.
          ...(land != null
            ? {
                additionalProperty: [{
                  '@type': 'PropertyValue',
                  name: lang === 'en' ? 'Land area' : 'Площадь участка',
                  value: land,
                  unitCode: 'MTK',
                }],
              }
            : {}),
          // No offers here — price lives on the separate Product node a
          // bit further down. Validator warns about Offer on
          // SingleFamilyResidence ("expected on Product / Service"), so
          // we don't duplicate it.
        }
      : null

  const home = lang === 'en' ? '/en' : '/ru'
  const villasRoot = lang === 'en' ? '/en/villas' : '/ru/villy'
  const apartmentsRoot = lang === 'en' ? '/en/apartments' : '/ru/apartamenty'
  const complexesRoot = lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'
  const developersRoot = lang === 'en' ? '/en/developers' : '/ru/zastrojshhiki'

  return (
    <>
      <Header active="villy" />
      <PageViewTracker kind="villa" slug={slug} title={title} airtableId={v.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs currentUrl={`${villasRoot}/o/${slug}`} items={[
          { label: c.home, href: home },
          { label: c.villasCrumb, href: villasRoot },
          // Regency level dropped: it has no page, so its crumb had no `item`
          // and GSC flagged the whole BreadcrumbList. Chain goes straight to
          // the district (which does have a page).
          ...(district ? [{ label: district, href: `${villasRoot}/${districtRaw!.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: title },
        ]} />

        <section className="mb-6 mt-2">
          <PhotoGalleryHero
            photos={photos}
            alt={title}
            alts={photoAlts}
            wishlistItem={{
              kind: 'villa', slug, title,
              photo: photos[0] ?? null,
              priceUsd: priceNum ?? null,
              district: district ?? null,
              bedrooms: bedrooms ?? null,
              area: area ?? null,
              land: land ?? null,
              dealType: isResale ? 'resale' : 'primary',
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
              developerName: developerName ?? null,
              developerCompletedCount: devStats?.ready ?? null,
              developerInProgressCount: devStats?.inProgress ?? null,
              bestCapRate,
              interiorStyle,
              airtableId: v.airtable_id,
            }}
          />
        </section>

        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href={villasRoot} className="hover:text-[var(--color-text)]">{c.villasCrumb}</Link>
            {district && <> · {district}</>}
          </div>
          <h1 className="text-[18px] sm:text-[24px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.25] md:leading-[1.1] mb-3 [word-break:break-word] [overflow-wrap:anywhere]">
            {title}
          </h1>
          <div className="text-[15px] text-[var(--color-text-muted)] leading-relaxed mb-4 flex items-center flex-wrap gap-x-5 gap-y-1">
            {bedrooms != null && <span>{bedrooms} BR</span>}
            {area != null && <span>{area} {c.sqm} {c.house}</span>}
            {land != null && <span>{land} {c.sqm} {c.land}</span>}
            {district && <span>{districtRaw ? geoChainString(districtRaw) : `${district}, ${c.bali}`}</span>}
          </div>
          {/* Part-of-complex link near the top (TASK-13a): a strong internal
              link to the complex card, which is the canonical page for the
              cluster of same-name URLs. Villa stays a standalone product
              (no canonical), this is just prominent navigation. */}
          {parentComplex && (
            <div className="mb-4">
              <Link
                href={`${complexesRoot}/o/${parentComplex.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-[13.5px] font-medium text-[var(--color-primary-pressed)] no-underline hover:opacity-80 transition-opacity"
              >
                {lang === 'en'
                  ? `Part of the ${parentComplex.name} complex →`
                  : `Часть жилого комплекса «${parentComplex.name}» →`}
              </Link>
            </div>
          )}
          {priceNum != null && (
            <PriceCtaCard
              priceUsd={priceNum}
              pricePerSqmUsd={priceM2}
              updatedAt={priceUpdatedAt}
              managerId={managers[0]?.id ?? null}
              sellerUrl={sellerUrl}
              listingKind="villa"
              listingId={v.airtable_id}
              listingSlug={slug}
              listingTitle={title}
              reservedUntil={activeReservation?.expires_at ?? null}
              presentationButton={
                <VillaPresentationButton
                  variant="outline"
                  lang={lang}
                  villaId={v.airtable_id}
                  slug={slug}
                  title={title}
                  district={district}
                  photos={photos}
                  priceUsd={priceNum}
                  pricePerM2={priceM2}
                  bedrooms={bedrooms}
                  area={area}
                  land={land}
                  yearLabel={yearRaw && status?.toLowerCase().includes('построен') ? c.completed : (yearRaw ?? null)}
                  lease={lease}
                  permit={permit}
                  lat={lat}
                  lng={lng}
                  seoText={pageBody}
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
            <ExpandableText className="max-w-3xl" more={lang === 'en' ? 'Read more' : 'Подробнее'} less={lang === 'en' ? 'Show less' : 'Свернуть'}>
              <div className="prose-balinsky text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
                {seoText}
              </div>
            </ExpandableText>
          </section>
        )}

        {lat != null && lng != null && (
          <LazyMount fallback={<div className="mt-12 mb-10 min-h-[600px]" />}>
            <InvestmentWidget villaId={v.airtable_id} apiKey={GMAPS_KEY} lang={lang} />
          </LazyMount>
        )}

        {nearby && (
          <NearbyPlaces categories={nearby.categories} byCategory={nearby.byCategory} lang={lang} />
        )}

        {districtCopy && districtSlug && (
          <DistrictAboutCard copy={districtCopy} lang={lang} kind="villa" hubHref={`${villasRoot}/${districtSlug}`} />
        )}

        {(
          landAllowsBuilding(landProfile, 'villa')
          || (marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0))
        ) && (
          <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {landAllowsBuilding(landProfile, 'villa') && (
              <LazyMount fallback={<div className="min-h-[480px] rounded-2xl bg-[var(--color-search-bg)]" />}>
                <LandProfileBlock data={landProfile!} lang={lang} />
              </LazyMount>
            )}
            {marketStats && (marketStats.villa_count > 0 || marketStats.apartment_count > 0) && (
              <MarketStatsBlock data={marketStats} lang={lang} />
            )}
          </section>
        )}

        {(parentComplex || developer || developerName) && (
          <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COMPLEX (left) */}
            {parentComplex ? (
              <Link
                href={`${complexesRoot}/o/${parentComplex.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
              >
                {parentComplex.coverUrl && (
                  <div className="relative h-[160px] bg-[var(--color-search-bg)]">
                    <Image src={parentComplex.coverUrl} alt={parentComplex.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                    <Building2 size={14} /> {c.complexLabel}
                  </div>
                  <div className="text-[19px] font-semibold text-[#111827] mb-2">{parentComplex.name}</div>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--color-text-muted)] mb-4">
                    {parentComplex.district && <span>{parentComplex.district}</span>}
                    {parentComplex.types.length > 0 && <span>{parentComplex.types.join(', ')}</span>}
                    {parentComplex.year && (
                      <span>{parentComplex.status?.toLowerCase().includes('построен') ? c.completedShort : c.completion(parentComplex.year)}</span>
                    )}
                    {parentComplex.units != null && <span>{c.units(parentComplex.units)}</span>}
                  </div>
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
            ) : developerName ? (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <HardHat size={14} /> {c.developerLabel}
                </div>
                <div className="text-[19px] font-semibold text-[#111827]">{developerName}</div>
              </div>
            ) : null}
          </section>
        )}

        {managers.length > 0 && <ManagerCard managers={managers} developerName={developer?.name ?? developerName} />}

        <RentalCompareSection
          district={district}
          bedrooms={bedrooms}
          villaPriceUsd={priceNum}
          lang={lang}
        />

        {videos.length > 0 && (
          <VideoGrid videos={videos} title={parentComplex ? c.videosTitleComplex(parentComplex.name) : developer ? c.videosTitleDev(developer.name) : c.videosTitleDefault} />
        )}

        {otherVillas.length > 0 && district && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {c.otherVillas(district)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherVillas.map(o => <VillaCard key={o.id} a={o} lang={lang} />)}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">{c.relatedHeading}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: villasRoot, label: c.related.allVillas },
              { href: apartmentsRoot, label: c.related.apartments },
              { href: complexesRoot, label: c.related.complexes },
              { href: developersRoot, label: c.related.developers },
              ...(district ? [
                { href: `${villasRoot}/${districtRaw!.toLowerCase().replace(/\s+/g, '-')}`, label: c.related.villasIn(district) },
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
