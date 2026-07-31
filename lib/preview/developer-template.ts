// Data layer for the "Urban Escape" developer-page template prototype
// (design handoff, 2026-07-30). Preview-only: rendered under
// /admin/preview/zastrojshhik/[slug], never linked from the public site.
//
// The design asks for a structured shape (metrics, units[], nearby_pois[])
// that Supabase only partly holds. Every field the template wants is resolved
// here AND recorded in `gaps`, so the preview renders a live "what's missing"
// checklist instead of a hand-written one.

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { asList } from '@/lib/as-list'
import { districtRu } from '@/lib/district-ru'
import { loadNearbyPlaces, type NearbyPlace } from '@/lib/nearby-places'
import { loadVideosByDeveloperWithComplexes, type VideoItem } from '@/lib/videos'
import { loadAllNews, type NewsItem } from '@/lib/news'
import { loadAllEvents, type EventItem } from '@/lib/events'
import { loadAllPromo, type PromoItem } from '@/lib/promo'
import { type ManagerItem } from '@/lib/managers'
import {
  parseBullets, firstString, numberOrNull, extractMetrics, fullUsd, plural,
  type DeveloperMetrics,
} from '@/lib/preview/developer-metrics'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const VILLA_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
// Google Places shots collected for complexes whose own galleries were too
// thin for the design (scripts note: 23 of the 32 short ones matched a place
// within 300m, or 800m on an exact name match).
const PLACES_FALLBACK_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_places_fallback.json`
const MANAGERS_URL = `${SUPABASE_URL}/storage/v1/object/public/managers/_managers.json`

/** Walking speed used to derive `walk_min` — a design field no table stores. */
const WALK_METRES_PER_MIN = 80
/** Past this, "N min on foot" stops being meaningful and the design hides it. */
const MAX_WALKABLE_M = 2500
const MAX_POIS_PER_COMPLEX = 6
const MAX_UNITS_ROWS = 40
/** How many of a complex's villa listings to probe for a nearby-POI file. */
const POI_PROBE_LIMIT = 3
/** Gallery cap — the design shows one main shot plus four thumbnails. */
const MAX_GALLERY_PHOTOS = 12
const PHOTOS_WANTED_PER_COMPLEX = 5

export type GapStatus = 'ok' | 'derived' | 'partial' | 'missing'
export type Gap = { block: string; field: string; status: GapStatus; note: string }

export type TplUnit = {
  name: string | null
  type: string
  bedrooms: number | null
  houseM2: number | null
  landM2: number | null
  priceUsd: number | null
  sold: boolean
  url: string | null
}

export type TplPoi = {
  id: string
  name: string
  category: string
  categoryTitle: string
  lat: number
  lng: number
  distanceM: number
  walkMin: number | null
  reviews: number | null
  rating: number | null
  /** Google Places photo resource name, served through /api/place-photo. */
  photoName: string | null
}

export type TplComplex = {
  id: string
  slug: string
  name: string
  district: string | null
  status: 'building' | 'completed'
  statusLabel: string
  unitsCount: number | null
  priceFromUsd: number | null
  handoverYear: string | null
  progressPct: number | null
  permit: string | null
  leaseYears: number | null
  paymentPlan: number[]
  lede: string | null
  geo: { lat: number; lng: number } | null
  photos: string[]
  /** Set when the lead photo came from Google Places — attribution is required. */
  photoCredit: string | null
  units: TplUnit[]
  pois: TplPoi[]
  url: string
  unitTypes: string[]
  metaLine: string
}

export type BulletCard = { key: string; icon: string; title: string; items: string[] }

export type TplDeveloper = {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  heroPhoto: string | null
  /** Which fallback produced `heroPhoto` — the hero renders differently per kind. */
  heroKind: 'complex' | 'villa' | 'logo' | 'placeholder'
  logo: string | null
  districts: string[]
  projectsForSale: number
  completedCount: number
  unitsTotal: number
  metrics: DeveloperMetrics
  bulletCards: BulletCard[]
  website: string | null
  rating: number | null
}

export type TplFaq = { q: string; a: string }

export type DeveloperTemplateData = {
  dev: TplDeveloper
  complexes: TplComplex[]
  managers: ManagerItem[]
  videos: VideoItem[]
  news: NewsItem[]
  events: EventItem[]
  promos: PromoItem[]
  faq: TplFaq[]
  gaps: Gap[]
}

// ---------------------------------------------------------------- loaders

type Row = Record<string, unknown>

function projection(fields: readonly string[], cols: readonly string[] = []): string {
  return ['airtable_id', ...cols, ...fields.map((k, i) => `f${i}:data->"${k}"`)].join(', ')
}
function unproject(rows: Row[], fields: readonly string[], cols: readonly string[] = []): Row[] {
  return rows.map(r => {
    const o: Row = { airtable_id: r.airtable_id }
    for (const c of cols) o[c] = r[c]
    fields.forEach((k, i) => { o[k] = r[`f${i}`] })
    return o
  })
}

const DEV_FIELDS = [
  'Developer', 'SEO:Slug', 'SEO:Description', 'AI Описание', 'Описание ИИ',
  'Команда', 'Бизнес и сервисы', 'Строительство и недвижимость', 'Репутация и опыт',
  'Управляющая компания', 'Публикация', "Link on developer's website", 'Общий рейтинг',
] as const

const CPX_FIELDS = [
  'Project', 'Developer1', 'Location', 'Location 2', 'Статус', 'Статус продаж', 'Готовность',
  'Разрешительные документы', 'Year of completion ', 'Geo', 'Geo 2', 'Leasehold',
  'Payment plan,%', 'Типы юнитов', 'Total quantity of units', 'Описание', 'ИИ Описание',
  'SEO:Slug',
] as const

const VILLA_FIELDS = [
  'Комплекс 1', 'Комнаты', 'Площадь', 'Земля', 'Цена', 'SEO:Slug', 'Тип', 'Name', 'Developer1',
] as const

type PlacesFallback = Record<string, { photoName: string; attribution: string | null; placeName?: string }>

/**
 * Managers are read straight from Storage with no cache. The shared loader
 * caches the manifest for 10 minutes, which is right for the public site but
 * wrong here: this page exists to check what the data looks like right now,
 * and an editor who fills a field in /admin/data should see it immediately.
 */
async function loadManagersFresh(devName: string): Promise<ManagerItem[]> {
  try {
    const r = await fetch(MANAGERS_URL, { cache: 'no-store' })
    if (!r.ok) return []
    const j = (await r.json()) as { items?: ManagerItem[] }
    const lc = devName.trim().toLowerCase()
    return asList(j.items)
      .filter(m => asList(m.developerNames).some(n => String(n).trim().toLowerCase() === lc))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  } catch {
    return []
  }
}

async function loadPlacesFallback(): Promise<PlacesFallback> {
  try {
    const r = await fetch(PLACES_FALLBACK_URL, { next: { revalidate: 3600 } })
    if (!r.ok) return {}
    const j = (await r.json()) as { items?: PlacesFallback }
    return j.items ?? {}
  } catch {
    return {}
  }
}

async function loadManifest(url: string): Promise<Record<string, string[]>> {
  try {
    const r = await fetch(url, { next: { revalidate: 1800 } })
    if (!r.ok) return {}
    return (await r.json()) as Record<string, string[]>
  } catch {
    return {}
  }
}


// ---------------------------------------------------------------- mapping

function parsePaymentPlan(raw: unknown): number[] {
  const s = firstString(raw)
  if (!s) return []
  return s.split('+').map(p => Number(p.replace(/[^\d.]/g, ''))).filter(n => Number.isFinite(n) && n > 0)
}

function flattenPois(
  data: { categories: { key: string; title: string }[]; byCategory: Record<string, NearbyPlace[]> },
): TplPoi[] {
  const title = (k: string) => data.categories.find(c => c.key === k)?.title ?? k
  const all: TplPoi[] = []
  for (const [key, list] of Object.entries(data.byCategory)) {
    for (const p of asList(list)) {
      if (!p?.name || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue
      const distanceM = Math.round((p.distanceKm ?? 0) * 1000)
      all.push({
        id: p.id,
        name: p.name,
        category: key,
        categoryTitle: title(key),
        lat: p.lat,
        lng: p.lng,
        distanceM,
        walkMin: distanceM > 0 && distanceM <= MAX_WALKABLE_M
          ? Math.max(1, Math.round(distanceM / WALK_METRES_PER_MIN))
          : null,
        reviews: p.reviews ?? null,
        rating: p.rating ?? null,
        photoName: null,
      })
    }
  }
  // One per category first (the design's chip row mixes beach / food / wellness),
  // then fill by review weight so the heat map has something to render.
  all.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
  // The nearby file lists the same place under several categories
  // (a beach club is both `nightlife` and `beach_club`), which would
  // render duplicate chips.
  const byName = new Set<string>()
  const unique = all.filter(p => (byName.has(p.name) ? false : (byName.add(p.name), true)))
  all.length = 0
  all.push(...unique)
  const seen = new Set<string>()
  const primary = all.filter(p => (seen.has(p.category) ? false : (seen.add(p.category), true)))
  const chosen = new Set(primary)
  return [...primary, ...all.filter(p => !chosen.has(p))].slice(0, MAX_POIS_PER_COMPLEX)
}

/**
 * Villas link to their complex by NAME, not by id: the `Комплекс` id-array on
 * raw_villas holds record ids that no longer exist in raw_complexes (stale
 * Airtable-era links — not one of the 197 complexes matches). `Комплекс 1` is
 * the denormalised complex name and is the only join that actually resolves.
 */
/**
 * Developer names don't always match exactly between tables: the developer
 * card says «LB Group (LOYO&BONDAR)» while its twelve complexes say just
 * «LB Group». Comparing with the parenthetical suffix stripped links them
 * without touching the data.
 */
function sameDeveloper(a: string, b: string): boolean {
  const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, ' ')
  const bare = (x: string) => norm(x).replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  return norm(a) === norm(b) || bare(a) === bare(b)
}

/** `Developer1` / `Типы юнитов` arrive as either a bare string or an array. */
function namesOf(v: unknown): string[] {
  if (typeof v === 'string') return v.trim() ? [v.trim()] : []
  if (Array.isArray(v)) return v.flatMap(namesOf)
  return []
}

function normName(v: unknown): string {
  return String(firstString(v) ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function villasOfComplex(villas: Row[], complexName: string): Row[] {
  const key = normName(complexName)
  if (!key) return []
  return villas.filter(v => normName(v['Комплекс 1']) === key)
}

function buildUnits(villas: Row[], complexName: string, salesStatus: string): TplUnit[] {
  return villasOfComplex(villas, complexName)
    .map(v => ({
      // `Name` is an internal catalogue code (V00679) for most listings —
      // only show it when the editor gave the unit a real name.
      name: (() => { const n = firstString(v['Name']); return n && !/^V\d+$/i.test(n) ? n : null })(),
      type: firstString(v['Тип']) ?? 'Вилла',
      bedrooms: numberOrNull(v['Комнаты']),
      houseM2: numberOrNull(v['Площадь']),
      landM2: numberOrNull(v['Земля']),
      priceUsd: numberOrNull(v['Цена']),
      // No per-unit sold flag exists in raw_villas (see gaps): a sold unit is
      // simply delisted. `Продано` only ever appears on the complex row.
      sold: salesStatus === 'Продано',
      url: firstString(v['SEO:Slug']) ? `/ru/villy/${firstString(v['SEO:Slug'])}` : null,
    }))
    .sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))
    .slice(0, MAX_UNITS_ROWS)
}

function metaLineFor(c: Omit<TplComplex, 'metaLine'>): string {
  const parts: string[] = []
  if (c.unitsCount) parts.push(`${c.unitsCount} ${plural(c.unitsCount, 'юнит', 'юнита', 'юнитов')}`)
  if (c.priceFromUsd) parts.push(`от ${fullUsd(c.priceFromUsd)}`)
  if (c.status === 'completed') parts.push(c.handoverYear ? `сдан в ${c.handoverYear}` : 'сдан')
  else if (c.handoverYear) parts.push(`сдача ${c.handoverYear}`)
  if (c.permit && c.permit !== 'нет') parts.push(c.permit)
  return parts.join(' · ')
}

function buildFaq(dev: TplDeveloper, complexes: TplComplex[]): TplFaq[] {
  const prices = complexes.flatMap(c => c.units.map(u => u.priceUsd)).filter((n): n is number => !!n)
  const beds = complexes.flatMap(c => c.units.map(u => u.bedrooms)).filter((n): n is number => !!n)
  const areas = complexes.flatMap(c => c.units.map(u => u.houseM2)).filter((n): n is number => !!n)
  const out: TplFaq[] = []

  if (prices.length) {
    out.push({
      q: `Сколько стоит объект у застройщика ${dev.name}?`,
      a: `Цены на объекты в продаже — от ${fullUsd(Math.min(...prices))} до ${fullUsd(Math.max(...prices))}. `
        + `В каталоге ${prices.length} ${plural(prices.length, 'юнит', 'юнита', 'юнитов')} с указанной ценой.`,
    })
  }
  if (beds.length && areas.length) {
    out.push({
      q: 'Какие площади и сколько спален доступны?',
      a: `От ${Math.min(...beds)} до ${Math.max(...beds)} спален, площадь дома — от ${Math.min(...areas)} до ${Math.max(...areas)} м².`,
    })
  }
  const leases = complexes.map(c => c.leaseYears).filter((n): n is number => !!n)
  if (leases.length) {
    out.push({
      q: 'Какой юридический статус покупки: leasehold или freehold?',
      a: `Проекты продаются в leasehold. Срок аренды земли — ${leases.length > 1 && Math.min(...leases) !== Math.max(...leases)
        ? `от ${Math.min(...leases)} до ${Math.max(...leases)} лет в зависимости от комплекса`
        : `${leases[0]} лет`}.`,
    })
  }
  if (dev.districts.length) {
    out.push({
      q: 'Где находятся проекты?',
      a: `${dev.districts.join(', ')} — ${plural(dev.districts.length, 'район', 'района', 'районов')} Бали. `
        + 'Точное расположение каждого комплекса и что рядом — на картах выше.',
    })
  }
  const mgmt = dev.bulletCards.find(c => c.key === 'management')?.items ?? []
  if (mgmt.length) {
    out.push({ q: 'Подходит ли это для аренды или для собственного проживания?', a: `Управляющая компания: ${mgmt.join('; ')}.` })
  }
  return out
}

/**
 * Every developer gets a hero, and it always comes from Supabase Storage.
 * Order: a complex photo, then any photo of a villa this developer sells,
 * then the developer's logo on a tinted plate, and finally a generated
 * placeholder. Airtable attachments are deliberately not in the chain —
 * those URLs answer 410 Gone since the base was retired.
 */
function resolveHero(
  devName: string,
  complexes: TplComplex[],
  villas: Row[],
  villaPhotoManifest: Record<string, string[]>,
  logo: string | null,
): { url: string | null; kind: TplDeveloper['heroKind'] } {
  const fromComplex = complexes.flatMap(c => c.photos)[0]
  if (fromComplex) return { url: fromComplex, kind: 'complex' }

  for (const v of villas) {
    if (!namesOf(v['Developer1']).some(d => sameDeveloper(d, devName))) continue
    const photo = asList(villaPhotoManifest[v.airtable_id as string])[0]
    if (photo) return { url: photo, kind: 'villa' }
  }

  if (logo) return { url: logo, kind: 'logo' }
  return { url: null, kind: 'placeholder' }
}

// ---------------------------------------------------------------- entry

export async function listPreviewDevelopers(): Promise<{ slug: string; name: string; complexes: number }[]> {
  const [{ data: devRows }, { data: cpxRows }] = await Promise.all([
    sb.from('raw_developers').select(projection(['Developer', 'SEO:Slug', 'Публикация'])).limit(400),
    sb.from('raw_complexes').select(projection(['Developer1'])).limit(500),
  ])
  const devs = unproject((devRows ?? []) as unknown as Row[], ['Developer', 'SEO:Slug', 'Публикация'])
  const cpx = unproject((cpxRows ?? []) as unknown as Row[], ['Developer1'])
  const counts = new Map<string, number>()
  for (const c of cpx) {
    for (const d of namesOf(c['Developer1'])) {
      const k = d.toLowerCase()
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
  }
  return devs
    .map(d => ({
      slug: firstString(d['SEO:Slug']) ?? '',
      name: firstString(d['Developer']) ?? '',
      complexes: counts.get((firstString(d['Developer']) ?? '').toLowerCase()) ?? 0,
    }))
    .filter(d => d.slug && d.name)
    .sort((a, b) => b.complexes - a.complexes || a.name.localeCompare(b.name, 'ru'))
}

/**
 * One cache slot per table. They must stay separate: a combined payload was
 * 2.26MB and silently blew past unstable_cache's 2MB ceiling, so nothing was
 * ever cached and every preview re-pulled 3000 villa rows (~60s a page).
 */
function cachedTable(name: string, fields: readonly string[], limit: number, tag: string, cols: readonly string[] = []) {
  return unstable_cache(
    async () => {
      const { data, error } = await sb.from(name).select(projection(fields, cols)).limit(limit)
      if (error) throw new Error(`${name}: ${error.message}`)
      const rows = unproject((data ?? []) as unknown as Row[], fields, cols)
      if (!rows.length) throw new Error(`${name} returned 0 rows — refusing to cache empty`)
      return rows
    },
    [`preview-tpl-${name}-v3`],
    { revalidate: 1800, tags: [tag] },
  )
}

// `logo_url` is a real column pointing at Supabase Storage. The Airtable `Logo`
// attachment inside `data` is dead — those URLs now answer 410 Gone.
const loadDevTable = cachedTable('raw_developers', DEV_FIELDS, 400, 'content:developers', ['logo_url'])
const loadCpxTable = cachedTable('raw_complexes', CPX_FIELDS, 500, 'content:complexes')
const loadVillaTable = cachedTable('raw_villas', VILLA_FIELDS, 3000, 'content:villas')

export async function loadDeveloperTemplateData(slug: string): Promise<DeveloperTemplateData | null> {
  const [devs, cpxAll, villas, photoManifest, villaPhotoManifest, placesFallback] = await Promise.all([
    loadDevTable(), loadCpxTable(), loadVillaTable(),
    loadManifest(PHOTO_MANIFEST_URL), loadManifest(VILLA_PHOTO_MANIFEST_URL), loadPlacesFallback(),
  ])
  const devRow = devs.find(d => firstString(d['SEO:Slug']) === slug)
  if (!devRow) return null

  const devName = firstString(devRow['Developer']) ?? slug
  // The card name carries a legal/brand suffix in brackets («LB Group
  // (LOYO&BONDAR)») that reads as noise in an H1. Only one developer of 114
  // has one; the full string still drives every lookup.
  const displayName = devName.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || devName
  const complexRows = cpxAll
    .filter(c => namesOf(c['Developer1']).some(d => sameDeveloper(d, devName)))

  const tplComplexes: TplComplex[] = await Promise.all(complexRows.map(async c => {
    const id = c.airtable_id as string
    const cslug = firstString(c['SEO:Slug']) ?? id
    const completed = firstString(c['Статус']) === 'Построен'
    const salesStatus = firstString(c['Статус продаж']) ?? ''
    const cname = firstString(c['Project']) ?? cslug
    const units = buildUnits(villas, cname, salesStatus)
    const progress = numberOrNull(c['Готовность'])
    const lat = numberOrNull(c['Geo']), lng = numberOrNull(c['Geo 2'])
    const prices = units.map(u => u.priceUsd).filter((n): n is number => !!n)

    // POI files are keyed by *villa* id, never by complex id — reuse any
    // listing that belongs to this complex as the geographic proxy.
    const villaIds = villasOfComplex(villas, cname)
      .slice(0, POI_PROBE_LIMIT)
      .map(v => v.airtable_id as string)
    const probed = await Promise.all(villaIds.map(vid => loadNearbyPlaces(vid)))
    const hit = probed.find(Boolean)
    const pois: TplPoi[] = hit ? flattenPois(hit) : []

    // Storage manifests only. The Airtable attachment arrays still sitting in
    // `data` ("Фотографии" / "Главное фото") are dead links — 410 Gone.
    //
    // The complex's own shots come first (renders and the master view), then
    // photos of the villas sold in it: the design wants five or more per
    // complex and only 85 of 197 have that on their own — folding the villa
    // galleries in takes it to 165.
    const ownPhotos = asList(photoManifest[id])
    const unitPhotos = villasOfComplex(villas, cname)
      .flatMap(v => asList(villaPhotoManifest[v.airtable_id as string]))
    // Where the gallery was too thin, a Google Places shot leads: it is the
    // single best image we could find for the complex.
    const place = placesFallback[id]
    const lead = place ? [`/api/place-photo?name=${encodeURIComponent(place.photoName)}`] : []
    const photos = [...new Set([...lead, ...ownPhotos, ...unitPhotos])].slice(0, MAX_GALLERY_PHOTOS)

    const base = {
      id,
      slug: cslug,
      name: cname,
      district: districtRu(firstString(c['Location 2'])) ?? firstString(c['Location 2']),
      status: (completed ? 'completed' : 'building') as 'building' | 'completed',
      statusLabel: salesStatus === 'Продано' ? 'сдан, всё продано' : completed ? 'сдан' : 'строится',
      unitsCount: numberOrNull(c['Total quantity of units']),
      priceFromUsd: prices.length ? Math.min(...prices) : null,
      handoverYear: firstString(c['Year of completion ']),
      progressPct: progress == null ? (completed ? 100 : null) : Math.round(progress * 100),
      permit: firstString(c['Разрешительные документы']),
      leaseYears: numberOrNull(c['Leasehold']),
      paymentPlan: parsePaymentPlan(c['Payment plan,%']),
      lede: firstString(c['Описание']) ?? firstString(c['ИИ Описание']),
      geo: lat != null && lng != null ? { lat, lng } : null,
      photos,
      photoCredit: place?.attribution ?? null,
      units,
      pois,
      url: `/ru/zhilye-kompleksy/${cslug}`,
      unitTypes: namesOf(c['Типы юнитов']),
    }
    return { ...base, metaLine: metaLineFor(base) }
  }))

  await attachPoiPhotos(tplComplexes)

  tplComplexes.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'building' ? -1 : 1
    return (b.progressPct ?? 0) - (a.progressPct ?? 0)
  })

  const bulletSpec = [
    { key: 'team', icon: '👷', title: 'Команда', field: 'Команда' },
    { key: 'business', icon: '🏗️', title: 'Бизнес и сервисы', field: 'Бизнес и сервисы' },
    { key: 'construction', icon: '🏡', title: 'Строительство и недвижимость', field: 'Строительство и недвижимость' },
    { key: 'reputation', icon: '🏅', title: 'Репутация и опыт', field: 'Репутация и опыт' },
    { key: 'management', icon: '🔑', title: 'Управляющая компания', field: 'Управляющая компания' },
  ] as const
  const bulletCards: BulletCard[] = bulletSpec.map(s => ({
    key: s.key, icon: s.icon, title: s.title, items: parseBullets(firstString(devRow[s.field])),
  }))

  const districts = [...new Set(tplComplexes.map(c => c.district).filter((d): d is string => !!d))]
  const logo = firstString(devRow['logo_url'])
  const hero = resolveHero(devName, tplComplexes, villas, villaPhotoManifest, logo)

  const dev: TplDeveloper = {
    slug,
    name: displayName,
    tagline: firstString(devRow['SEO:Description']),
    description: firstString(devRow['AI Описание']) ?? firstString(devRow['Описание ИИ']),
    heroPhoto: hero.url,
    heroKind: hero.kind,
    logo,
    districts,
    projectsForSale: tplComplexes.filter(c => c.status === 'building').length,
    completedCount: tplComplexes.filter(c => c.status === 'completed').length,
    unitsTotal: tplComplexes.reduce((s, c) => s + (c.unitsCount ?? 0), 0),
    metrics: extractMetrics(bulletCards, tplComplexes),
    bulletCards,
    website: firstString(devRow["Link on developer's website"]),
    rating: numberOrNull(devRow['Общий рейтинг']),
  }

  const [managers, videos, allNews, allEvents, allPromo] = await Promise.all([
    loadManagersFresh(devName),
    loadVideosByDeveloperWithComplexes(slug, tplComplexes.map(c => c.slug), 12, 'ru'),
    loadAllNews('ru'),
    loadAllEvents('ru'),
    loadAllPromo('ru'),
  ])
  const byDev = <T extends { developers?: { name: string; slug: string | null }[] }>(items: T[]): T[] =>
    items.filter(i => asList(i.developers).some(d => d.slug === slug || d.name?.toLowerCase() === devName.toLowerCase()))

  const news = byDev(allNews).slice(0, 12)
  const events = byDev(allEvents).slice(0, 12)
  const promos = byDev(allPromo).slice(0, 12)

  const gaps: Gap[] = []
  collectGaps(gaps, dev, tplComplexes, { managers, videos, news, events, promos })

  return { dev, complexes: tplComplexes, managers, videos, news, events, promos, faq: buildFaq(dev, tplComplexes), gaps }
}

/**
 * POIs come from the nearby files, which carry no imagery. `bali_places`
 * already holds the Google Places payload for 13.6k spots, including photo
 * resource names — one lookup for the whole page, keyed by place id.
 */
async function attachPoiPhotos(complexes: TplComplex[]): Promise<void> {
  const ids = [...new Set(complexes.flatMap(c => c.pois.map(p => p.id)))].filter(Boolean)
  if (!ids.length) return
  const { data, error } = await sb.from('bali_places').select('id, data->photos').in('id', ids)
  if (error || !data) return
  const byId = new Map<string, string>()
  for (const row of data as unknown as { id: string; photos: unknown }[]) {
    const first = Array.isArray(row.photos) ? row.photos[0] : null
    const name = first && typeof first === 'object' && 'name' in first
      ? (first as { name: unknown }).name : null
    if (typeof name === 'string') byId.set(row.id, name)
  }
  for (const c of complexes) {
    for (const p of c.pois) p.photoName = byId.get(p.id) ?? null
  }
}

// ---------------------------------------------------------------- gaps

function collectGaps(
  gaps: Gap[],
  dev: TplDeveloper,
  complexes: TplComplex[],
  rel: { managers: ManagerItem[]; videos: VideoItem[]; news: NewsItem[]; events: EventItem[]; promos: PromoItem[] },
): void {
  const push = (block: string, field: string, status: GapStatus, note: string) =>
    gaps.push({ block, field, status, note })
  const n = complexes.length || 1
  const withPhotos = complexes.filter(c => c.photos.length >= PHOTOS_WANTED_PER_COMPLEX).length
  const withGeo = complexes.filter(c => c.geo).length
  const withUnits = complexes.filter(c => c.units.length).length
  const withPois = complexes.filter(c => c.pois.length).length
  const allOr = (k: number, ok: GapStatus = 'ok'): GapStatus => (k >= n ? ok : k > 0 ? 'partial' : 'missing')

  push('hero', 'name', 'ok', 'raw_developers.data→Developer')
  push('hero', 'tagline', dev.tagline ? 'partial' : 'missing',
    'поля-слогана нет: подставлен SEO:Description — он написан под сниппет выдачи, а не под H1')
  push('hero', 'projects_for_sale_count / completed_count', 'derived', 'считается из raw_complexes.Статус')
  push('hero', 'units_total', dev.unitsTotal ? 'derived' : 'missing', 'сумма raw_complexes.«Total quantity of units»')
  push('hero', 'districts[]', dev.districts.length ? 'derived' : 'missing', 'уникальные Location 2 комплексов через districtRu()')
  push('hero', 'hero_photo', dev.heroPhoto ? 'partial' : 'missing',
    'у застройщика нет своего hero-кадра: берётся первое фото первого комплекса')

  push('managers', 'developer_managers[]', rel.managers.length ? 'partial' : 'missing',
    rel.managers.length
      ? `${rel.managers.length} в managers/_managers.json; со стороны застройщика (org = «Застройщик») — `
        + `${rel.managers.filter(m => m.org === 'Застройщик').length}`
      : 'ни один менеджер в managers/_managers.json не привязан к этому застройщику')
  push('managers', 'department',
    rel.managers.some(m => m.department) ? 'ok' : 'partial',
    rel.managers.some(m => m.department)
      ? 'поле «Отдел» в манифесте менеджеров'
      : 'поля «Отдел» и «Чей менеджер» заведены в /admin/data → Менеджеры, но у этого застройщика ещё не заполнены')
  push('managers', 'lead_form_id', 'missing', 'нет привязки карточки к конкретной лид-форме')

  push('developer_stats', 'years_on_market · portfolio_volume_usd · units_under_construction · units_renting · team_size · builders_count',
    dev.metrics.parsedCount >= 6 ? 'derived' : dev.metrics.parsedCount ? 'partial' : 'missing',
    `числовых полей нет — распарсено регулярками из буллет-текста, распознано ${dev.metrics.parsedCount}/6`)
  push('developer_stats', 'mgmt_company_type',
    dev.bulletCards.find(c => c.key === 'management')?.items.length ? 'partial' : 'missing',
    'есть текст «Собственная», но нет enum own | outsource')
  push('developer_stats', 'legal_entity / nib', 'missing', 'юрлица и NIB нет ни в одном поле raw_developers')
  push('developer_stats', 'financing', 'missing', 'нет поля источника финансирования (свои средства / кредит)')
  push('developer_stats', 'payment_plan', complexes.some(c => c.paymentPlan.length) ? 'ok' : 'missing',
    'raw_complexes.«Payment plan,%» — лежит на комплексе, а не на застройщике')

  push('about', 'description_ru', dev.description ? 'ok' : 'missing', 'raw_developers.«AI Описание»')
  push('about', 'hq_address / founder', 'missing',
    'отдельных полей нет — адрес и основатель упомянуты только внутри текста AI-описания')
  push('about', 'management_services[]',
    dev.bulletCards.find(c => c.key === 'management')?.items.length ? 'ok' : 'missing',
    'буллеты поля «Управляющая компания»')

  push('projects_carousel', 'name · district · status · units_count · permit · handover', 'ok', 'raw_complexes')
  push('projects_carousel', 'construction_progress_pct', allOr(complexes.filter(c => c.progressPct != null).length),
    'raw_complexes.«Готовность» (доля 0..1); по всей базе заполнено у 141/197 комплексов')
  push('projects_carousel', 'price_from_usd', allOr(complexes.filter(c => c.priceFromUsd).length, 'derived'),
    'min(Цена) по виллам комплекса — у комплексов без листингов цены нет')
  push('projects_carousel', 'photos[] для hover-слайдшоу', allOr(withPhotos),
    `дизайну нужно ≥${PHOTOS_WANTED_PER_COMPLEX} фото на комплекс; собрано у ${withPhotos}/${complexes.length} `
    + '(фото комплекса + фото его вилл из Storage)')

  push('complex_detail', 'units[] (type · bedrooms · house_m2 · land_m2 · price)', allOr(withUnits),
    `собирается из raw_villas по связи «Комплекс»; есть у ${withUnits}/${complexes.length} комплексов`)
  push('complex_detail', 'units[].sold', 'missing',
    'в raw_villas статус только Строится / Построен — проданный юнит просто удаляется из каталога')
  push('complex_detail', 'lede', allOr(complexes.filter(c => c.lede).length), 'raw_complexes.«Описание» / «ИИ Описание»')
  push('complex_detail', 'land_lease_years', allOr(complexes.filter(c => c.leaseYears).length), 'raw_complexes.Leasehold')
  push('complex_detail', 'land_lease_extension_years', 'missing', 'поля «продление лиза» нет')
  push('complex_detail', 'permit.number', 'missing', 'есть только тип (PBG / SLF), номера разрешения нет')
  push('complex_detail', 'handover_quarter', 'partial', 'есть только год («Year of completion»), квартала нет')
  push('complex_detail', 'geo', allOr(withGeo), `raw_complexes.Geo / Geo 2 — ${withGeo}/${complexes.length}`)
  push('complex_detail', 'nearby_pois[]', allOr(withPois),
    `POI лежат в competitors/_nearby_places по id ВИЛЛЫ, а не комплекса; подтянулись у ${withPois}/${complexes.length}`)
  push('complex_detail', 'nearby_pois[].walk_min', 'derived', `посчитано из distanceKm при ${WALK_METRES_PER_MIN} м/мин`)
  push('complex_detail', 'google_reviews_count (вес теплокарты)', withPois ? 'ok' : 'missing', 'поле reviews в nearby-файле')
  push('complex_detail', 'amenities[]', 'missing', 'списка удобств комплекса в базе нет')

  push('complex_detail_completed', 'sold_pct / occupancy_pct', 'missing',
    'ни процента продаж, ни загрузки в базе нет — в дизайне это крупные 100% и 85%')
  push('complex_detail_completed', 'handover_date', 'partial', 'есть только год сдачи, точной даты нет')
  push('complex_detail_completed', 'timeline[]', 'missing', 'таблицы вех строительства не существует')

  push('videos', 'youtube_id / title', rel.videos.length ? 'ok' : 'missing', `feeds/_videos.json — ${rel.videos.length} шт.`)
  push('videos', 'thumbnail_url', 'derived', 'превью строится из youtube-id (img.youtube.com)')
  push('news', 'posts[]', rel.news.length ? 'ok' : 'missing', `news/_news.json — ${rel.news.length} шт.`)
  push('events_promos', 'events[] + promos[]', rel.events.length + rel.promos.length ? 'ok' : 'missing',
    `events ${rel.events.length} + promo ${rel.promos.length}`)
  push('faq', 'question / answer', 'derived', 'генерируется из юнитов, лиза и районов — отдельной таблицы FAQ нет')
  push('related_links', 'label / url', 'derived', 'строится из районов комплексов')
}
