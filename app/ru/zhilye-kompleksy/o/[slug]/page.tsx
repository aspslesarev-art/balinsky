import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import {
  Building2, MapPin, Calendar, FileCheck2, Lock, Users, Home, Plane,
  ChevronRight, ExternalLink, Box, Map as MapIcon, Film, FileText, BedDouble,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { ProgressBar } from '@/components/ProgressBar'
import { ApartmentCard, type ApartmentCardData } from '@/components/ApartmentCard'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { loadVideosByComplexSlug } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667
function fmtAirportDistance(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null
  const km = haversineKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG)
  return km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0)} км`
}

export const revalidate = 3600
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const APT_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`
const VILLA_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const CURRENT_YEAR = 2026

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ slug: string }>
type ComplexRow = {
  airtable_id: string
  data: Record<string, unknown>
  slug: string | null
  cover_url: string | null
}

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) {
    return firstString((v as { value: unknown }).value)
  }
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
function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}
function parseGeo(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeo(v[0])
  return null
}
function readiness(d: Record<string, unknown>): number {
  const status = (firstString(d['Статус']) ?? '').toLowerCase()
  if (status.includes('построен')) return 100
  if (status.includes('заказ')) return 10
  const yr = Number(firstString(d['Year of completion ']) ?? firstString(d['Year of completion']))
  if (Number.isFinite(yr)) {
    const delta = yr - CURRENT_YEAR
    if (delta <= 0) return 95
    if (delta === 1) return 70
    if (delta === 2) return 45
    if (delta === 3) return 30
    return 20
  }
  return 50
}
function fmtUsd(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}

// Lightweight index from Storage manifest (avoids 9MB+ raw_complexes full-data query)
type ComplexIndexEntry = { id: string; slug: string; district: string | null }
const COMPLEX_INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_complexes-index.json`
const COMPLEX_INDEX_TTL_MS = 30 * 60 * 1000
let _complexIndexCache: { ts: number; data: ComplexIndexEntry[] } | null = null
let _complexIndexInflight: Promise<ComplexIndexEntry[]> | null = null

async function _loadComplexIndex(): Promise<ComplexIndexEntry[]> {
  if (_complexIndexCache && Date.now() - _complexIndexCache.ts < COMPLEX_INDEX_TTL_MS) return _complexIndexCache.data
  if (_complexIndexInflight) return _complexIndexInflight
  _complexIndexInflight = (async () => {
    try {
      const r = await fetch(COMPLEX_INDEX_URL, { next: { revalidate: 1800 } })
      if (!r.ok) return _complexIndexCache?.data ?? []
      const j = await r.json() as { items: ComplexIndexEntry[] }
      const items = j.items ?? []
      _complexIndexCache = { ts: Date.now(), data: items }
      return items
    } catch {
      return _complexIndexCache?.data ?? []
    }
  })().finally(() => { _complexIndexInflight = null })
  return _complexIndexInflight
}

const _complexByIdCache = new Map<string, { ts: number; row: ComplexRow | null }>()
async function _loadComplexById(id: string): Promise<ComplexRow | null> {
  const c = _complexByIdCache.get(id)
  if (c && Date.now() - c.ts < 5 * 60 * 1000) return c.row
  const { data } = await sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').eq('airtable_id', id).maybeSingle()
  const row = (data as ComplexRow | null) ?? null
  _complexByIdCache.set(id, { ts: Date.now(), row })
  return row
}

const _loadComplexPhotos = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    try {
      const r = await fetch(COMPLEX_PHOTO_MANIFEST_URL)
      if (!r.ok) return {}
      return (await r.json()) as Record<string, string[]>
    } catch { return {} }
  },
  ['complex-photo-manifest-detail'],
  { revalidate: 3600 },
)

// Module-level cache (unstable_cache silently fails on 14MB+ apartments data)
type AptRow = { airtable_id: string; data: Record<string, unknown> }
let _aptCache: { ts: number; rows: AptRow[]; manifest: Record<string, string[]> } | null = null
let _aptInflight: Promise<{ rows: AptRow[]; manifest: Record<string, string[]> }> | null = null

async function _loadApartments(): Promise<{ rows: AptRow[]; manifest: Record<string, string[]> }> {
  if (_aptCache && Date.now() - _aptCache.ts < 5 * 60 * 1000) return { rows: _aptCache.rows, manifest: _aptCache.manifest }
  if (_aptInflight) return _aptInflight
  _aptInflight = (async () => {
    try {
      // Paginated fetch to avoid Postgres statement timeout
      const rows: AptRow[] = []
      for (let from = 0; from < 1500; from += 100) {
        const { data, error } = await sb.from('raw_apartments').select('airtable_id, data').range(from, from + 99)
        if (error || !data || data.length === 0) break
        rows.push(...(data as AptRow[]))
        if (data.length < 100) break
      }
      const manifest = await fetch(APT_PHOTO_MANIFEST_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})) as Record<string, string[]>
      _aptCache = { ts: Date.now(), rows, manifest }
      return { rows, manifest }
    } catch {
      return _aptCache ? { rows: _aptCache.rows, manifest: _aptCache.manifest } : { rows: [], manifest: {} }
    }
  })().finally(() => { _aptInflight = null })
  return _aptInflight
}

async function loadComplexBySlug(slug: string): Promise<ComplexRow | null> {
  const idx = await _loadComplexIndex()
  const entry = idx.find(c => c.slug === slug)
  if (!entry) return null
  return _loadComplexById(entry.id)
}

async function loadOtherComplexesInDistrict(district: string | null, exceptId: string) {
  if (!district) return []
  const [idx, manifest] = await Promise.all([_loadComplexIndex(), _loadComplexPhotos()])
  const candidates = idx.filter(c => c.id !== exceptId && c.district === district).slice(0, 4)
  const rows = await Promise.all(candidates.map(c => _loadComplexById(c.id)))
  return rows
    .filter((c): c is ComplexRow => c != null)
    .map(c => {
      const photos = manifest[c.airtable_id] ?? []
      return {
        slug: c.slug as string,
        name: firstString(c.data['Project']) as string,
        location: firstString(c.data['Location 2']) ?? firstString(c.data['Location']),
        types: strList(c.data['Типы юнитов']).join(', ') || null,
        coverUrl: c.cover_url ?? photos[0] ?? null,
      }
    })
    .filter(c => c.slug && c.name)
}

// Villas live in raw_villas. Some complexes (like Maison Boheme) have villa
// units, not apartment units. Load them with the same paginated pattern.
type VillaRow = { airtable_id: string; data: Record<string, unknown> }
let _villaCache: { ts: number; rows: VillaRow[]; manifest: Record<string, string[]> } | null = null
let _villaInflight: Promise<{ rows: VillaRow[]; manifest: Record<string, string[]> }> | null = null

async function _loadVillas(): Promise<{ rows: VillaRow[]; manifest: Record<string, string[]> }> {
  if (_villaCache && Date.now() - _villaCache.ts < 5 * 60 * 1000) return { rows: _villaCache.rows, manifest: _villaCache.manifest }
  if (_villaInflight) return _villaInflight
  _villaInflight = (async () => {
    try {
      const rows: VillaRow[] = []
      for (let from = 0; from < 1500; from += 100) {
        const { data, error } = await sb.from('raw_villas').select('airtable_id, data').range(from, from + 99)
        if (error || !data || data.length === 0) break
        rows.push(...(data as VillaRow[]))
        if (data.length < 100) break
      }
      const manifest = await fetch(VILLA_PHOTO_MANIFEST_URL).then(r => r.ok ? r.json() : {}).catch(() => ({})) as Record<string, string[]>
      _villaCache = { ts: Date.now(), rows, manifest }
      return { rows, manifest }
    } catch {
      return _villaCache ? { rows: _villaCache.rows, manifest: _villaCache.manifest } : { rows: [], manifest: {} }
    }
  })().finally(() => { _villaInflight = null })
  return _villaInflight
}

type ApartmentUnit = ApartmentCardData & { id: string; kind: 'apartment' }
type VillaUnit = VillaCardData & { id: string; kind: 'villa' }
type Unit = ApartmentUnit | VillaUnit

async function loadUnitsInComplex(complexName: string): Promise<Unit[]> {
  const lower = complexName.toLowerCase()
  if (lower.length < 3) return []
  const [apt, vil] = await Promise.all([_loadApartments(), _loadVillas()])

  const units: Unit[] = []
  const seenSlug = new Set<string>()

  for (const r of apt.rows) {
    if (r.data['Опубликовать'] !== true) continue
    const titleRaw = firstString(r.data['SEO:Title'])
    if (!titleRaw || !titleRaw.toLowerCase().includes(lower)) continue
    const slug = firstString(r.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    if (seenSlug.has('a:' + slug)) continue
    seenSlug.add('a:' + slug)
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    units.push({
      kind: 'apartment',
      id: r.airtable_id,
      slug,
      title,
      priceUsd: numberOrNull(r.data['price_usd'] ?? r.data['Цена']),
      bedrooms: numberOrNull(r.data['Комнаты']),
      area: numberOrNull(r.data['Площадь']),
      floor: firstString(r.data['Этаж']),
      photos: apt.manifest[r.airtable_id] ?? [],
    })
  }

  // Villas: dedupe by airtable_id (slug clashes between physical units in
  // the same project are meaningful — show each unit).
  const seenVillaId = new Set<string>()
  for (const r of vil.rows) {
    if (r.data['Опубликовать'] !== true) continue
    const titleRaw = firstString(r.data['SEO:Title'])
    if (!titleRaw || !titleRaw.toLowerCase().includes(lower)) continue
    const slug = firstString(r.data['SEO:Slug'])
    if (!slug || slug.startsWith('-')) continue
    if (seenVillaId.has(r.airtable_id)) continue
    seenVillaId.add(r.airtable_id)
    const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
    units.push({
      kind: 'villa',
      id: r.airtable_id,
      slug,
      title,
      priceUsd: numberOrNull(r.data['price']) ?? numberOrNull(r.data['Цена']),
      bedrooms: numberOrNull(firstString(r.data['Комнаты'])),
      area: numberOrNull(r.data['Площадь']),
      land: numberOrNull(r.data['Земля']),
      district: firstString(r.data['Location 2']) ?? firstString(r.data['Location']),
      status: firstString(r.data['Статус']),
      photos: vil.manifest[r.airtable_id] ?? [],
    })
  }

  units.sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))
  return units
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const c = await loadComplexBySlug(slug)
  if (!c) return { robots: { index: false } }
  const name = firstString(c.data['Project']) ?? slug
  const district = firstString(c.data['Location 2']) ?? firstString(c.data['Location'])
  const types = strList(c.data['Типы юнитов']).join(', ')
  const yearRaw = firstString(c.data['Year of completion ']) ?? firstString(c.data['Year of completion'])
  const seoText = firstString(c.data['SEO Text']) ?? firstString(c.data['Описание']) ?? firstString(c.data['ИИ Описание 2'])
  const description = seoText
    ? seoText.slice(0, 160).trim() + (seoText.length > 160 ? '…' : '')
    : `Жилой комплекс ${name}${district ? ` в районе ${district}` : ''} на Бали. ${types ? `Форматы: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Сдача: ${yearRaw}.` : ''} Фото, цены, разрешения.`
  return {
    title: `${name} — жилой комплекс${district ? ` в ${district}` : ''} на Бали | Balinsky`,
    description,
    alternates: { canonical: `/ru/zhilye-kompleksy/o/${slug}` },
    openGraph: {
      title: `${name} на Бали`,
      description,
      type: 'website' as const,
      url: `${SITE_URL}/ru/zhilye-kompleksy/o/${slug}`,
      images: c.cover_url ? [{ url: c.cover_url }] : [],
    },
  }
}

const FAQ_FOR_COMPLEX = (name: string, district: string | null, lease: string | null) => [
  {
    q: `Где находится ${name}?`,
    a: district ? `Жилой комплекс ${name} расположен в районе ${district} на Бали, Индонезия.` : `Жилой комплекс ${name} находится на Бали, Индонезия. Точные координаты — на карте ниже.`,
  },
  {
    q: `Какой срок лизхолда у ${name}?`,
    a: lease ? `Базовый срок лизхолда — ${lease} лет. Уточняйте у застройщика возможность продления.` : 'Срок лизхолда уточняйте у застройщика. Для большинства проектов на Бали — 25–80 лет с возможностью продления.',
  },
  {
    q: `Можно ли купить юнит в ${name} иностранцу?`,
    a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды земли) у нотариуса PPAT. Иностранцы покупают так же, как и местные.',
  },
  {
    q: 'Какие документы должны быть у комплекса?',
    a: 'Главные — PBG (разрешение на строительство) и SLF (сертификат пригодности). Без SLF юнит нельзя легально сдавать в аренду. Документы видны выше в блоке «Ключевые факты».',
  },
]

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const c = await loadComplexBySlug(slug)
  if (!c) notFound()

  const d = c.data
  const name = firstString(d['Project'])
  if (!name) notFound()

  const [photoManifest, units] = await Promise.all([
    _loadComplexPhotos(),
    loadUnitsInComplex(name),
  ])

  const photos = (photoManifest[c.airtable_id] ?? []).slice(0, 12)
  const slidesPhotos = photos.length > 0 ? photos : c.cover_url ? [c.cover_url] : []
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const types = strList(d['Типы юнитов'])
  const status = firstString(d['Статус'])
  const permit = firstString(d['Разрешительные документы'])
  const yearRaw = firstString(d['Year of completion ']) ?? firstString(d['Year of completion'])
  const totalUnits = numberOrNull(d['Total quantity of units'])
  const lease = firstString(d['Leasehold']) ?? firstString(d['Leashold'])
  const developerName = firstString(d['Developer1']) ?? firstString(d['Варианты поиска застройщика'])
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const seoText = firstString(d['SEO Text']) ?? firstString(d['Описание']) ?? firstString(d['ИИ Описание 2']) ?? firstString(d['ИИ Описание'])

  // External resources
  const resources: { label: string; url: string; Icon: typeof Box }[] = []
  const presentations = firstString(d['Презентации'])
  const renders = firstString(d['Renders'])
  const masterplan = firstString(d['Мастерплан'])
  const tour3d = firstString(d['3D tours'])
  const video = firstString(d['Video'])
  const booking = firstString(d['Booking'])
  const airbnb = firstString(d['AirBNB'])
  const gmap = firstString(d['Link from Google maps on location'] ?? d['Google maps'] ?? d['Google map'])
  if (presentations) resources.push({ label: 'Презентация проекта', url: presentations, Icon: FileText })
  if (renders) resources.push({ label: 'Рендеры', url: renders, Icon: Box })
  if (masterplan) resources.push({ label: 'Мастер-план', url: masterplan, Icon: MapIcon })
  if (tour3d) resources.push({ label: '3D-тур', url: tour3d, Icon: Box })
  if (video) resources.push({ label: 'Видео обзор', url: video, Icon: Film })
  if (booking) resources.push({ label: 'Booking.com', url: booking, Icon: ExternalLink })
  if (airbnb) resources.push({ label: 'AirBnB', url: airbnb, Icon: ExternalLink })

  // Key facts
  const facts: { Icon: typeof Building2; label: string; value: string }[] = [
    types.length > 0 && { Icon: Home, label: 'Тип юнитов', value: types.join(', ') },
    yearRaw && { Icon: Calendar, label: 'Срок сдачи', value: status?.toLowerCase().includes('построен') ? 'Сдан' : yearRaw },
    permit && permit.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: 'Разрешения', value: permit },
    lease && { Icon: Lock, label: 'Лизхолд', value: `${lease} лет` },
    totalUnits != null && { Icon: BedDouble, label: 'Юнитов', value: String(totalUnits) },
    district && { Icon: MapPin, label: 'Район', value: district },
    fmtAirportDistance(lat, lng) && { Icon: Plane, label: 'До аэропорта', value: fmtAirportDistance(lat, lng)! },
  ].filter(Boolean) as { Icon: typeof Building2; label: string; value: string }[]

  const ready = readiness(d)
  const otherComplexes = await loadOtherComplexesInDistrict(district, c.airtable_id)
  const complexVideos = await loadVideosByComplexSlug(slug, 6).catch(() => [])

  const faqItems = FAQ_FOR_COMPLEX(name, district, lease)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  // ApartmentComplex schema (Google understands it)
  const placeJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name,
    url: `${SITE_URL}/ru/zhilye-kompleksy/o/${slug}`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ID',
      addressRegion: 'Bali',
      addressLocality: district ?? 'Bali',
    },
  }
  if (slidesPhotos.length > 0) placeJsonLd.image = slidesPhotos.slice(0, 5)
  if (seoText) placeJsonLd.description = seoText.slice(0, 500)
  if (lat != null && lng != null) {
    placeJsonLd.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng }
  }
  if (totalUnits != null) placeJsonLd.numberOfAccommodationUnits = totalUnits

  const minPrice = units.length > 0 ? units.find(u => u.priceUsd != null)?.priceUsd ?? null : null

  return (
    <>
      <Header active="zhilye-kompleksy" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Жилые комплексы', href: '/ru/zhilye-kompleksy' },
          ...(district ? [{ label: district, href: `/ru/zhilye-kompleksy/${district.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: name },
        ]} />

        {/* PHOTO GALLERY */}
        <section className="mb-6 mt-2 rounded-3xl overflow-hidden border border-[var(--color-border)]">
          <PhotoGalleryHero photos={slidesPhotos} alt={name} />
        </section>

        {/* HERO */}
        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href="/ru/zhilye-kompleksy" className="hover:text-[var(--color-text)]">Жилые комплексы</Link>
            {district && <> · <span>{district}</span></>}
          </div>
          <h1 className="text-[28px] md:text-[44px] font-semibold tracking-tight text-[#111827] leading-[1.05] mb-3">
            {name}
          </h1>
          <div className="text-[16px] text-[var(--color-text-muted)] leading-relaxed max-w-3xl mb-4">
            {types.length > 0 && <>{types.join(', ')}</>}
            {district && <> · {district}, Бали</>}
            {yearRaw && <> · {status?.toLowerCase().includes('построен') ? 'сдан' : `сдача ${yearRaw}`}</>}
            {totalUnits != null && <> · {totalUnits} юнитов</>}
          </div>
          {minPrice && (
            <div className="text-[20px] font-semibold text-[#16A34A]">
              Юниты от {fmtUsd(minPrice)}
            </div>
          )}
        </section>

        {/* KEY FACTS */}
        {facts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              Ключевые факты
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

        {/* READINESS */}
        <section className="mb-10 max-w-3xl">
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">Готовность строительства</h2>
          <ProgressBar value={ready} />
          <div className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            {status ?? 'статус неизвестен'} · оценка ~{ready}%
          </div>
        </section>

        {/* ABOUT (long text from SEO Text) */}
        {seoText && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              О комплексе {name}
            </h2>
            <div className="prose-balinsky max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
              {seoText}
            </div>
          </section>
        )}

        {/* UNITS in this complex */}
        {units.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-2">
              Доступные юниты
            </h2>
            <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
              {units.length} опубликованных {(() => {
                const hasA = units.some(u => u.kind === 'apartment')
                const hasV = units.some(u => u.kind === 'villa')
                if (hasA && hasV) return 'юнитов'
                if (hasV) return 'вилл'
                return 'апартаментов'
              })()} в {name}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {units.slice(0, 12).map(u =>
                u.kind === 'villa'
                  ? <VillaCard key={u.id} a={u} />
                  : <ApartmentCard key={u.id} a={u} />,
              )}
            </div>
          </section>
        )}

        {/* DEVELOPER */}
        {developerName && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              Застройщик
            </h2>
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 max-w-3xl">
              <div className="text-[13px] text-[var(--color-text-muted)] mb-1">Проект реализует</div>
              <div className="text-[20px] font-semibold text-[#111827] mb-3">{developerName}</div>
              <Link
                href="/ru/zastrojshhiki"
                className="inline-flex items-center gap-1 text-[14px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)]"
              >
                Все застройщики Бали <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        )}

        {/* RESOURCES */}
        {resources.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              Документы и материалы
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
              {resources.map(r => (
                <a
                  key={r.label}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-[var(--color-border)] px-5 py-4 hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <r.Icon size={18} className="text-[var(--color-primary)]" />
                    <span className="text-[14px] font-medium text-[#111827]">{r.label}</span>
                  </div>
                  <ExternalLink size={14} className="text-[var(--color-text-muted)]" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* LOCATION */}
        {lat != null && lng != null && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              Расположение
            </h2>
            <div className="text-[14px] text-[var(--color-text)] mb-3">
              {district ? `${district}, ` : ''}Бали, Индонезия
            </div>
            <a
              href={gmap ?? `https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
            >
              <MapIcon size={16} className="text-[var(--color-primary)]" />
              Открыть на Google Maps
            </a>
          </section>
        )}

        {/* VIDEOS */}
        {complexVideos.length > 0 && (
          <VideoGrid videos={complexVideos} title={`Видео о ${name}`} />
        )}

        {/* OTHER COMPLEXES */}
        {otherComplexes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              Другие проекты в районе {district}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {otherComplexes.map(o => (
                <Link
                  key={o.slug}
                  href={`/ru/zhilye-kompleksy/o/${o.slug}`}
                  className="group block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
                >
                  <div className="relative h-[160px] bg-[var(--color-search-bg)]">
                    {o.coverUrl ? (
                      <img src={o.coverUrl} alt={o.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-[#B8C3BC]">🏝️</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[14px] font-semibold text-[#111827] mb-1 truncate">{o.name}</div>
                    {o.types && (
                      <div className="text-[12px] text-[var(--color-text-muted)] truncate">{o.types}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* INTERNAL LINKS */}
        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">
            По теме
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: '/ru/zhilye-kompleksy', label: 'Все жилые комплексы Бали' },
              { href: '/ru/apartamenty', label: 'Апартаменты на Бали' },
              { href: '/ru/villy', label: 'Виллы и дома' },
              { href: '/ru/zastrojshhiki', label: 'Застройщики Бали' },
              ...(district ? [
                { href: `/ru/zhilye-kompleksy/${district.toLowerCase().replace(/\s+/g, '-')}`, label: `Жилые комплексы в ${district}` },
                { href: `/ru/apartamenty/${district.toLowerCase().replace(/\s+/g, '-')}`, label: `Апартаменты в ${district}` },
              ] : []),
            ].map(l => (
              <li key={l.href + l.label}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-1 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)]"
                >
                  <ChevronRight size={14} className="text-[var(--color-primary)]" /> {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
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

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
