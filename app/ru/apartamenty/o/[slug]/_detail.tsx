// Shared apartment-detail renderer for both /ru/apartamenty/o/[slug]
// and /en/apartments/o/[slug]. Layout / data fetching live here only.

import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  BedDouble, Square, Building2, Calendar, FileCheck2, Lock, MapPin, Plane,
  ChevronRight, Map as MapIcon, Layers,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { ApartmentCard, type ApartmentCardData } from '@/components/ApartmentCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { loadAllVideos } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { InvestmentWidget } from '@/components/InvestmentWidget'
import { RentalCompareSection } from '@/components/RentalCompareSection'
import { ManagerCard } from '@/components/ManagerCard'
import { loadManagerByDeveloperName } from '@/lib/managers'
import { PriceCtaCard } from '@/components/PriceCtaCard'
import { findActiveReservation } from '@/lib/reservations'
import { InlinePrice } from '@/components/InlinePrice'
import { VillaPresentationButton } from '@/components/VillaPresentation'
import { tField, type Lang } from '@/lib/i18n'

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
type ComplexRow = { airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }

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
  const n = numberOrNull(v)
  return n
}
function fmtUsd(n: number | null): string | null {
  if (n == null) return null
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}
function cleanTitle(s: string | null): string | null {
  if (!s) return null
  return s.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() || null
}

// Slug → id index. Loaded from Storage manifest (avoids 14MB raw_apartments query).
type AptIndexEntry = { id: string; slug: string; district: string | null }
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
    const { data } = await sb
      .from('raw_apartments')
      .select('airtable_id, data')
      .eq('airtable_id', id)
      .maybeSingle()
    return (data as Row | null) ?? null
  },
  ['apartment-by-id-detail'],
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
    try {
      const r = await fetch(DEV_LOOKUP_URL)
      return r.ok ? r.json() : {}
    } catch { return {} }
  },
  ['dev-lookup-detail'],
  { revalidate: 3600 },
)
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
        const { data, error } = await sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').range(from, from + 99)
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


async function loadApartmentBySlug(slug: string): Promise<Row | null> {
  const idx = await _loadApartmentIndex()
  const entry = idx.find(e => e.slug === slug)
  if (!entry) return null
  return _loadApartmentById(entry.id)
}

// Best-effort match of apartment to its parent complex by extracting the
// complex name from the SEO:Title and finding it in raw_complexes.
function findParentComplex(aptTitle: string, complexes: ComplexRow[]): ComplexRow | null {
  const lower = aptTitle.toLowerCase()
  // try each complex's project name as substring
  let best: { c: ComplexRow; len: number } | null = null
  for (const c of complexes) {
    const name = firstString(c.data['Project'])
    if (!name) continue
    const n = name.toLowerCase()
    if (n.length < 4) continue
    if (lower.includes(n)) {
      if (!best || n.length > best.len) best = { c, len: n.length }
    }
  }
  return best?.c ?? null
}

async function loadOtherApartmentsInDistrict(district: string | null, exceptId: string) {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadApartmentIndex(), _loadAptManifest()])
  const candidates = idx.filter(e => e.id !== exceptId && e.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadApartmentById(c.id)))
  const out: (ApartmentCardData & { id: string })[] = []
  for (const r of rows) {
    if (!r) continue
    const slug = firstString(r.data['SEO:Slug'])
    if (!slug) continue
    const titleRaw = firstString(r.data['SEO:Title']) ?? firstString(r.data['ИИ Имя']) ?? slug
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
  const title = cleanTitle(titleRaw) ?? slug
  const seoText = tField(d, 'SEO Text', lang) ?? tField(d, 'Notes', lang)
  const district = firstString(d['Location filter'])
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
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` },
    },
    openGraph: { title, description, type: 'website' as const, url: `${SITE_URL}${path}` },
  }
}

export async function ApartmentDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = COPY[lang]
  const a = await loadApartmentBySlug(slug)
  if (!a) notFound()

  const d = a.data
  const [manifest, devMap, complexes] = await Promise.all([
    _loadAptManifest(),
    _loadDevLookup(),
    _loadAllComplexes(),
  ])

  const titleRaw = tField(d, 'ИИ Имя', lang) ?? tField(d, 'SEO:Title', lang) ?? slug
  const title = cleanTitle(titleRaw) ?? slug
  const photos = (manifest[a.airtable_id] ?? []).slice(0, 12)
  const district = firstString(d['Location filter'])
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
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

  // Developer lookup via apartment-base devmap
  const devRefs = Array.isArray(d['Developer']) ? (d['Developer'] as unknown[]) : []
  const devName = devRefs
    .map(id => (typeof id === 'string' ? devMap[id] : null))
    .find(n => !!n) ?? null

  // Parent complex (best-effort by name match in title)
  const parentComplex = findParentComplex(title, complexes)
  const parentComplexName = parentComplex ? firstString(parentComplex.data['Project']) : null

  const [otherApts, manager, activeReservation] = await Promise.all([
    loadOtherApartmentsInDistrict(district, a.airtable_id),
    loadManagerByDeveloperName(devName),
    findActiveReservation('apartment', a.airtable_id),
  ])
  const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  // Videos for parent complex (or empty)
  const allVideos = await loadAllVideos().catch(() => [])
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
    priceM2 != null && { Icon: Square, label: lang === 'en' ? 'Price per m²' : 'Цена за м²', value: <InlinePrice usd={priceM2} /> },
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
    url: `${SITE_URL}/ru/apartamenty/o/${slug}`,
    category: 'Apartment',
  }
  if (photos.length > 0) productJsonLd.image = photos.slice(0, 5)
  if (seoText) productJsonLd.description = seoText.slice(0, 500)
  if (devName) productJsonLd.brand = { '@type': 'Brand', name: devName }
  if (priceNum != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceNum),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: lang === 'en' ? `${SITE_URL}/en/apartments/o/${slug}` : `${SITE_URL}/ru/apartamenty/o/${slug}`,
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
            addressLocality: district ?? 'Bali',
          },
          geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
          numberOfRooms: bedrooms ?? undefined,
          floorSize: area != null ? { '@type': 'QuantitativeValue', value: area, unitCode: 'MTK' } : undefined,
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
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.aptCrumb, href: apartmentsRoot },
          ...(district ? [{ label: district, href: `${apartmentsRoot}/${district.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: title },
        ]} />

        <section className="mb-6 mt-2">
          <PhotoGalleryHero photos={photos} alt={title} />
        </section>

        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href={apartmentsRoot} className="hover:text-[var(--color-text)]">{c.aptCrumb}</Link>
            {district && <> · {district}</>}
          </div>
          <h1 className="text-[26px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-3">
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
              managerId={manager?.id ?? null}
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

        {(parentComplexName || devName) && (
          <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            {parentComplexName && parentComplex?.slug && (
              <Link
                href={`${complexesRoot}/o/${parentComplex.slug}`}
                className="block bg-white rounded-2xl border border-[var(--color-border)] p-6 hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <Building2 size={14} /> {c.complexLabel}
                </div>
                <div className="text-[18px] font-semibold text-[#111827] mb-2">{parentComplexName}</div>
                <div className="text-[13px] text-[var(--color-primary-pressed)] inline-flex items-center gap-1">
                  {lang === 'en' ? 'Open complex page' : 'Открыть страницу комплекса'} <ChevronRight size={14} />
                </div>
              </Link>
            )}
            {devName && (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
                <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{lang === 'en' ? 'Developer' : 'Застройщик'}</div>
                <div className="text-[18px] font-semibold text-[#111827]">{devName}</div>
              </div>
            )}
          </section>
        )}

        {lat != null && lng != null && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
              {lang === 'en' ? 'Location' : 'Расположение'}
            </h2>
            <div className="text-[14px] text-[var(--color-text-muted)] mb-4 flex items-center flex-wrap gap-x-4 gap-y-1">
              <span>{c.locationLine(district)}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)]"
              >
                <MapIcon size={14} /> {lang === 'en' ? 'Open in Google Maps' : 'Открыть на Google Maps'}
              </a>
            </div>
            <div className="w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-3xl border border-[var(--color-border)]">
              <iframe
                src={`https://www.google.com/maps?q=${lat},${lng}&hl=${lang}&z=15&output=embed`}
                title={`${lang === 'en' ? 'Map' : 'Карта'}: ${title}`}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>
        )}

        {manager && <ManagerCard manager={manager} developerName={devName} />}

        {lat != null && lng != null && (
          <InvestmentWidget villaId={a.airtable_id} apiKey={GMAPS_KEY} kind="apartment" />
        )}

        <RentalCompareSection
          district={district}
          bedrooms={bedrooms}
          villaPriceUsd={priceNum}
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
