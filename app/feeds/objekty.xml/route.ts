import { createClient } from '@supabase/supabase-js'
import { firstString, numberOrNull } from '@/app/ru/villy/_lib'
import { buildVillaDescription } from '@/lib/feeds/villa-description'
import { FEED_SELLER } from '@/lib/feeds/seller'
import { cdnManifestUrl, cdnRewriteManifest } from '@/lib/photo-cdn'

// Партнёрский XML-фид вилл для realting.com — шаблон «Недвижимость Realting»
// (<objects> v2.0, сделки купли-продажи). Живая замена статичному файлу
// scripts/out/villas-aggregator.xml, который был залит в Storage 28.04.2026 и
// с тех пор не обновлялся (портал показывал статус «Данные не обновляются»,
// а цены на площадке отставали на месяцы).
//
// Три отличия от того файла, каждое было потерей:
//   1. <external_url> — обратная ссылка на карточку balinsky.info. В статичном
//      файле её не было вовсе: контент отдавали, ссылку не получали.
//   2. Фото идут через CDN (images.balinsky.info), а не прямыми ссылками на
//      Supabase Storage — иначе показы на портале оплачиваются нашим egress.
//   3. Описание собирается по шаблону (lib/feeds/villa-description.ts), а НЕ
//      копируется из `SEO Text` карточки — см. пояснение про SEO в том модуле.

export const revalidate = 600

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const MAX_PHOTOS = 10

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`
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

async function loadManifest(): Promise<Record<string, string[]>> {
  try {
    const r = await fetch(cdnManifestUrl(PHOTO_MANIFEST_URL), { next: { revalidate: 300 } })
    if (!r.ok) return {}
    const j = await r.json()
    return cdnRewriteManifest(j && typeof j === 'object' ? j : {})
  } catch {
    return {}
  }
}

type Row = { airtable_id: string; data: Record<string, unknown> }

function buildObject(r: Row, manifest: Record<string, string[]>): string | null {
  const d = r.data
  if (d['Опубликовать'] !== true) return null

  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const price = numberOrNull(d['price']) ?? numberOrNull(d['Цена'])
  const photos = (manifest[r.airtable_id] ?? []).slice(0, MAX_PHOTOS)
  const slug = firstString(d['SEO:Slug'])
  if (lat == null || lng == null) return null
  if (price == null || price <= 0) return null
  if (photos.length === 0) return null
  if (!slug || slug.startsWith('-')) return null

  const description = buildVillaDescription(d)
  if (!description) return null

  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const address = district ? `${district}, Bali, Indonesia` : 'Bali, Indonesia'
  const rooms = numberOrNull(d['Комнаты'])
  const area = numberOrNull(d['Площадь'])
  const land = numberOrNull(d['Земля'])
  const currency = (firstString(d['currency']) ?? 'USD').toUpperCase()

  const status = firstString(d['Статус'])
  const yearRaw = firstString(d['Year of completion'])
  const buildingYear = status && /постро/i.test(status) ? 0 : yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null

  const lines: string[] = []
  lines.push('  <object>')
  lines.push('    <seller_info>')
  lines.push('      <user_name>')
  lines.push(`        <ru>${escapeXml(FEED_SELLER.nameRu)}</ru>`)
  lines.push(`        <en>${escapeXml(FEED_SELLER.nameEn)}</en>`)
  lines.push('      </user_name>')
  lines.push('      <user_surname>')
  lines.push(`        <ru>${escapeXml(FEED_SELLER.surnameRu)}</ru>`)
  lines.push(`        <en>${escapeXml(FEED_SELLER.surnameEn)}</en>`)
  lines.push('      </user_surname>')
  lines.push(`      <user_email>${escapeXml(FEED_SELLER.email)}</user_email>`)
  lines.push(`      <user_phone>${escapeXml(FEED_SELLER.phone)}</user_phone>`)
  lines.push('    </seller_info>')
  lines.push(`    <external_id>${escapeXml(r.airtable_id)}</external_id>`)
  lines.push('    <deal_type>sale</deal_type>')
  lines.push('    <type>3</type>')
  lines.push('    <country_code>ID</country_code>')
  lines.push(`    <lat>${lat}</lat>`)
  lines.push(`    <lng>${lng}</lng>`)
  lines.push(`    <address>${escapeXml(address)}</address>`)
  lines.push(`    <external_url>${escapeXml(`${SITE_URL}/ru/villy/o/${slug}`)}</external_url>`)
  lines.push(`    <currency>${escapeXml(currency)}</currency>`)
  lines.push(`    <price>${Math.round(price)}</price>`)
  if (buildingYear != null) lines.push(`    <building_year>${buildingYear}</building_year>`)
  if (rooms != null) {
    lines.push(`    <rooms>${rooms}</rooms>`)
    lines.push(`    <bedrooms>${rooms}</bedrooms>`)
  }
  if (area != null) lines.push(`    <area>${area}</area>`)
  if (land != null) lines.push(`    <area_ground>${land}</area_ground>`)
  lines.push('    <photos>')
  for (const u of photos) lines.push(`      <url>${escapeXml(u)}</url>`)
  lines.push('    </photos>')
  lines.push('    <description>')
  lines.push(`      <ru>${cdata(description.ru)}</ru>`)
  lines.push(`      <en>${cdata(description.en)}</en>`)
  lines.push('    </description>')
  lines.push('    <vat_type>3</vat_type>')
  lines.push('  </object>')
  return lines.join('\n')
}

// Узкая JSONB-проекция: фиду нужно ~18 полей, а не весь blob (полные сканы
// raw_villas — известная дыра по egress).
const SLIM_FIELDS = [
  ['Опубликовать', 'pub'],
  ['SEO:Slug', 'seo_slug'],
  ['Geo', 'geo'],
  ['Geo 2', 'geo2'],
  ['price', 'price'],
  ['Цена', 'price_alt'],
  ['currency', 'currency'],
  ['Location', 'loc'],
  ['Location 2', 'loc2'],
  ['Комнаты', 'rooms'],
  ['Площадь', 'area'],
  ['Земля', 'land'],
  ['Leasehold', 'leasehold'],
  ['Leashold', 'leasehold_alt'],
  ['Разрешение', 'permit'],
  ['Year of completion', 'year'],
  ['Статус', 'status'],
  ['Заявленная доходность', 'yield'],
] as const

const SELECT = ['airtable_id', ...SLIM_FIELDS.map(([k, a]) => `${a}:data->"${k}"`)].join(',')

function reassemble(raw: Record<string, unknown>): Row {
  const data: Record<string, unknown> = {}
  for (const [k, a] of SLIM_FIELDS) data[k] = raw[a]
  return { airtable_id: raw.airtable_id as string, data } as Row
}

export async function GET() {
  const [rowsRes, manifest] = await Promise.all([
    sb.from('raw_villas').select(SELECT).limit(1000),
    loadManifest(),
  ])
  const rows = ((rowsRes.data ?? []) as unknown as Record<string, unknown>[]).map(reassemble)

  const items: string[] = []
  for (const r of rows) {
    const xml = buildObject(r, manifest)
    if (xml) items.push(xml)
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<objects>\n` +
    `  <version>2.0</version>\n` +
    items.join('\n') +
    `\n</objects>\n`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
