// Shared complex-detail renderer. Both /ru/zhilye-kompleksy/o/[slug] and
// /en/complexes/o/[slug] import ComplexDetail and pass their lang —
// layout, data fetching and section order live here only so RU & EN
// stay in lockstep automatically.

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
import { ManagerCard } from '@/components/ManagerCard'
import { InlinePrice } from '@/components/InlinePrice'
import { loadManagersByDeveloperName } from '@/lib/managers'
import { getDeveloperStats } from '@/lib/developer-stats'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { distanceKm as haversineKm } from '@/lib/competitor-utils'
import { loadVideosByComplexSlug } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { loadNearbyPlaces } from '@/lib/nearby-places'
import { NearbyPlaces } from '@/components/NearbyPlaces'
import { listLayers, listHotspots } from '@/lib/complex-visualizations'
import { ComplexVisualizationViewer } from '@/components/ComplexVisualizationViewer'
import { PageViewTracker } from '@/components/PageViewTracker'
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
    home: 'Главная',
    crumbComplexes: 'Жилые комплексы',
    backToComplexes: 'Жилые комплексы',
    bali: 'Бали',
    completed: 'сдан',
    completion: (y: string) => `сдача ${y}`,
    units: (n: number) => `${n} юнитов`,
    unitsFrom: 'Юниты от',
    keyFacts: 'Ключевые факты',
    factType: 'Тип юнитов',
    factCompletion: 'Срок сдачи',
    factCompletionDone: 'Сдан',
    factPermits: 'Разрешения',
    factLeasehold: 'Лизхолд',
    factLeaseValue: (l: string) => `${l} лет`,
    factUnits: 'Юнитов',
    factDistrict: 'Район',
    factAirport: 'До аэропорта',
    progress: 'Готовность строительства',
    statusUnknown: 'статус неизвестен',
    estimate: 'оценка',
    aboutPrefix: 'О комплексе',
    availableUnits: 'Доступные юниты',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'юнитов' : kind === 'villa' ? 'вилл' : 'апартаментов'
      return `${n} опубликованных ${word} в`
    },
    developer: 'Застройщик',
    builtBy: 'Проект реализует',
    allDevelopers: 'Все застройщики Бали',
    docsHeading: 'Документы и материалы',
    location: 'Расположение',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Бали, Индонезия`,
    openInMaps: 'Открыть на Google Maps',
    videosTitle: (n: string) => `Видео о ${n}`,
    otherProjectsIn: (d: string) => `Другие проекты в районе ${d}`,
    relatedHeading: 'По теме',
    related: {
      allComplexes: 'Все жилые комплексы Бали',
      apartments: 'Апартаменты на Бали',
      villas: 'Виллы и дома',
      developers: 'Застройщики Бали',
      complexesIn: (d: string) => `Жилые комплексы в ${d}`,
      apartmentsIn: (d: string) => `Апартаменты в ${d}`,
    },
    faqHeading: 'Часто задаваемые вопросы',
    res: { presentation: 'Презентация проекта', renders: 'Рендеры', masterplan: 'Мастер-план', tour3d: '3D-тур', video: 'Видео обзор', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Где находится ${name}?`,
        a: district ? `Жилой комплекс ${name} расположен в районе ${district} на Бали, Индонезия.` : `Жилой комплекс ${name} находится на Бали, Индонезия. Точные координаты — на карте выше.` },
      { q: `Какой срок лизхолда у ${name}?`,
        a: lease ? `Базовый срок лизхолда — ${lease} лет. Уточняйте у застройщика возможность продления.` : 'Срок лизхолда уточняйте у застройщика. Для большинства проектов на Бали — 25–80 лет с возможностью продления.' },
      { q: `Можно ли купить юнит в ${name} иностранцу?`,
        a: 'Да. Сделка оформляется по схеме лизхолда (долгосрочной аренды земли) у нотариуса PPAT. Иностранцы покупают так же, как и местные.' },
      { q: 'Какие документы должны быть у комплекса?',
        a: 'Главные — PBG (разрешение на строительство) и SLF (сертификат пригодности). Без SLF юнит нельзя легально сдавать в аренду. Документы видны выше в блоке «Ключевые факты».' },
    ],
    titlePart: (name: string, district: string | null) => `${name} — жилой комплекс${district ? ` в ${district}` : ''} на Бали | Balinsky`,
    ogTitle: (name: string) => `${name} на Бали`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `Жилой комплекс ${name}${district ? ` в районе ${district}` : ''} на Бали. ${types ? `Форматы: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Сдача: ${yearRaw}.` : ''} Фото, цены, разрешения.`,
  },
  en: {
    home: 'Home',
    crumbComplexes: 'Residential complexes',
    backToComplexes: 'Residential complexes',
    bali: 'Bali',
    completed: 'completed',
    completion: (y: string) => `completion ${y}`,
    units: (n: number) => `${n} units`,
    unitsFrom: 'Units from',
    keyFacts: 'Key facts',
    factType: 'Unit type',
    factCompletion: 'Completion',
    factCompletionDone: 'Completed',
    factPermits: 'Permits',
    factLeasehold: 'Leasehold',
    factLeaseValue: (l: string) => `${l} years`,
    factUnits: 'Units',
    factDistrict: 'District',
    factAirport: 'To airport',
    progress: 'Construction progress',
    statusUnknown: 'status unknown',
    estimate: 'estimated',
    aboutPrefix: 'About',
    availableUnits: 'Available units',
    publishedSuffix: (n: number, kind: 'mixed' | 'villa' | 'apartment') => {
      const word = kind === 'mixed' ? 'units' : kind === 'villa' ? 'villas' : 'apartments'
      return `${n} published ${word} in`
    },
    developer: 'Developer',
    builtBy: 'Built by',
    allDevelopers: 'All Bali developers',
    docsHeading: 'Documents and materials',
    location: 'Location',
    locationLine: (d: string | null) => `${d ? `${d}, ` : ''}Bali, Indonesia`,
    openInMaps: 'Open in Google Maps',
    videosTitle: (n: string) => `Videos about ${n}`,
    otherProjectsIn: (d: string) => `Other projects in ${d}`,
    relatedHeading: 'Related',
    related: {
      allComplexes: 'All Bali residential complexes',
      apartments: 'Apartments in Bali',
      villas: 'Villas and houses',
      developers: 'Bali developers',
      complexesIn: (d: string) => `Residential complexes in ${d}`,
      apartmentsIn: (d: string) => `Apartments in ${d}`,
    },
    faqHeading: 'Frequently asked questions',
    res: { presentation: 'Project presentation', renders: 'Renders', masterplan: 'Master plan', tour3d: '3D tour', video: 'Video tour', booking: 'Booking.com', airbnb: 'AirBnB' },
    faq: (name: string, district: string | null, lease: string | null) => [
      { q: `Where is ${name} located?`,
        a: district ? `${name} residential complex is in ${district}, Bali, Indonesia.` : `${name} is in Bali, Indonesia. The exact coordinates are on the map above.` },
      { q: `What is the leasehold term at ${name}?`,
        a: lease ? `The base leasehold is ${lease} years. Check with the developer about extension terms.` : 'Check the leasehold term with the developer. Typical Bali projects run 25–80 years with extension options.' },
      { q: `Can a foreigner buy a unit at ${name}?`,
        a: 'Yes. The deal is closed via the leasehold scheme (long-term land lease) at a PPAT notary. Foreigners buy on the same terms as locals.' },
      { q: 'What documents should the complex have?',
        a: 'The main ones are PBG (construction permit) and SLF (suitability certificate). Without SLF a unit cannot be legally rented out. Permits are listed above in the "Key facts" block.' },
    ],
    titlePart: (name: string, district: string | null) => `${name} — residential complex${district ? ` in ${district}` : ''} in Bali | Balinsky`,
    ogTitle: (name: string) => `${name} in Bali`,
    fallbackDesc: (name: string, district: string | null, types: string, yearRaw: string | null) =>
      `${name} residential complex${district ? ` in ${district}` : ''} in Bali.${types ? ` Unit types: ${types.toLowerCase()}.` : ''}${yearRaw ? ` Completion: ${yearRaw}.` : ''} Photos, prices, permits.`,
  },
} as const

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
// Build a lookup of developers (name → {slug, logo}) so we can
// link a complex's developer directly to /ru/zastrojshhiki/<slug>.
// Mirrors the villa detail page; cached for an hour because the
// developer list churns slowly.
type DeveloperLink = { name: string; slug: string; logoUrl: string | null }

const _loadDevelopersIndex = unstable_cache(
  async (): Promise<DeveloperLink[]> => {
    const { data, error } = await sb.from('raw_developers').select('airtable_id, data, logo_url').limit(200)
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const rows = (data ?? []) as { airtable_id: string; data: Record<string, unknown>; logo_url: string | null }[]
    if (rows.length === 0) throw new Error('raw_developers returned 0 rows — refusing to cache empty')
    const out: DeveloperLink[] = []
    for (const r of rows) {
      if (r.data['Публикация'] !== true) continue
      const name = firstString(r.data['Developer'])
      const slug = firstString(r.data['SEO:Slug'])
      if (!name || !slug) continue
      out.push({ name, slug, logoUrl: r.logo_url })
    }
    return out
  },
  ['complex-developers-index-v2'],
  { revalidate: 600 },
)

async function findDeveloperLink(name: string | null): Promise<DeveloperLink | null> {
  if (!name) return null
  const list = await _loadDevelopersIndex()
  const t = name.toLowerCase().trim()
  return list.find(d => d.name.toLowerCase() === t)
    ?? list.find(d => d.name.toLowerCase().includes(t) || t.includes(d.name.toLowerCase()))
    ?? null
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
  // Editorial source-of-truth: «Готовность» в Airtable, число 0..1.
  const raw = d['Готовность']
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const pct = raw <= 1 ? raw * 100 : raw
    return Math.max(0, Math.min(100, Math.round(pct)))
  }
  // Fallback when the editor hasn't filled the field yet.
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
      const r = await fetch(COMPLEX_INDEX_URL, { next: { revalidate: 10 } })
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

export async function generateComplexMetadata(slug: string, lang: Lang) {
  const c = await loadComplexBySlug(slug)
  if (!c) return { robots: { index: false } }
  const copy = COPY[lang]
  const name = firstString(c.data['Project']) ?? slug
  const district = firstString(c.data['Location 2']) ?? firstString(c.data['Location'])
  const types = strList(c.data['Типы юнитов']).join(', ')
  const yearRaw = firstString(c.data['Year of completion ']) ?? firstString(c.data['Year of completion'])
  const seoText = tField(c.data, 'SEO Text', lang)
    ?? tField(c.data, 'Описание', lang)
    ?? firstString(c.data['ИИ Описание 2'])
  const description = seoText
    ? seoText.slice(0, 160).trim() + (seoText.length > 160 ? '…' : '')
    : copy.fallbackDesc(name, district, types, yearRaw)
  const ruPath = `/ru/zhilye-kompleksy/o/${slug}`
  const enPath = `/en/complexes/o/${slug}`
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: copy.titlePart(name, district),
    description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` },
    },
    openGraph: {
      title: copy.ogTitle(name),
      description,
      type: 'website' as const,
      url: `${SITE_URL}${path}`,
      images: c.cover_url ? [{ url: c.cover_url }] : [],
    },
  }
}

export async function ComplexDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const copy = COPY[lang]
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
  const managers = await loadManagersByDeveloperName(developerName)
  const devStats = await getDeveloperStats(developerName)
  // Resolve the developer by name → slug + logo so we can link to
  // /ru/zastrojshhiki/<slug> directly instead of just to the
  // developers index. Mirrors the lookup the villa detail page
  // uses; cached for an hour to avoid hammering raw_developers
  // on every complex render.
  const developerLink = await findDeveloperLink(developerName)
  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const seoText = tField(d, 'SEO Text', lang)
    ?? tField(d, 'Описание', lang)
    ?? firstString(d['ИИ Описание 2'])
    ?? firstString(d['ИИ Описание'])

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
  if (presentations) resources.push({ label: copy.res.presentation, url: presentations, Icon: FileText })
  if (renders)       resources.push({ label: copy.res.renders,      url: renders,       Icon: Box })
  if (masterplan)    resources.push({ label: copy.res.masterplan,   url: masterplan,    Icon: MapIcon })
  if (tour3d)        resources.push({ label: copy.res.tour3d,       url: tour3d,        Icon: Box })
  if (video)         resources.push({ label: copy.res.video,        url: video,         Icon: Film })
  if (booking)       resources.push({ label: copy.res.booking,      url: booking,       Icon: ExternalLink })
  if (airbnb)        resources.push({ label: copy.res.airbnb,       url: airbnb,        Icon: ExternalLink })

  // Key facts
  const facts: { Icon: typeof Building2; label: string; value: string }[] = [
    types.length > 0 && { Icon: Home, label: copy.factType, value: types.join(', ') },
    yearRaw && { Icon: Calendar, label: copy.factCompletion, value: status?.toLowerCase().includes('построен') ? copy.factCompletionDone : yearRaw },
    permit && permit.toLowerCase() !== 'нет' && { Icon: FileCheck2, label: copy.factPermits, value: permit },
    lease && { Icon: Lock, label: copy.factLeasehold, value: copy.factLeaseValue(lease) },
    totalUnits != null && { Icon: BedDouble, label: copy.factUnits, value: String(totalUnits) },
    district && { Icon: MapPin, label: copy.factDistrict, value: district },
    fmtAirportDistance(lat, lng, lang) && { Icon: Plane, label: copy.factAirport, value: fmtAirportDistance(lat, lng, lang)! },
  ].filter(Boolean) as { Icon: typeof Building2; label: string; value: string }[]

  const ready = readiness(d)
  const otherComplexes = await loadOtherComplexesInDistrict(district, c.airtable_id)
  const complexVideos = await loadVideosByComplexSlug(slug, 6, lang).catch(() => [])

  // Nearby places — keyed by villa airtable_id in the manifest. The
  // user pointed out that villas in a complex inherit the complex's
  // geo, so the first villa unit's nearby data is a faithful proxy
  // for "what's around this complex". Fall through silently when no
  // villa unit has nearby data populated yet.
  let nearby: Awaited<ReturnType<typeof loadNearbyPlaces>> = null
  for (const u of units) {
    if (u.kind !== 'villa') continue
    const data = await loadNearbyPlaces(u.id).catch(() => null)
    if (data) { nearby = data; break }
  }

  // Interactive visualisation — if the admin built one for this
  // complex, load its layer tree + hotspots and the unit info bag
  // hotspots can point at. unitInfoBySlug is built from the
  // already-loaded units array so the viewer can render rich popups
  // without an extra round-trip.
  // listLayers / listHotspots already swallow the migration-missing
  // case server-side (lib/complex-visualizations) — extra .catch
  // here as belt-and-suspenders so a transient PG error never takes
  // out the public detail page.
  const vizLayers = await listLayers(c.airtable_id).catch(() => [] as Awaited<ReturnType<typeof listLayers>>)
  const vizHotspots = vizLayers.length > 0
    ? await listHotspots(vizLayers.map(l => l.id)).catch(() => [] as Awaited<ReturnType<typeof listHotspots>>)
    : []
  const unitsRoot = lang === 'en' ? '/en' : '/ru'
  // For the popup we prefer the optimised single-image attachment
  // (`Image Opt` in Airtable — a pre-compressed thumbnail) over the
  // full-quality first photo from the manifest. The interactive plan
  // shows at most one unit popup at a time, so this trims ~80% of the
  // bytes vs the raw photo and keeps tap-to-open snappy on mobile.
  function attachmentUrl(v: unknown): string | null {
    if (!Array.isArray(v) || v.length === 0) return null
    const first = v[0]
    if (first && typeof first === 'object' && 'url' in first && typeof (first as { url: unknown }).url === 'string') {
      return (first as { url: string }).url
    }
    return null
  }
  // Module-cached loaders return instantly the second time, so this
  // adds no real cost. We need them to read `Image Opt` which isn't
  // carried through the units[] array.
  const [aptForOpt, vilForOpt] = await Promise.all([_loadApartments(), _loadVillas()])
  const aptRowsById = new Map(aptForOpt.rows.map(r => [r.airtable_id, r]))
  const vilRowsById = new Map(vilForOpt.rows.map(r => [r.airtable_id, r]))

  const unitInfoBySlug: Record<string, {
    kind: 'villa' | 'apartment'; slug: string; title: string;
    bedrooms: number | null; area: number | null; priceUsd: number | null;
    url: string; photoUrl: string | null;
  }> = {}
  for (const u of units) {
    const path = u.kind === 'villa'
      ? `${unitsRoot === '/en' ? '/en/villas' : '/ru/villy'}/o/${u.slug}`
      : `${unitsRoot === '/en' ? '/en/apartments' : '/ru/apartamenty'}/o/${u.slug}`
    const row = (u.kind === 'villa' ? vilRowsById : aptRowsById).get(u.id)
    // Preference order for the popup hero: `Image Opt` (single
    // pre-compressed thumbnail) → `Opt photos` (multi-photo gallery,
    // take first) → manifest first photo (the raw bucket copy).
    const optUrl = row
      ? (attachmentUrl(row.data['Image Opt']) ?? attachmentUrl(row.data['Opt photos']))
      : null
    unitInfoBySlug[u.slug] = {
      kind: u.kind,
      slug: u.slug,
      title: u.title,
      bedrooms: u.bedrooms,
      area: u.area,
      priceUsd: u.priceUsd,
      url: path,
      photoUrl: optUrl ?? u.photos?.[0] ?? null,
    }
  }

  const faqItems = copy.faq(name, district, lease)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  // Locale-aware path roots used in breadcrumbs / internal links.
  const home = lang === 'en' ? '/en' : '/ru'
  const complexesRoot = lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'
  const apartmentsRoot = lang === 'en' ? '/en/apartments' : '/ru/apartamenty'
  const villasRoot = lang === 'en' ? '/en/villas' : '/ru/villy'
  const developersRoot = lang === 'en' ? '/en/developers' : '/ru/zastrojshhiki'
  const detailUrl = lang === 'en'
    ? `${SITE_URL}/en/complexes/o/${slug}`
    : `${SITE_URL}/ru/zhilye-kompleksy/o/${slug}`

  // ApartmentComplex schema (Google understands it)
  const placeJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name,
    url: detailUrl,
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
      <PageViewTracker kind="complex" slug={slug} title={name} airtableId={c.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs items={[
          { label: copy.home, href: home },
          { label: copy.crumbComplexes, href: complexesRoot },
          ...(district ? [{ label: district, href: `${complexesRoot}/${district.toLowerCase().replace(/\s+/g, '-')}` }] : []),
          { label: name },
        ]} />

        {/* PHOTO GALLERY */}
        <section className="mb-6 mt-2 rounded-3xl overflow-hidden border border-[var(--color-border)]">
          <PhotoGalleryHero
            photos={slidesPhotos}
            alt={name}
            wishlistItem={{
              kind: 'complex', slug, title: name,
              photo: slidesPhotos[0] ?? null,
              priceUsd: null,
              district: district ?? null,
              bedrooms: null,
              completionYear: yearRaw ?? null,
              status: status ?? null,
              readinessPct: ready,
              developerName: developerName ?? null,
              developerCompletedCount: devStats?.ready ?? null,
              developerInProgressCount: devStats?.inProgress ?? null,
            }}
          />
        </section>

        {/* HERO */}
        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href={complexesRoot} className="hover:text-[var(--color-text)]">{copy.backToComplexes}</Link>
            {district && <> · <span>{district}</span></>}
          </div>
          <h1 className="text-[20px] sm:text-[28px] md:text-[44px] font-semibold tracking-tight text-[#111827] leading-[1.2] md:leading-[1.05] mb-2 sm:mb-3 [word-break:break-word] [overflow-wrap:anywhere]">
            {name}
          </h1>
          <div className="text-[13px] sm:text-[15px] md:text-[16px] text-[var(--color-text-muted)] leading-snug max-w-3xl mb-3 sm:mb-4">
            {types.length > 0 && <>{types.join(', ')}</>}
            {district && <> · {district}, {copy.bali}</>}
            {yearRaw && <> · {status?.toLowerCase().includes('построен') ? copy.completed : copy.completion(yearRaw)}</>}
            {totalUnits != null && <> · {copy.units(totalUnits)}</>}
          </div>
          {minPrice != null && (
            <div className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold text-[#16A34A]">
              {copy.unitsFrom} <InlinePrice usd={minPrice} />
            </div>
          )}
        </section>

        {/* KEY FACTS */}
        {facts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.keyFacts}
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
          <h2 className="text-[18px] font-semibold text-[#111827] mb-3">{copy.progress}</h2>
          <ProgressBar value={ready} />
          <div className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            {status ?? copy.statusUnknown} · {copy.estimate} ~{ready}%
          </div>
        </section>

        {/* ABOUT (long text from SEO Text) */}
        {seoText && (
          <section className="mb-10">
            <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.aboutPrefix} {name}
            </h2>
            <div className="prose-balinsky max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
              {seoText}
            </div>
          </section>
        )}

        {/* Interactive plan — sits ABOVE the units list because the
            visitor drills from the panorama → highlighted hotspot →
            specific unit, so the natural reading flow is plan first,
            full unit grid second. Renders only when the admin has
            built at least one layer in /admin/visualizations/<id>. */}
        {vizLayers.length > 0 && (
          <ComplexVisualizationViewer
            layers={vizLayers.map(l => ({
              id: l.id, parentLayerId: l.parentLayerId,
              title: l.title, photoUrl: l.photoUrl,
            }))}
            hotspots={vizHotspots}
            unitsBySlug={unitInfoBySlug}
            lang={lang}
          />
        )}

        {/* UNITS in this complex */}
        {units.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-2">
              {copy.availableUnits}
            </h2>
            <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
              {(() => {
                const hasA = units.some(u => u.kind === 'apartment')
                const hasV = units.some(u => u.kind === 'villa')
                const k = hasA && hasV ? 'mixed' : hasV ? 'villa' : 'apartment'
                return copy.publishedSuffix(units.length, k)
              })()} {name}
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

        {/* DEVELOPER — links straight to /ru/zastrojshhiki/<slug>
            when we resolved one by name; falls back to the index
            otherwise. Logo + name is clickable, mirrors the villa
            detail page so visitors get the same affordance. */}
        {developerName && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.developer}
            </h2>
            {developerLink ? (
              <Link
                href={`${developersRoot}/${developerLink.slug}`}
                className="group flex items-center gap-4 bg-white rounded-2xl border border-[var(--color-border)] p-5 max-w-3xl hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-2">
                  {developerLink.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={developerLink.logoUrl} alt={developerLink.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Building2 size={28} className="text-[var(--color-text-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{copy.builtBy}</div>
                  <div className="text-[19px] font-semibold text-[#111827] truncate">{developerLink.name}</div>
                  <div className="mt-1 text-[13px] text-[var(--color-primary-pressed)] font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    {copy.developer} <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 max-w-3xl">
                <div className="text-[13px] text-[var(--color-text-muted)] mb-1">{copy.builtBy}</div>
                <div className="text-[20px] font-semibold text-[#111827] mb-3">{developerName}</div>
                <Link
                  href={developersRoot}
                  className="inline-flex items-center gap-1 text-[14px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)]"
                >
                  {copy.allDevelopers} <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </section>
        )}

        {managers.length > 0 && <ManagerCard managers={managers} developerName={developerName} />}

        {/* Nearby places — beaches / cafes / nightlife / etc. The
            data is keyed by villa airtable_id; we surface it on
            the complex page using the first villa unit's nearby
            data because units in the same complex share geo. */}
        {nearby && (
          <NearbyPlaces categories={nearby.categories} byCategory={nearby.byCategory} />
        )}

        {/* RESOURCES */}
        {resources.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.docsHeading}
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
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.location}
            </h2>
            <div className="text-[14px] text-[var(--color-text)] mb-3">
              {copy.locationLine(district)}
            </div>
            <a
              href={gmap ?? `https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
            >
              <MapIcon size={16} className="text-[var(--color-primary)]" />
              {copy.openInMaps}
            </a>
          </section>
        )}

        {/* VIDEOS */}
        {complexVideos.length > 0 && (
          <VideoGrid videos={complexVideos} title={copy.videosTitle(name)} />
        )}

        {/* OTHER COMPLEXES */}
        {otherComplexes.length > 0 && district && (
          <section className="mb-10">
            <h2 className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
              {copy.otherProjectsIn(district)}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {otherComplexes.map(o => (
                <Link
                  key={o.slug}
                  href={`${complexesRoot}/o/${o.slug}`}
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
            {copy.relatedHeading}
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: complexesRoot, label: copy.related.allComplexes },
              { href: apartmentsRoot, label: copy.related.apartments },
              { href: villasRoot, label: copy.related.villas },
              { href: developersRoot, label: copy.related.developers },
              ...(district ? [
                { href: `${complexesRoot}/${district.toLowerCase().replace(/\s+/g, '-')}`, label: copy.related.complexesIn(district) },
                { href: `${apartmentsRoot}/${district.toLowerCase().replace(/\s+/g, '-')}`, label: copy.related.apartmentsIn(district) },
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
          <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            {copy.faqHeading}
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
