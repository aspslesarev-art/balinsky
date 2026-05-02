import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  BedDouble, Square, Trees, Calendar, FileCheck2, Lock, MapPin, Plane,
  ChevronRight, Building2, HardHat, Star, Palette,
} from 'lucide-react'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`
}
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { InvestmentWidget } from '@/components/InvestmentWidget'
import { RentalCompareSection } from '@/components/RentalCompareSection'
import { ManagerCard } from '@/components/ManagerCard'
import { loadManagerByDeveloperName, loadManagerByDeveloperSlug } from '@/lib/managers'
import { DetailPriceBlock } from '@/components/DetailPriceBlock'
import { InlinePrice } from '@/components/InlinePrice'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllVideos } from '@/lib/videos'
import { loadVillaStyles } from '@/lib/villa-styles'
import { VideoGrid } from '@/components/VideoGrid'
import { VillaPresentationButton } from '@/components/VillaPresentation'

export const revalidate = 3600
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ slug: string }>
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
type IndexEntry = { id: string; slug: string; district: string | null }
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_villas-index.json`
const INDEX_TTL_MS = 30 * 60 * 1000
let _indexCache: { ts: number; data: IndexEntry[] } | null = null
let _indexInflight: Promise<IndexEntry[]> | null = null

async function _loadVillaIndex(): Promise<IndexEntry[]> {
  if (_indexCache && Date.now() - _indexCache.ts < INDEX_TTL_MS) return _indexCache.data
  if (_indexInflight) return _indexInflight
  _indexInflight = (async () => {
    try {
      const r = await fetch(INDEX_URL, { next: { revalidate: 1800 } })
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
  const { data } = await sb.from('raw_villas').select('airtable_id, data').eq('airtable_id', id).maybeSingle()
  const row = (data as Row | null) ?? null
  _byIdCache.set(id, { ts: Date.now(), row })
  return row
}

let _manifestCache: { ts: number; data: Record<string, string[]> } | null = null
async function _loadManifest(): Promise<Record<string, string[]>> {
  if (_manifestCache && Date.now() - _manifestCache.ts < 30 * 60 * 1000) return _manifestCache.data
  try {
    const r = await fetch(PHOTO_MANIFEST_URL, { next: { revalidate: 600 } })
    const j = r.ok ? await r.json() : {}
    _manifestCache = { ts: Date.now(), data: j }
    return j
  } catch { return _manifestCache?.data ?? {} }
}

async function loadVillaBySlug(slug: string): Promise<Row | null> {
  const idx = await _loadVillaIndex()
  const entry = idx.find(e => e.slug === slug)
  if (!entry) return null
  return _loadVillaById(entry.id)
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

const _loadComplexesIndex = unstable_cache(
  async (): Promise<ComplexLite[]> => {
    const { data } = await sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').limit(500)
    const out: ComplexLite[] = []
    for (const c of (data ?? []) as { airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }[]) {
      const name = firstString(c.data['Project'])
      if (!name || !c.slug) continue
      const types = Array.isArray(c.data['Типы юнитов'])
        ? (c.data['Типы юнитов'] as unknown[]).map(x => String(x))
        : []
      out.push({
        id: c.airtable_id,
        slug: c.slug,
        name,
        district: firstString(c.data['Location 2']) ?? firstString(c.data['Location']),
        types,
        year: firstString(c.data['Year of completion ']) ?? firstString(c.data['Year of completion']),
        units: numberOrNull(c.data['Total quantity of units']),
        status: firstString(c.data['Статус']),
        coverUrl: c.cover_url,
      })
    }
    return out
  },
  ['villy-complex-index'],
  { revalidate: 3600 },
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

const _loadDevelopersIndex = unstable_cache(
  async (): Promise<DeveloperLite[]> => {
    const { data } = await sb.from('raw_developers').select('airtable_id, data, logo_url').limit(200)
    const out: DeveloperLite[] = []
    for (const r of (data ?? []) as { airtable_id: string; data: Record<string, unknown>; logo_url: string | null }[]) {
      if (r.data['Публикация'] !== true) continue
      const name = firstString(r.data['Developer'])
      const slug = firstString(r.data['SEO:Slug'])
      if (!name || !slug) continue
      // first 2 bullets from "Репутация и опыт" or "Строительство и недвижимость" as quick highlights
      const sourceText = firstString(r.data['Репутация и опыт']) ?? firstString(r.data['Строительство и недвижимость']) ?? ''
      const highlights = sourceText
        .split('\n')
        .map(l => l.replace(/^[\s•\-–—·]+/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
      out.push({ slug, name, logoUrl: r.logo_url, highlights })
    }
    return out
  },
  ['villy-developers-index'],
  { revalidate: 3600 },
)

function findDeveloperByName(targetName: string | null, list: DeveloperLite[]): DeveloperLite | null {
  if (!targetName) return null
  const t = targetName.toLowerCase().trim()
  // exact match first, then includes
  return list.find(d => d.name.toLowerCase() === t)
    ?? list.find(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()))
    ?? null
}

async function loadOtherVillasInDistrict(district: string | null, exceptId: string) {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadVillaIndex(), _loadManifest()])
  const candidates = idx.filter(e => e.id !== exceptId && e.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadVillaById(c.id)))
  const out: (VillaCardData & { id: string })[] = []
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

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const v = await loadVillaBySlug(slug)
  if (!v) return { robots: { index: false } }
  const d = v.data
  const titleRaw = firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя']) ?? slug
  const title = cleanTitle(titleRaw) ?? slug
  const seoText = firstString(d['SEO Text']) ?? firstString(d['Notes'])
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const price = fmtUsd(numberOrNull(d['price'] ?? d['Цена']))
  const description = seoText
    ? seoText.slice(0, 160).trim() + (seoText.length > 160 ? '…' : '')
    : `${title}${district ? ` в ${district}` : ''} на Бали${price ? `. Цена ${price}.` : '.'} Фото, площадь, земля, документы.`
  // Title с контекстом: район + цена для CTR в выдаче
  const bedrooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  const titleParts = [title]
  if (district) titleParts.push(district)
  if (bedrooms != null) titleParts.push(`${bedrooms} BR`)
  if (area != null) titleParts.push(`${area} м²`)
  if (price) titleParts.push(price)
  const seoTitle = `${titleParts.slice(0, 5).join(' · ')} | Balinsky`
  return {
    title: seoTitle.length > 70 ? `${title}${district ? ` в ${district}` : ''}${price ? ` — ${price}` : ''} | Balinsky` : seoTitle,
    description,
    alternates: { canonical: `/ru/villy/o/${slug}` },
    openGraph: {
      title,
      description,
      type: 'website' as const,
      url: `${SITE_URL}/ru/villy/o/${slug}`,
    },
  }
}

const FAQ = (title: string, district: string | null, price: string | null, lease: string | null, land: number | null) => [
  {
    q: `Сколько стоит ${title}?`,
    a: price ? `Текущая цена объекта — ${price}. Актуальный прайс всегда указан в карточке выше.` : 'Цена уточняется. Свяжитесь для актуального прайса.',
  },
  {
    q: `Где находится ${title}?`,
    a: district ? `Объект расположен в районе ${district} на Бали. Точные координаты — на карте ниже.` : 'Точное расположение и координаты — на карте ниже.',
  },
  {
    q: 'Можно ли иностранцу купить виллу на Бали?',
    a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды земли) у нотариуса PPAT, либо через индонезийское юр. лицо PT PMA.',
  },
  {
    q: 'Какой срок лизхолда?',
    a: lease ? `Базовый срок — ${lease} лет. Условия продления уточняйте у застройщика.` : 'Срок лизхолда уточняйте у застройщика. Стандартно 25–80 лет с возможностью продления.',
  },
  {
    q: 'Какая земля прилагается к вилле?',
    a: land != null ? `${land} м² собственного участка с виллой.` : 'Площадь участка уточняйте — указывается в карточке выше.',
  },
]

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const v = await loadVillaBySlug(slug)
  if (!v) notFound()

  const d = v.data
  const manifest = await _loadManifest()

  const titleRaw = firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя']) ?? slug
  const title = cleanTitle(titleRaw) ?? slug
  const photos = (manifest[v.airtable_id] ?? []).slice(0, 12)
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
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
  const seoText = firstString(d['SEO Text']) ?? firstString(d['Notes'])
  const developerName = firstString(d['Developer1']) ?? firstString(d['Developer'])

  const [otherVillas, complexes, developers, stylesMap] = await Promise.all([
    loadOtherVillasInDistrict(district, v.airtable_id),
    _loadComplexesIndex(),
    _loadDevelopersIndex(),
    loadVillaStyles(),
  ])
  const interiorStyle = stylesMap[v.airtable_id]?.style ?? null
  const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''

  const parentComplex = findParentComplex(title, complexes)
  const developer = findDeveloperByName(developerName, developers)
  const manager = developer?.slug
    ? await loadManagerByDeveloperSlug(developer.slug)
    : await loadManagerByDeveloperName(developerName)

  // Videos: prefer videos for parent complex, else for developer
  const allVideos = await loadAllVideos().catch(() => [])
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
    bedrooms != null && { Icon: BedDouble, label: 'Спальни', value: `${bedrooms} BR` },
    area != null && { Icon: Square, label: 'Дом', value: `${area} м²` },
    land != null && { Icon: Trees, label: 'Земля', value: `${land} м²` },
    yearRaw && { Icon: Calendar, label: 'Сдача', value: status?.toLowerCase().includes('построен') ? 'Сдан' : yearRaw },
    permit && permit.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: 'Разрешения', value: permit },
    lease && { Icon: Lock, label: 'Лизхолд', value: `${lease} лет` },
    district && { Icon: MapPin, label: 'Район', value: district },
    fmtAirportDistance(lat, lng) && { Icon: Plane, label: 'До аэропорта', value: fmtAirportDistance(lat, lng)! },
    interiorStyle && { Icon: Palette, label: 'Стиль интерьера', value: interiorStyle },
    priceM2 != null && { Icon: Square, label: 'Цена за м²', value: <InlinePrice usd={priceM2} /> },
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: ReactNode }[]

  const faqItems = FAQ(title, district, fmtUsd(priceNum), lease, land)
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
    url: `${SITE_URL}/ru/villy/o/${slug}`,
    category: 'Villa',
  }
  if (photos.length > 0) productJsonLd.image = photos.slice(0, 5)
  if (seoText) productJsonLd.description = seoText.slice(0, 500)
  if (developerName) productJsonLd.brand = { '@type': 'Brand', name: developerName }
  if (priceNum != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceNum),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/ru/villy/o/${slug}`,
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
            addressLocality: district ?? 'Bali',
          },
          geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
          numberOfRooms: bedrooms ?? undefined,
          floorSize: area != null ? { '@type': 'QuantitativeValue', value: area, unitCode: 'MTK' } : undefined,
          lotSize: land != null ? { '@type': 'QuantitativeValue', value: land, unitCode: 'MTK' } : undefined,
        }
      : null

  return (
    <>
      <Header active="villy" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Виллы и дома', href: '/ru/villy' },
          ...(district ? [{ label: district, href: `/ru/villy/${district.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: title },
        ]} />

        <section className="mb-6 mt-2">
          <PhotoGalleryHero photos={photos} alt={title} />
        </section>

        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href="/ru/villy" className="hover:text-[var(--color-text)]">Виллы и дома</Link>
            {district && <> · {district}</>}
          </div>
          <h1 className="text-[26px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-3">
            {title}
          </h1>
          <div className="text-[15px] text-[var(--color-text-muted)] leading-relaxed mb-4 flex items-center flex-wrap gap-x-5 gap-y-1">
            {bedrooms != null && <span>{bedrooms} BR</span>}
            {area != null && <span>{area} м² дом</span>}
            {land != null && <span>{land} м² земля</span>}
            {district && <span>{district}, Бали</span>}
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            {priceNum != null && (
              <DetailPriceBlock priceUsd={priceNum} pricePerSqmUsd={priceM2} updatedAt={priceUpdatedAt} />
            )}
            <VillaPresentationButton
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
              yearLabel={yearRaw && status?.toLowerCase().includes('построен') ? 'Сдан' : (yearRaw ?? null)}
              lease={lease}
              permit={permit}
              lat={lat}
              lng={lng}
              seoText={seoText}
            />
          </div>
        </section>

        {facts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              Характеристики
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
              Описание
            </h2>
            <div className="prose-balinsky max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
              {seoText}
            </div>
          </section>
        )}

        {(parentComplex || developer || developerName) && (
          <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COMPLEX (left) */}
            {parentComplex ? (
              <Link
                href={`/ru/zhilye-kompleksy/o/${parentComplex.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
              >
                {parentComplex.coverUrl && (
                  <div className="relative h-[160px] bg-[var(--color-search-bg)]">
                    <img src={parentComplex.coverUrl} alt={parentComplex.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                    <Building2 size={14} /> Жилой комплекс
                  </div>
                  <div className="text-[19px] font-semibold text-[#111827] mb-2">{parentComplex.name}</div>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--color-text-muted)] mb-4">
                    {parentComplex.district && <span>{parentComplex.district}</span>}
                    {parentComplex.types.length > 0 && <span>{parentComplex.types.join(', ')}</span>}
                    {parentComplex.year && (
                      <span>{parentComplex.status?.toLowerCase().includes('построен') ? 'Сдан' : `Сдача ${parentComplex.year}`}</span>
                    )}
                    {parentComplex.units != null && <span>{parentComplex.units} юнитов</span>}
                  </div>
                  <div className="text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    Открыть страницу комплекса <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 opacity-60">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <Building2 size={14} /> Жилой комплекс
                </div>
                <div className="text-[15px] text-[var(--color-text-muted)]">Объект продаётся отдельно (не в составе комплекса)</div>
              </div>
            )}

            {/* DEVELOPER (right) */}
            {developer ? (
              <Link
                href={`/ru/zastrojshhiki/${developer.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="p-5 flex items-start gap-4">
                  <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-2">
                    {developer.logoUrl ? (
                      <img src={developer.logoUrl} alt={developer.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <HardHat size={28} className="text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                      <HardHat size={14} /> Застройщик
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
                  Открыть страницу застройщика <ChevronRight size={14} />
                </div>
              </Link>
            ) : developerName ? (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  <HardHat size={14} /> Застройщик
                </div>
                <div className="text-[19px] font-semibold text-[#111827]">{developerName}</div>
              </div>
            ) : null}
          </section>
        )}

        {manager && <ManagerCard manager={manager} developerName={developer?.name ?? developerName} />}

        {lat != null && lng != null && (
          <InvestmentWidget villaId={v.airtable_id} apiKey={GMAPS_KEY} />
        )}

        <RentalCompareSection
          district={district}
          bedrooms={bedrooms}
          villaPriceUsd={priceNum}
        />

        {videos.length > 0 && (
          <VideoGrid videos={videos} title={parentComplex ? `Видео: ${parentComplex.name}` : developer ? `Видео: ${developer.name}` : 'Видео'} />
        )}

        {otherVillas.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              Другие виллы в районе {district}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherVillas.map(o => <VillaCard key={o.id} a={o} />)}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">По теме</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: '/ru/villy', label: 'Все виллы и дома Бали' },
              { href: '/ru/apartamenty', label: 'Апартаменты на Бали' },
              { href: '/ru/zhilye-kompleksy', label: 'Жилые комплексы' },
              { href: '/ru/zastrojshhiki', label: 'Застройщики Бали' },
              ...(district ? [
                { href: `/ru/villy/${district.toLowerCase().replace(/\s+/g, '-')}`, label: `Виллы в ${district}` },
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
            Часто задаваемые вопросы
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
