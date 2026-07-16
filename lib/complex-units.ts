import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import type { Lang } from '@/lib/i18n'
import type { VillaCardData } from '@/components/VillaCard'
import type { ApartmentCardData } from '@/components/ApartmentCard'

// Shared "units that belong to a complex" loader. Extracted so news / promo /
// event detail pages can surface the same unit cards the complex page shows,
// using the identical egress-safe approach: slim JSON projection + a DB-side
// ilike on SEO:Title (never a full-table JSONB scan). Kept intentionally lean
// (a compact related-strip), not the full complex-page treatment.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const APT_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`
const VILLA_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

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
    const n = Number(v.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

export type ContentUnit =
  | (ApartmentCardData & { id: string; kind: 'apartment' })
  | (VillaCardData & { id: string; kind: 'villa' })

type AptRow = {
  airtable_id: string
  title: string | null
  title_en: string | null
  slug: string | null
  published: boolean | null
  price_usd: number | null
  price_rub: number | null
  bedrooms: number | null
  area: number | null
  floor: string | null
}

type VillaRow = {
  airtable_id: string
  title: string | null
  title_en: string | null
  slug: string | null
  published: boolean | null
  price_usd: number | null
  price_rub: number | null
  bedrooms: string | null
  area: number | null
  land: number | null
  district: string | null
  district_alt: string | null
  status: string | null
}

async function loadManifest(url: string): Promise<Record<string, string[]>> {
  try {
    const r = await fetch(cdnManifestUrl(url, 600))
    return r.ok ? ((await r.json()) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

async function loadAptRows(complexName: string): Promise<AptRow[]> {
  const { data, error } = await sb
    .from('raw_apartments')
    .select(`
      airtable_id,
      title:data->"SEO:Title",
      title_en:data->"SEO:Title EN",
      slug:data->"SEO:Slug",
      published:data->"Опубликовать",
      price_usd:data->price_usd,
      price_rub:data->"Цена",
      bedrooms:data->"Комнаты",
      area:data->"Площадь",
      floor:data->"Этаж"
    `)
    .ilike(`data->>"SEO:Title"`, `%${complexName.replace(/[%_]/g, '\\$&')}%`)
    .limit(200)
  if (error || !data) return []
  return data as AptRow[]
}

async function loadVillaRows(complexName: string): Promise<VillaRow[]> {
  const { data, error } = await sb
    .from('raw_villas')
    .select(`
      airtable_id,
      title:data->"SEO:Title",
      title_en:data->"SEO:Title EN",
      slug:data->"SEO:Slug",
      published:data->"Опубликовать",
      price_usd:data->price,
      price_rub:data->"Цена",
      bedrooms:data->"Комнаты",
      area:data->"Площадь",
      land:data->"Земля",
      district:data->"Location 2",
      district_alt:data->Location,
      status:data->"Статус"
    `)
    .ilike(`data->>"SEO:Title"`, `%${complexName.replace(/[%_]/g, '\\$&')}%`)
    .limit(200)
  if (error || !data) return []
  return data as VillaRow[]
}

// Cached per (complexName, lang): the DB reads + manifest fetches happen at most
// once per 10 min per complex, shared across every content page that references
// it. Returns card-ready units sorted cheapest-first.
const loadUnitsCached = unstable_cache(
  async (complexName: string, lang: Lang): Promise<ContentUnit[]> => {
    const [aptRows, villaRows, aptManifest, villaManifest] = await Promise.all([
      loadAptRows(complexName),
      loadVillaRows(complexName),
      loadManifest(APT_PHOTO_MANIFEST_URL),
      loadManifest(VILLA_PHOTO_MANIFEST_URL),
    ])

    const units: ContentUnit[] = []

    const seenApt = new Set<string>()
    for (const r of aptRows) {
      if (r.published !== true) continue
      if (!r.title || !r.slug || r.slug.startsWith('-')) continue
      if (seenApt.has(r.slug)) continue
      seenApt.add(r.slug)
      const titleSource = (lang !== 'ru' ? firstString(r.title_en) : null) ?? r.title
      const title = titleSource.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
      units.push({
        kind: 'apartment',
        id: r.airtable_id,
        slug: r.slug,
        title,
        priceUsd: r.price_usd ?? r.price_rub,
        bedrooms: r.bedrooms,
        area: r.area,
        floor: r.floor,
        photos: aptManifest[r.airtable_id] ?? [],
      })
    }

    const seenVilla = new Set<string>()
    for (const r of villaRows) {
      if (r.published !== true) continue
      if (!r.title || !r.slug || r.slug.startsWith('-')) continue
      if (seenVilla.has(r.airtable_id)) continue
      seenVilla.add(r.airtable_id)
      const titleSource = (lang !== 'ru' ? firstString(r.title_en) : null) ?? r.title
      const title = titleSource.replace(/\s*\|\s*Balinsky\s*$/i, '').trim()
      units.push({
        kind: 'villa',
        id: r.airtable_id,
        slug: r.slug,
        title,
        priceUsd: r.price_usd ?? r.price_rub,
        bedrooms: numberOrNull(r.bedrooms),
        area: r.area,
        land: r.land,
        district: r.district ?? r.district_alt,
        status: r.status,
        photos: villaManifest[r.airtable_id] ?? [],
      })
    }

    units.sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))
    return units
  },
  ['content-complex-units-v1'],
  { revalidate: 600 },
)

/**
 * Published villa + apartment units whose SEO:Title contains `complexName`.
 * Pass the canonical complex `Project` name (resolve it via complexNameBySlug
 * when you only have a slug) — a developer name won't match units reliably.
 */
export async function loadUnitsForComplex(
  complexName: string | null | undefined,
  lang: Lang = 'ru',
  limit = 6,
): Promise<ContentUnit[]> {
  if (!complexName || complexName.trim().length < 3) return []
  const units = await loadUnitsCached(complexName.trim(), lang)
  return units.slice(0, limit)
}
