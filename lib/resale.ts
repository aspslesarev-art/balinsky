import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { cdnManifestUrl } from '@/lib/photo-cdn'
import { districtRu } from '@/lib/district-ru'
import { listByStatus } from '@/lib/agent-listings/store'
import type { VillaCardData } from '@/components/VillaCard'
import type { ApartmentCardData } from '@/components/ApartmentCard'

// Вторичный рынок в одном списке. Источников два, и оба существовали
// независимо друг от друга:
//   1. каталог — юниты raw_villas / raw_apartments, у которых «Тип сделки»
//      стоит «Перепродажа» или «Вторичка». Они на сайте давно, с бейджем
//      «Перепродажа» и контактом продавца вместо менеджера застройщика;
//   2. объекты, которые агенты добавляют сами (agent_listings, одобренные).
// Раздел /ru/pereprodazha показывает и то и другое одним каталогом.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const VILLA_MANIFEST = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const APT_MANIFEST = `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

/** Значения «Тип сделки», которые означают вторичку. */
const RESALE_DEALS = ['Перепродажа', 'Вторичка']

export type ResaleUnit =
  | ({ kind: 'villa'; id: string } & VillaCardData)
  | ({ kind: 'apartment'; id: string } & ApartmentCardData)

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

// В части строк поле-ссылка на район хранит id записи, а не название
// («Location» у апартаментов — link-поле). Такой «район» в фильтр пускать
// нельзя: пользователь увидит recNChZ… вместо Переренана.
function cleanDistrict(v: string | null): string | null {
  if (!v || /^(rec[a-zA-Z0-9]{8,}|adm_[a-z0-9]+)$/.test(v)) return null
  return districtRu(v) ?? v
}

const dealOf = (v: string | null): 'resale' | 'secondary' =>
  v === 'Вторичка' ? 'secondary' : 'resale'

async function manifest(url: string): Promise<Record<string, string[]>> {
  try {
    const r = await fetch(cdnManifestUrl(url), { next: { revalidate: 600 } })
    if (!r.ok) return {}
    const j = await r.json()
    return j && typeof j === 'object' ? j : {}
  } catch {
    return {}
  }
}

const VILLA_SELECT = `airtable_id,
  title:data->"SEO:Title", slug:data->"SEO:Slug", published:data->"Опубликовать",
  deal:data->"Тип сделки", price:data->price, bedrooms:data->"Комнаты",
  area:data->"Площадь", land:data->"Земля", district:data->"Location 2",
  district_alt:data->Location, status:data->"Статус"`

const APT_SELECT = `airtable_id,
  title:data->"SEO:Title", slug:data->"SEO:Slug", published:data->"Опубликовать",
  deal:data->"Тип сделки", price:data->price_usd, bedrooms:data->"Комнаты",
  area:data->"Площадь", floor:data->"Этаж", district:data->"Location filter",
  district_alt:data->Location`

// Фильтр по «Тип сделки» уходит в базу (in.(…)), а не отбирается в JS после
// полной выгрузки: сканы raw_* по всему JSONB — известная дыра по egress.
const loadCatalogResale = unstable_cache(
  async (): Promise<ResaleUnit[]> => {
    const dealFilter = `(${RESALE_DEALS.map(d => `"${d}"`).join(',')})`
    const [villas, apts, villaPhotos, aptPhotos] = await Promise.all([
      sb.from('raw_villas').select(VILLA_SELECT).filter('data->>Тип сделки', 'in', dealFilter).limit(500),
      sb.from('raw_apartments').select(APT_SELECT).filter('data->>Тип сделки', 'in', dealFilter).limit(500),
      manifest(VILLA_MANIFEST),
      manifest(APT_MANIFEST),
    ])

    const units: ResaleUnit[] = []

    for (const r of ((villas.data ?? []) as unknown as Record<string, unknown>[])) {
      if (r.published !== true) continue
      const slug = str(r.slug)
      const title = str(r.title)
      if (!slug || slug.startsWith('-') || !title) continue
      const district = cleanDistrict(str(r.district)) ?? cleanDistrict(str(r.district_alt))
      units.push({
        kind: 'villa',
        id: String(r.airtable_id),
        slug,
        title: title.replace(/\s*\|\s*Balinsky\s*$/i, '').trim(),
        priceUsd: num(r.price),
        bedrooms: num(r.bedrooms),
        area: num(r.area),
        land: num(r.land),
        district,
        status: str(r.status),
        photos: villaPhotos[String(r.airtable_id)] ?? [],
        dealType: dealOf(str(r.deal)),
      })
    }

    for (const r of ((apts.data ?? []) as unknown as Record<string, unknown>[])) {
      if (r.published !== true) continue
      const slug = str(r.slug)
      const title = str(r.title)
      if (!slug || slug.startsWith('-') || !title) continue
      const district = cleanDistrict(str(r.district)) ?? cleanDistrict(str(r.district_alt))
      units.push({
        kind: 'apartment',
        id: String(r.airtable_id),
        slug,
        title: title.replace(/\s*\|\s*Balinsky\s*$/i, '').trim(),
        priceUsd: num(r.price),
        bedrooms: num(r.bedrooms),
        area: num(r.area),
        floor: str(r.floor),
        district,
        photos: aptPhotos[String(r.airtable_id)] ?? [],
        dealType: dealOf(str(r.deal)),
      })
    }

    return units
  },
  ['resale-catalog-v1'],
  // Теги обязательны: без них правка юнита в админке не доезжает до раздела
  // весь TTL — ровно та же ловушка, что в lib/complex-units.ts.
  { revalidate: 600, tags: ['content:villas', 'content:apartments'] },
)

/** Объекты агентов той же формы, что карточки каталога. */
async function loadAgentResale(): Promise<ResaleUnit[]> {
  const listings = await listByStatus('approved', 300)
  return listings.map((l): ResaleUnit => {
    const d = l.data
    const district = cleanDistrict(str(d['Location 2']))
      ?? cleanDistrict(str(d['Location']))
      ?? cleanDistrict(str(d['Location filter']))
    const common = {
      id: l.id,
      slug: l.slug,
      title: l.title,
      priceUsd: l.priceUsd,
      bedrooms: num(d['Комнаты']),
      area: num(d['Площадь']),
      photos: l.photos,
      dealType: 'resale' as const,
      detailHref: `/ru/pereprodazha/o/${l.slug}`,
    }
    return l.kind === 'villa'
      ? { ...common, kind: 'villa', land: num(d['Земля']), district, status: str(d['Статус']) }
      : { ...common, kind: 'apartment', floor: str(d['Этаж']), district }
  })
}

export async function loadResaleUnits(): Promise<ResaleUnit[]> {
  const [catalog, agents] = await Promise.all([loadCatalogResale(), loadAgentResale()])
  // Объекты агентов сверху: они появляются реже и это самое свежее в разделе.
  return [...agents, ...catalog]
}
