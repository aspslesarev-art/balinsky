import { createClient } from '@supabase/supabase-js'

// Realting.com partner XML feed for residential developments (complexes).
// Schema reference: docs accompanying sample_import_complex_ru.xml.
//
// Hand-picked top complexes only — popular districts, ≥5 photos, derivable
// price (min/max from constituent apartments matched by name).
// Titles + descriptions are REWRITTEN per project (not copied from source DB)
// to avoid SEO duplication on the partner site.


const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

const FEED_LIMIT = 300
const MIN_PHOTOS = 3

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
function parseGeo(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  if (Array.isArray(v) && v.length > 0) return parseGeo(v[0])
  return null
}
function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

async function loadManifest(): Promise<Record<string, string[]>> {
  try {
    const r = await fetch(PHOTO_MANIFEST_URL, { next: { revalidate: 300 } })
    if (!r.ok) return {}
    const j = await r.json()
    return j && typeof j === 'object' ? j : {}
  } catch { return {} }
}

// Realting type IDs:
//   13 - Вилла, 15 - Апарт-отель, 16 - Жилой комплекс, 20 - Отель
function realtingType(types: string[]): number {
  const lower = types.map(t => t.toLowerCase())
  if (lower.includes('hotel') && lower.length === 1) return 20
  if (lower.includes('виллы') && lower.length === 1) return 13
  if (lower.includes('hotel')) return 15
  return 16
}

// District-based audience copy. Used in description rewrites.
function audienceForDistrict(district: string | null): { ru: string; en: string } {
  if (!district) return { ru: 'для жизни и инвестиций на Бали', en: 'for living and investment on Bali' }
  if (['Berawa', 'Batu Bolong', 'Pererenan', 'Canggu', 'Cemagi'].includes(district)) {
    return {
      ru: 'для сёрфинга, удалённой работы и стабильного дохода от посуточной аренды',
      en: 'for surfers, digital nomads and steady short-term rental income',
    }
  }
  if (['Uluwatu', 'Pandawa', 'Melasti', 'Bukit'].includes(district)) {
    return {
      ru: 'для премиальной жизни с видом на океан и инвестиций в туристический сегмент',
      en: 'for premium ocean-view living and resort-grade investment',
    }
  }
  if (district === 'Ubud') {
    return {
      ru: 'для тех, кто ценит природу, тишину и неспешный ритм жизни в окружении джунглей',
      en: 'for those who value nature, quiet and the slow pace of jungle living',
    }
  }
  if (['Sanur', 'Nusa Dua'].includes(district)) {
    return {
      ru: 'для семейного формата проживания и долгосрочного переезда',
      en: 'for family living and long-term relocation',
    }
  }
  return { ru: 'для жизни и инвестиций на Бали', en: 'for living and investment on Bali' }
}

// Renames status to a phrase used in copy.
function statusPhrase(status: string | null): { ru: string; en: string } {
  if (!status) return { ru: '', en: '' }
  if (status.toLowerCase().includes('построен')) return { ru: 'комплекс уже сдан и готов ко въезду', en: 'project is completed and ready for move-in' }
  if (status.toLowerCase().includes('заказ')) return { ru: 'старт продаж — приём бронирований открыт', en: 'sales just opened — early-stage bookings available' }
  return { ru: 'строительство активно идёт', en: 'construction is actively under way' }
}

function fmtPrice(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function buildTitleRu(name: string, district: string | null): string {
  if (district) return `${name} — жилой комплекс в районе ${district}, Бали`
  return `${name} — жилой комплекс на Бали`
}
function buildTitleEn(name: string, district: string | null): string {
  if (district) return `${name} – residential development in ${district}, Bali`
  return `${name} – residential development on Bali`
}

function buildDescriptionRu(opts: {
  name: string
  district: string | null
  types: string[]
  units: number | null
  year: string | null
  permit: string | null
  status: string | null
  priceMin: number | null
  priceMax: number | null
}): string {
  const a = audienceForDistrict(opts.district)
  const sp = statusPhrase(opts.status)
  const parts: string[] = []
  parts.push(`${opts.name} — современный жилой проект на Бали${opts.district ? `, расположенный в районе ${opts.district}` : ''}.`)
  if (opts.types.length > 0) {
    parts.push(`Форматы недвижимости в комплексе: ${opts.types.join(', ').toLowerCase()}.`)
  }
  if (opts.units != null) {
    parts.push(`Всего юнитов: ${opts.units}.`)
  }
  if (opts.year) {
    parts.push(`Срок сдачи — ${opts.year} год.`)
  }
  if (sp.ru) parts.push(`На момент публикации ${sp.ru}.`)
  if (opts.permit && opts.permit.toLowerCase() !== 'нет') {
    parts.push(`Получено разрешение на строительство категории ${opts.permit}.`)
  }
  if (opts.priceMin != null) {
    const range = opts.priceMax != null && opts.priceMax > opts.priceMin
      ? `от $${fmtPrice(opts.priceMin)} до $${fmtPrice(opts.priceMax)}`
      : `от $${fmtPrice(opts.priceMin)}`
    parts.push(`Стоимость юнитов в комплексе — ${range}.`)
  }
  parts.push(`Подходит ${a.ru}. Закрытая территория, единая управляющая компания, удобная инфраструктура.`)
  parts.push('Подбор объектов и консультация по сделке — Balinsky.')
  return parts.join(' ')
}

function buildDescriptionEn(opts: {
  name: string
  district: string | null
  types: string[]
  units: number | null
  year: string | null
  permit: string | null
  status: string | null
  priceMin: number | null
  priceMax: number | null
}): string {
  const a = audienceForDistrict(opts.district)
  const sp = statusPhrase(opts.status)
  const typesEn = opts.types.map(t => t.toLowerCase().replace('виллы', 'villas').replace('апартаменты', 'apartments').replace('таунхаусы', 'townhouses').replace('пентхаусы', 'penthouses').replace('смарт виллы', 'smart villas')).join(', ')
  const parts: string[] = []
  parts.push(`Located ${opts.district ? `in ${opts.district}, ` : ''}Bali, ${opts.name} is a contemporary residential development designed ${a.en}.`)
  if (typesEn) parts.push(`The project offers ${typesEn}.`)
  if (opts.units != null) parts.push(`Total of ${opts.units} units.`)
  if (opts.year) parts.push(`Estimated completion: ${opts.year}.`)
  if (sp.en) parts.push(`Currently the ${sp.en}.`)
  if (opts.permit && opts.permit.toLowerCase() !== 'нет') {
    parts.push(`Construction permit ${opts.permit} has been issued.`)
  }
  if (opts.priceMin != null) {
    const range = opts.priceMax != null && opts.priceMax > opts.priceMin
      ? `from $${fmtPrice(opts.priceMin)} to $${fmtPrice(opts.priceMax)}`
      : `from $${fmtPrice(opts.priceMin)}`
    parts.push(`Unit prices: ${range}.`)
  }
  parts.push(`Gated community with on-site management, swimming pool and modern amenities. Selection guidance and deal support by Balinsky.`)
  return parts.join(' ')
}

type ComplexRow = {
  airtable_id: string
  data: Record<string, unknown>
  slug: string | null
}

type UnitPrice = { titleLower: string; price: number }

async function loadUnitPrices(): Promise<UnitPrice[]> {
  const out: UnitPrice[] = []
  const [{ data: apts }, { data: villas }] = await Promise.all([
    sb.from('raw_apartments').select('data').limit(1000),
    sb.from('raw_villas').select('data').limit(1000),
  ])
  for (const r of (apts ?? []) as { data: Record<string, unknown> }[]) {
    if (r.data?.['Опубликовать'] !== true) continue
    const title = firstString(r.data['SEO:Title'])
    const price = numberOrNull(r.data['price_usd'] ?? r.data['Цена'])
    if (title && price && price > 1000) out.push({ titleLower: title.toLowerCase(), price })
  }
  for (const r of (villas ?? []) as { data: Record<string, unknown> }[]) {
    if (r.data?.['Опубликовать'] !== true) continue
    const title = firstString(r.data['SEO:Title'])
    const price = numberOrNull(r.data['price'] ?? r.data['Цена'])
    if (title && price && price > 1000) out.push({ titleLower: title.toLowerCase(), price })
  }
  return out
}

function pricesForComplex(name: string, all: UnitPrice[]): { min: number | null; max: number | null } {
  const lower = name.toLowerCase()
  if (lower.length < 4) return { min: null, max: null }
  const matches = all.filter(a => a.titleLower.includes(lower)).map(a => a.price)
  if (matches.length === 0) return { min: null, max: null }
  return { min: Math.min(...matches), max: Math.max(...matches) }
}

function buildComplexXml(
  c: ComplexRow,
  manifest: Record<string, string[]>,
  apartmentPrices: UnitPrice[],
): string | null {
  const d = c.data
  const name = firstString(d['Project'])
  const slug = c.slug
  if (!name || !slug) return null

  const lat = parseGeo(d['Geo'])
  const lng = parseGeo(d['Geo 2'])
  if (lat == null || lng == null) return null

  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const types = strList(d['Типы юнитов'])
  const status = firstString(d['Статус'])
  const permit = firstString(d['Разрешительные документы'])
  const yearRaw = firstString(d['Year of completion ']) ?? firstString(d['Year of completion'])
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? yearRaw : null
  const units = numberOrNull(d['Total quantity of units'])

  const photos = (manifest[c.airtable_id] ?? []).slice(0, 10)
  if (photos.length < MIN_PHOTOS) return null

  const { min: priceMin, max: priceMax } = pricesForComplex(name, apartmentPrices)
  if (priceMin == null) return null

  const type = realtingType(types)
  const buildingYear = status?.toLowerCase().includes('построен') ? 0 : (year ? Number(year) : null)

  const titleRu = buildTitleRu(name, district)
  const titleEn = buildTitleEn(name, district)
  const descRu = buildDescriptionRu({ name, district, types, units, year, permit, status, priceMin, priceMax })
  const descEn = buildDescriptionEn({ name, district, types, units, year, permit, status, priceMin, priceMax })

  // Tags: 495 Бассейн, 334 Охрана, 5343 Огороженная территория, 3310 Управляющая компания
  const tags = [495, 334, 5343, 3310]
  if (status?.toLowerCase().includes('построен')) tags.push(5294)

  const externalUrl = `${SITE_URL}/ru/zhilye-kompleksy/o/${slug}`

  const lines: string[] = []
  lines.push('  <complex>')
  lines.push('    <seller_info>')
  lines.push('      <user_name>')
  lines.push('        <en>Balinsky</en>')
  lines.push('        <ru>Balinsky</ru>')
  lines.push('      </user_name>')
  lines.push('      <user_surname>')
  lines.push('        <en>Team</en>')
  lines.push('        <ru>Команда</ru>')
  lines.push('      </user_surname>')
  lines.push('      <user_email>asp.slesarev@gmail.com</user_email>')
  lines.push('      <user_phone>+62 887 3173613</user_phone>')
  lines.push('    </seller_info>')
  lines.push(`    <external_id>${escapeXml(c.airtable_id)}</external_id>`)
  lines.push(`    <type>${type}</type>`)
  lines.push('    <country_code>ID</country_code>')
  lines.push(`    <lat>${lat}</lat>`)
  lines.push(`    <lng>${lng}</lng>`)
  lines.push(`    <address>${escapeXml(district ? `${district}, Bali, Indonesia` : 'Bali, Indonesia')}</address>`)
  lines.push('    <title>')
  lines.push(`      <en>${escapeXml(titleEn)}</en>`)
  lines.push(`      <ru>${escapeXml(titleRu)}</ru>`)
  lines.push('    </title>')
  lines.push(`    <external_url>${escapeXml(externalUrl)}</external_url>`)
  lines.push('    <currency>USD</currency>')
  lines.push(`    <price>${Math.round(priceMin)}</price>`)
  if (priceMax != null && priceMax > priceMin) {
    lines.push(`    <price_max>${Math.round(priceMax)}</price_max>`)
  }
  if (buildingYear != null) lines.push(`    <building_year>${buildingYear}</building_year>`)
  lines.push('    <decoration>1</decoration>')
  lines.push('    <photos>')
  for (const u of photos) lines.push(`      <url>${escapeXml(u)}</url>`)
  lines.push('    </photos>')
  lines.push('    <tags>')
  for (const t of tags) lines.push(`      <tag>${t}</tag>`)
  lines.push('    </tags>')
  lines.push('    <description>')
  lines.push(`      <en>${cdata(descEn)}</en>`)
  lines.push(`      <ru>${cdata(descRu)}</ru>`)
  lines.push('    </description>')
  lines.push('  </complex>')
  return lines.join('\n')
}

export async function GET() {
  const [rowsRes, manifest, apartmentPrices] = await Promise.all([
    sb.from('raw_complexes').select('airtable_id, data, slug').limit(500),
    loadManifest(),
    loadUnitPrices(),
  ])

  const all = (rowsRes.data ?? []) as ComplexRow[]

  // Quality bar only: enough photos + slug + name. District filter dropped —
  // this is a lead-gen feed, broader coverage is better.
  const eligible = all.filter(c => {
    const photoCount = (manifest[c.airtable_id] ?? []).length
    if (photoCount < MIN_PHOTOS) return false
    return Boolean(c.slug && firstString(c.data['Project']))
  })

  // Sort: status (Built/Building first, Под заказ last), then by year asc,
  // then by photo count desc.
  const statusRank = (s: string | null) =>
    s?.toLowerCase().includes('построен') ? 0 : s?.toLowerCase().includes('заказ') ? 2 : 1
  eligible.sort((a, b) => {
    const sa = statusRank(firstString(a.data['Статус']))
    const sb = statusRank(firstString(b.data['Статус']))
    if (sa !== sb) return sa - sb
    const ya = Number(firstString(a.data['Year of completion ']) ?? firstString(a.data['Year of completion']) ?? '9999')
    const yb = Number(firstString(b.data['Year of completion ']) ?? firstString(b.data['Year of completion']) ?? '9999')
    if (ya !== yb) return ya - yb
    return (manifest[b.airtable_id]?.length ?? 0) - (manifest[a.airtable_id]?.length ?? 0)
  })

  const items: string[] = []
  for (const c of eligible) {
    if (items.length >= FEED_LIMIT) break
    const xml = buildComplexXml(c, manifest, apartmentPrices)
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
