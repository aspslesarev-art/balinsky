import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { cdnManifestUrl, cdnRewrite } from '@/lib/photo-cdn'
import type { ListingKind } from './types'

// Мост между формой агента и каталогом: поиск ЖК, юниты выбранного ЖК и
// перенос фактов юнита в черновик.
//
// Egress: везде узкая JSON-проекция и DB-side ilike, как в lib/complex-units.ts.
// Полный скан data по 719 апартаментам стоит дорого и в бюджет страницы формы
// не помещается.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

const MANIFEST: Record<ListingKind, string> = {
  villa: `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`,
  apartment: `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`,
}

const TABLE: Record<ListingKind, string> = {
  villa: 'raw_villas',
  apartment: 'raw_apartments',
}

function str(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return str(v[0])
  if (v && typeof v === 'object' && 'value' in v) return str((v as { value: unknown }).value)
  return null
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return num(v[0])
  return null
}

async function photosOf(kind: ListingKind, unitId: string): Promise<string[]> {
  try {
    const r = await fetch(cdnManifestUrl(MANIFEST[kind]), { next: { revalidate: 600 } })
    if (!r.ok) return []
    const j = (await r.json()) as Record<string, string[]>
    const urls = Array.isArray(j?.[unitId]) ? j[unitId] : []
    return urls.map(u => cdnRewrite(u) ?? u).slice(0, 20)
  } catch {
    return []
  }
}

// ------------------------------------------------------------------- ЖК

export type ComplexOption = { id: string; name: string; district: string | null }

export async function searchComplexes(q: string, limit = 20): Promise<ComplexOption[]> {
  const term = q.trim()
  if (term.length < 2) return []
  const needle = `%${term.replace(/[%_]/g, '\\$&')}%`
  const { data } = await sb.from('raw_complexes')
    .select('airtable_id, name:data->"Project", district:data->"Location 2", district_alt:data->Location, published:data->"Опубликовать"')
    .ilike('data->>Project', needle)
    .limit(limit)
  return ((data ?? []) as Record<string, unknown>[])
    .filter(r => r.published === true)
    .map(r => ({
      id: String(r.airtable_id),
      name: str(r.name) ?? '',
      district: str(r.district) ?? str(r.district_alt),
    }))
    .filter(c => c.name)
}

export async function complexNameById(id: string): Promise<string | null> {
  const { data } = await sb.from('raw_complexes')
    .select('name:data->"Project"').eq('airtable_id', id).maybeSingle()
  return str((data as Record<string, unknown> | null)?.name)
}

// ---------------------------------------------------------------- юниты

export type UnitOption = {
  id: string
  title: string
  rooms: number | null
  area: number | null
  priceUsd: number | null
}

const UNIT_SELECT: Record<ListingKind, string> = {
  villa: 'airtable_id, title:data->"SEO:Title", published:data->"Опубликовать", rooms:data->"Комнаты", area:data->"Площадь", price:data->price, complex:data->"Комплекс 1"',
  apartment: 'airtable_id, title:data->"SEO:Title", published:data->"Опубликовать", rooms:data->"Комнаты", area:data->"Площадь", price:data->price_usd, complex:data->"Комплекс 1"',
}

/** Опубликованные юниты ЖК — по имени комплекса, как это делает lib/complex-units.ts. */
export async function listComplexUnits(kind: ListingKind, complexName: string): Promise<UnitOption[]> {
  const name = complexName.trim()
  if (name.length < 3) return []
  const needle = `%${name.replace(/[%_]/g, '\\$&')}%`
  const [byTitle, byLink] = await Promise.all([
    sb.from(TABLE[kind]).select(UNIT_SELECT[kind]).ilike('data->>"SEO:Title"', needle).limit(200),
    sb.from(TABLE[kind]).select(UNIT_SELECT[kind]).ilike('data->>"Комплекс 1"', needle).limit(200),
  ])
  const byId = new Map<string, Record<string, unknown>>()
  for (const batch of [byTitle.data, byLink.data]) {
    for (const row of (batch ?? []) as unknown as Record<string, unknown>[]) {
      byId.set(String(row.airtable_id), row)
    }
  }
  return [...byId.values()]
    .filter(r => r.published === true)
    .map(r => ({
      id: String(r.airtable_id),
      title: (str(r.title) ?? '').replace(/\s*\|\s*Balinsky\s*$/i, '').trim(),
      rooms: num(r.rooms),
      area: num(r.area),
      priceUsd: num(r.price),
    }))
    .filter(u => u.title)
    .sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))
}

// Поля, которые переносятся из карточки каталога в объект агента. Имена — те
// же, что в raw_*, чтобы публичная карточка читала их одними хелперами.
const CARRY: Record<ListingKind, string[]> = {
  villa: ['Комнаты', 'Площадь', 'Земля', 'Leasehold', 'Разрешение', 'Year of completion',
    'Статус', 'Location', 'Location 2', 'Geo', 'Geo 2', 'Type', 'Тип сделки',
    'Комплекс 1', 'Developer1', 'Land color'],
  apartment: ['Комнаты', 'Площадь', 'Этаж', 'Leasehold', 'Разрешение', 'Year of completion',
    'Статус', 'Location', 'Location filter', 'Geo', 'Geo 2', 'Тип сделки',
    'Комплекс 1', 'Developer1', 'Land color'],
}

/** Slug карточки каталога — нужен для canonical со страницы агента на оригинал. */
export async function unitSlug(kind: ListingKind, unitId: string): Promise<string | null> {
  const { data } = await sb.from(TABLE[kind])
    .select('slug:data->"SEO:Slug"').eq('airtable_id', unitId).maybeSingle()
  return str((data as Record<string, unknown> | null)?.slug)
}

export type UnitFacts = {
  title: string
  data: Record<string, unknown>
  photos: string[]
  priceUsd: number | null
}

/** Факты юнита каталога — то, что подставляется в форму, когда агент выбрал существующий юнит. */
export async function unitFacts(kind: ListingKind, unitId: string): Promise<UnitFacts | null> {
  const keys = CARRY[kind]
  const select = [
    'airtable_id',
    'title:data->"SEO:Title"',
    kind === 'villa' ? 'price:data->price' : 'price:data->price_usd',
    'published:data->"Опубликовать"',
    ...keys.map((k, i) => `f${i}:data->"${k}"`),
  ].join(',')

  const { data } = await sb.from(TABLE[kind]).select(select).eq('airtable_id', unitId).maybeSingle()
  const row = data as Record<string, unknown> | null
  if (!row || row.published !== true) return null

  const facts: Record<string, unknown> = {}
  keys.forEach((k, i) => {
    const v = row[`f${i}`]
    if (v !== null && v !== undefined && v !== '') facts[k] = v
  })

  return {
    title: (str(row.title) ?? '').replace(/\s*\|\s*Balinsky\s*$/i, '').trim(),
    data: facts,
    photos: await photosOf(kind, unitId),
    priceUsd: num(row.price),
  }
}
