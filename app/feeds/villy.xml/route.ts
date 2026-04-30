import { createClient } from '@supabase/supabase-js'
import { firstString, numberOrNull } from '@/app/ru/villy/_lib'

// Partner XML feed for realting.com (and any sites consuming the same schema).
// Schema reference: docs accompanying sample_import_complex_ru.xml.
//
// All villas published in `raw_villas` with valid coords + price + photos
// are exported. Each villa is emitted as <complex type="13"> (= Вилла).


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

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
  // CDATA sections cannot contain `]]>` — split if it appears (extremely rare).
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
    const r = await fetch(PHOTO_MANIFEST_URL, { next: { revalidate: 300 } })
    if (!r.ok) return {}
    const j = await r.json()
    return j && typeof j === 'object' ? j : {}
  } catch {
    return {}
  }
}

type Row = { airtable_id: string; data: Record<string, unknown> }

function buildComplex(r: Row, manifest: Record<string, string[]>): string | null {
  const d = r.data
  if (d['Опубликовать'] !== true) return null

  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  const price = numberOrNull(d['price']) ?? numberOrNull(d['Цена'])
  const photos = manifest[r.airtable_id] ?? []
  if (lat == null || lng == null) return null
  if (price == null) return null
  if (photos.length === 0) return null

  const slug = firstString(d['SEO:Slug'])
  if (!slug || slug.startsWith('-')) return null

  const ruTitleRaw = firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя'])
  const ruTitle = ruTitleRaw ? ruTitleRaw.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() : null
  const enTitle = firstString(d['Имя ENG']) ?? firstString(d['SEO_Title_EN'])
  if (!ruTitle && !enTitle) return null

  // Country: explicit override (Bali = Indonesia). The data field
  // currency==='3166-1' is a placeholder — we hardcode to ID.
  const countryCode = 'ID'
  const currency = (firstString(d['currency']) ?? 'USD').toUpperCase()

  // Address fallback: if data.address is empty, build from district + Бали.
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const rawAddress = firstString(d['address'])
  const address = rawAddress && rawAddress.trim() ? rawAddress.trim() : district ? `${district}, Bali, Indonesia` : 'Bali, Indonesia'

  // Building year: 0 if status === Built, else Year of completion if numeric.
  const status = firstString(d['Статус'])
  const yearRaw = firstString(d['Year of completion'])
  let buildingYear: number | null = null
  if (status && status.toLowerCase().includes('построен')) buildingYear = 0
  else if (yearRaw && /^\d{4}$/.test(yearRaw)) buildingYear = Number(yearRaw)

  // Description: SEO Text (Airtable computed) → CDATA.
  const seoText = firstString(d['SEO Text']) ?? firstString(d['Notes'])

  // Tags: detect presence of swimming pool from text; mark Built status.
  const tags: number[] = []
  const allText = [ruTitle, enTitle, seoText, firstString(d['Notes']), firstString(d['ИИ Имя'])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (/бассейн|pool/.test(allText)) tags.push(495)
  if (status && status.toLowerCase().includes('построен')) tags.push(5294)

  // Seller info: from data fields (all 553 villas have these).
  const userName = firstString(d['user_name']) ?? 'Andrei'
  const userSurname = firstString(d['user_surname']) ?? 'Balinsky'
  const userEmail = firstString(d['user_email']) ?? 'asp.slesarev@gmail.com'
  const userPhone = firstString(d['user_phone']) ?? '+62 887 3173613'

  const externalUrl = `${SITE_URL}/ru/villy/o/${slug}`

  const lines: string[] = []
  lines.push('  <complex>')
  lines.push('    <seller_info>')
  lines.push('      <user_name>')
  lines.push(`        <ru>${escapeXml(userName)}</ru>`)
  lines.push(`        <en>${escapeXml(userName)}</en>`)
  lines.push('      </user_name>')
  lines.push('      <user_surname>')
  lines.push(`        <ru>${escapeXml(userSurname)}</ru>`)
  lines.push(`        <en>${escapeXml(userSurname)}</en>`)
  lines.push('      </user_surname>')
  lines.push(`      <user_email>${escapeXml(userEmail)}</user_email>`)
  lines.push(`      <user_phone>${escapeXml(userPhone)}</user_phone>`)
  lines.push('    </seller_info>')
  lines.push(`    <external_id>${escapeXml(r.airtable_id)}</external_id>`)
  lines.push('    <type>13</type>')
  lines.push(`    <country_code>${escapeXml(countryCode)}</country_code>`)
  lines.push(`    <lat>${lat}</lat>`)
  lines.push(`    <lng>${lng}</lng>`)
  lines.push(`    <address>${escapeXml(address)}</address>`)
  lines.push('    <title>')
  if (ruTitle) lines.push(`      <ru>${escapeXml(ruTitle)}</ru>`)
  if (enTitle) lines.push(`      <en>${escapeXml(enTitle)}</en>`)
  lines.push('    </title>')
  lines.push(`    <external_url>${escapeXml(externalUrl)}</external_url>`)
  lines.push(`    <currency>${escapeXml(currency)}</currency>`)
  lines.push(`    <price>${Math.round(price)}</price>`)
  if (buildingYear != null) lines.push(`    <building_year>${buildingYear}</building_year>`)
  lines.push('    <photos>')
  for (const u of photos) lines.push(`      <url>${escapeXml(u)}</url>`)
  lines.push('    </photos>')
  if (tags.length > 0) {
    lines.push('    <tags>')
    for (const t of tags) lines.push(`      <tag>${t}</tag>`)
    lines.push('    </tags>')
  }
  if (seoText) {
    lines.push('    <description>')
    lines.push(`      <ru>${cdata(seoText)}</ru>`)
    lines.push('    </description>')
  }
  lines.push('  </complex>')
  return lines.join('\n')
}

export async function GET() {
  const [rowsRes, manifest] = await Promise.all([
    sb.from('raw_villas').select('airtable_id, data').limit(1000),
    loadManifest(),
  ])
  const rows = (rowsRes.data ?? []) as Row[]

  const items: string[] = []
  for (const r of rows) {
    const xml = buildComplex(r, manifest)
    if (xml) items.push(xml)
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<complexes>\n` +
    `  <version>1.0</version>\n` +
    items.join('\n') +
    `\n</complexes>\n`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
