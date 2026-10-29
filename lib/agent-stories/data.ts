// Данные для сторис агента (3 картинки 1080×1920, которые бот присылает по
// кнопке «Сторис для агента»). Только факты карточки: цена, площадь, спальни,
// район, лизхолд, готовность, фото. Ни названия ЖК, ни застройщика, ни модели
// доходности — агент ставит сторис от своего имени, и по картинке объект
// не должен находиться.

import { createClient } from '@supabase/supabase-js'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { curatePhotos } from '@/lib/listing-photos'
import { loadListingVision } from '@/lib/listing-features'
import { districtRu } from '@/lib/district-ru'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { distanceKm } from '@/lib/competitor-utils'

export type StoryKind = 'villa' | 'apartment' | 'complex'

export type StoryData = {
  kind: StoryKind
  id: string
  district: string | null
  priceUsd: number | null
  priceFrom: boolean
  bedrooms: number | null
  area: number | null
  land: number | null
  leaseYears: number | null
  ready: boolean
  completionYear: string | null
  airportKm: number | null
  unitTypes: string[]
  photos: string[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

const TABLE: Record<StoryKind, string> = { villa: 'raw_villas', apartment: 'raw_apartments', complex: 'raw_complexes' }
const BUCKET: Record<StoryKind, string> = { villa: 'villa-photos', apartment: 'apartment-photos', complex: 'complex-photos' }

const AIRPORT_LAT = -8.7467
const AIRPORT_LNG = 115.1667

type Data = Record<string, unknown>

function first(v: unknown): unknown {
  if (Array.isArray(v)) return v.length ? first(v[0]) : null
  if (v && typeof v === 'object' && 'value' in v) return first((v as { value: unknown }).value)
  return v
}
function str(v: unknown): string | null {
  const x = first(v)
  if (typeof x === 'string') return x.trim() || null
  if (typeof x === 'number') return String(x)
  return null
}
function num(v: unknown): number | null {
  const x = first(v)
  if (typeof x === 'number') return Number.isFinite(x) ? x : null
  if (typeof x === 'string') {
    const n = Number(x.replace(/[^\d.,-]/g, '').replace(',', '.'))
    return Number.isFinite(n) && x.trim() !== '' ? n : null
  }
  return null
}
function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter((s): s is string => !!s)
  const s = str(v)
  return s ? s.split(/\s*,\s*/).filter(Boolean) : []
}

async function loadManifest(kind: StoryKind): Promise<Record<string, string[]>> {
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET[kind]}/_manifest.json`
  const r = await fetch(cdnManifestUrl(url, 600), { next: { revalidate: 604800, tags: [`content:${kind === 'complex' ? 'complexes' : kind + 's'}`] } })
  if (!r.ok) throw new Error(`${kind} manifest: ${r.status}`)
  return (await r.json()) as Record<string, string[]>
}

// Цена «от» для ЖК: в самой записи комплекса цена почти всегда пустая,
// юниты привязаны по названию — как на странице ЖК.
async function minUnitPrice(projectName: string): Promise<number | null> {
  if (projectName.length < 3) return null
  const needle = `%${projectName.replace(/[%_]/g, '\\$&')}%`
  const [v, a] = await Promise.all([
    sb.from('raw_villas').select('p:data->price, c:data->"Цена", pub:data->"Опубликовать"').ilike('data->>"Комплекс 1"', needle).limit(200),
    sb.from('raw_apartments').select('p:data->price_usd, c:data->"Цена", pub:data->"Опубликовать"').ilike('data->>"SEO:Title"', needle).limit(200),
  ])
  if (v.error) throw v.error
  if (a.error) throw a.error
  const prices = [...(v.data ?? []), ...(a.data ?? [])]
    .filter(r => r.pub === true)
    .map(r => num(r.p) ?? num(r.c))
    .filter((n): n is number => n != null && n > 1000)
  return prices.length ? Math.min(...prices) : null
}

export async function loadStoryData(kind: StoryKind, id: string): Promise<StoryData | null> {
  const { data: row, error } = await sb.from(TABLE[kind]).select('airtable_id, data').eq('airtable_id', id).maybeSingle()
  if (error) throw error
  if (!row) return null
  const d = row.data as Data

  if (isHiddenDeveloper(str(d['Developer1']), str(d['Developer']), str(d['Варианты поиска застройщика']))) return null
  if (kind !== 'complex' && d['Опубликовать'] !== true) return null

  const districtRaw = kind === 'apartment'
    ? str(d['Location filter'])
    : str(d['Location 2']) ?? str(d['Location'])
  const lat = num(d['Geo'])
  const lng = num(d['Geo 2'])
  const status = (str(d['Статус']) ?? '').toLowerCase()

  const [manifest, vision] = await Promise.all([
    loadManifest(kind),
    loadListingVision(kind, id).catch(() => null),
  ])
  const photos = curatePhotos(manifest[id] ?? [], vision).photos

  let priceUsd = kind === 'villa'
    ? num(d['price']) ?? num(d['Цена'])
    : num(d['price_usd']) ?? num(d['Цена'])
  let priceFrom = false
  if (kind === 'complex') {
    priceFrom = true
    const project = str(d['Project'])
    priceUsd = (project ? await minUnitPrice(project) : null) ?? priceUsd
  }

  return {
    kind,
    id,
    district: districtRu(districtRaw) ?? districtRaw,
    priceUsd,
    priceFrom,
    bedrooms: kind === 'complex' ? null : num(d['Комнаты']),
    area: kind === 'complex' ? null : num(d['Площадь']),
    land: kind === 'villa' ? num(d['Земля']) : null,
    leaseYears: num(d['Leasehold']) ?? num(d['Leashold']),
    ready: /построен|сдан|готов/.test(status),
    completionYear: str(d['Year of completion']) ?? str(d['Year of completion ']),
    airportKm: lat != null && lng != null ? distanceKm(lat, lng, AIRPORT_LAT, AIRPORT_LNG) : null,
    unitTypes: kind === 'complex' ? strList(d['Типы юнитов']) : [],
    photos,
  }
}
