// AI-powered investment report for one listing.
//
// Pipeline:
//   loadListingForReport(kind, slug)  → raw catalogue data + computed
//                                        cap rate / district benchmark
//                                        / nearest beach / nearby places
//   generateBalinaVerdict(payload)    → calls OpenAI with the same
//                                        SYSTEM_PROMPT Балина uses,
//                                        asks for a structured JSON
//                                        verdict (что брать, риски,
//                                        вывод по трём целям)
//
// The PDF renderer (components/ListingReportPDF.tsx) consumes the
// merged ReportData and lays it out — keep ALL data shaping here so
// the PDF stays a pure render layer.

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { getSystemPrompt } from '@/lib/consultant'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { loadAllRental } from '@/lib/rental'
import { loadNearbyPlaces } from '@/lib/nearby-places'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type ReportKind = 'villa' | 'apartment' | 'complex'

export type ReportData = {
  kind: ReportKind
  slug: string
  airtableId: string
  title: string
  district: string | null
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  pricePerSqmUsd: number | null
  landZone: string | null
  landPurpose: string | null
  leaseYears: number | null
  completionYear: string | null
  status: string | null
  permit: string | null
  photoUrls: string[]
  description: string | null
  capRateMedian: number | null   // fraction 0..1
  capRateGood: number | null
  monthlyRentCompUsd: number | null
  monthlyRentCompCount: number | null
  districtMedianPricePerSqmUsd: number | null
  districtListingsCount: number | null
  nearestBeach: { name: string; km: number } | null
  nearby: { category: string; places: { name: string; km: number }[] }[]
  developer: string | null
  generatedAt: string  // ISO
  verdict: BalinaVerdict
}

export type BalinaVerdict = {
  oneLineSummary: string         // "Сильный кандидат под Booking, но лизхолд короткий"
  pros: string[]                 // 3-5 plus points
  risks: string[]                // 2-4 risk callouts
  recommendationByGoal: {
    forLiving: string            // 1-2 sentences
    forSTR: string
    forLongTermRental: string
  }
  finalRating: 'strong-buy' | 'consider' | 'caution' | 'skip'
  confidence: 'high' | 'medium' | 'low'
}

const TABLE_BY_KIND: Record<ReportKind, string> = {
  villa: 'raw_villas', apartment: 'raw_apartments', complex: 'raw_complexes',
}
const PHOTO_BUCKET_BY_KIND: Record<ReportKind, string> = {
  villa: 'villa-photos', apartment: 'apartment-photos', complex: 'complex-photos',
}

// === public entry =========================================================

export async function buildReport(kind: ReportKind, slug: string): Promise<ReportData | null> {
  const base = await loadListingBase(kind, slug)
  if (!base) return null

  const photoUrls = await loadPhotosFor(base.airtableId, kind)

  // Investment analytics — same data Балина sees in chat.
  const [scores, rentals, nearbyData, districtMedianRow] = await Promise.all([
    kind === 'villa' ? loadAllVillaScores().catch(() => null) : Promise.resolve(null),
    (kind === 'villa' || kind === 'apartment') ? loadAllRental().catch(() => []) : Promise.resolve([]),
    kind === 'villa' ? loadNearbyPlaces(base.airtableId).catch(() => null) : Promise.resolve(null),
    loadDistrictMedian(kind, base.district),
  ])

  const score = scores?.get(base.airtableId)
  const monthlyComp = computeMonthlyRentComp(rentals, base.district, base.bedrooms)
  const nearestBeach = base.lat != null && base.lng != null ? findNearestBeach(base.lat, base.lng) : null
  const nearbyByCategory = nearbyData
    ? nearbyData.categories.map(c => ({
        category: c.title,
        places: (nearbyData.byCategory[c.key] ?? [])
          .slice(0, 5)
          .map(p => ({ name: p.name ?? 'Место', km: p.distanceKm })),
      })).filter(x => x.places.length > 0)
    : []

  // Cached verdict by (kind, slug), TTL 7 days. The OpenAI call is
  // the only ~$0.01 cost in the pipeline; everything else (data
  // shaping, PDF render) is essentially free. Repeat downloads
  // therefore cost nothing.
  const verdict = await loadOrGenerateVerdict(kind, slug, () => generateBalinaVerdict({
    title: base.title,
    district: base.district,
    bedrooms: base.bedrooms,
    area: base.area,
    priceUsd: base.priceUsd,
    pricePerSqmUsd: base.pricePerSqmUsd,
    landZone: base.landZone,
    leaseYears: base.leaseYears,
    completionYear: base.completionYear,
    status: base.status,
    capRateGood: score?.goodCapRate ?? null,
    capRateMedian: score?.capRate ?? null,
    monthlyRentUsd: monthlyComp?.usd ?? null,
    districtMedianPricePerSqmUsd: districtMedianRow?.median ?? null,
    descriptionPreview: base.description ? base.description.slice(0, 600) : null,
    nearestBeachKm: nearestBeach?.km ?? null,
  }))

  return {
    kind,
    slug,
    airtableId: base.airtableId,
    title: base.title,
    district: base.district,
    bedrooms: base.bedrooms,
    area: base.area,
    priceUsd: base.priceUsd,
    pricePerSqmUsd: base.pricePerSqmUsd,
    landZone: base.landZone,
    landPurpose: base.landPurpose,
    leaseYears: base.leaseYears,
    completionYear: base.completionYear,
    status: base.status,
    permit: base.permit,
    photoUrls,
    description: base.description,
    capRateMedian: score?.capRate ?? null,
    capRateGood: score?.goodCapRate ?? null,
    monthlyRentCompUsd: monthlyComp?.usd ?? null,
    monthlyRentCompCount: monthlyComp?.count ?? null,
    districtMedianPricePerSqmUsd: districtMedianRow?.median ?? null,
    districtListingsCount: districtMedianRow?.count ?? null,
    nearestBeach,
    nearby: nearbyByCategory,
    developer: base.developer,
    generatedAt: new Date().toISOString(),
    verdict,
  }
}

// === base loader ==========================================================

type Base = {
  airtableId: string; title: string; district: string | null;
  bedrooms: number | null; area: number | null; priceUsd: number | null;
  pricePerSqmUsd: number | null; landZone: string | null; landPurpose: string | null;
  leaseYears: number | null; completionYear: string | null; status: string | null;
  permit: string | null; description: string | null; developer: string | null;
  lat: number | null; lng: number | null;
}

async function loadListingBase(kind: ReportKind, slug: string): Promise<Base | null> {
  const table = TABLE_BY_KIND[kind]
  // Direct JSONB filter on `data->>SEO:Slug` so we hit just the
  // matching row instead of pulling thousands. Used to paginate
  // through 4000 rows which blew past the 60s function timeout
  // for first-time uncached reports.
  const { data, error } = await sb
    .from(table)
    .select('airtable_id, data')
    .eq('data->>SEO:Slug', slug)
    .limit(1)
  if (error) throw new Error(`${table}: ${error.message}`)
  const row = (data?.[0] ?? null) as { airtable_id: string; data: Record<string, unknown> } | null
  if (!row) return null
  const d = row.data
  const titleRaw = fs1(d['SEO:Title']) ?? fs1(d['ИИ Имя']) ?? fs1(d['Name']) ?? fs1(d['Project']) ?? ''
  const title = titleRaw.replace(/\s*\|\s*Balinsky\s*$/, '').trim()
  const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
  const district = districtRaw && /^rec[A-Za-z0-9]{14,}$/.test(districtRaw) ? null : districtRaw
  const area = num(d['Площадь'])
  const priceUsd = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена'])
  const pricePerSqmRaw = num(d['Цена м²']) ?? (priceUsd != null && area && area > 0 ? priceUsd / area : null)
  const pricePerSqm = pricePerSqmRaw != null ? Math.round(pricePerSqmRaw) : null
  const landPurpose = fs1(d['Назначение земли'])
  const landColor = fs1(d['Land color']) ?? fs1(d['Цвет земли']) ?? fs1(d['Цвет земли вторичка'])
  const leaseRaw = fs1(d['Leasehold']) ?? fs1(d['Leashold'])
  return {
    airtableId: row.airtable_id, title,
    district,
    bedrooms: num(d['Комнаты']) ?? num(d['Спальни']),
    area, priceUsd, pricePerSqmUsd: pricePerSqm,
    landZone: classifyZone(landPurpose, landColor),
    landPurpose,
    leaseYears: leaseRaw ? Number(leaseRaw) || null : null,
    completionYear: fs1(d['Year of completion']) ?? fs1(d['Year of completion ']),
    status: fs1(d['Статус']),
    permit: fs1(d['Разрешение']) ?? fs1(d['PBG']),
    description: fs1(d['SEO Text']) ?? fs1(d['Notes']) ?? fs1(d['Описание']),
    developer: fs1(d['Developer1']) ?? fs1(d['Developer']),
    lat: parseGeoStr(d['Geo']),
    lng: parseGeoStr(d['Geo 2']),
  }
}

async function loadPhotosFor(airtableId: string, kind: ReportKind): Promise<string[]> {
  const bucket = PHOTO_BUCKET_BY_KIND[kind]
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/_manifest.json`, { cache: 'no-store' })
    if (!r.ok) return []
    const m = await r.json() as Record<string, string[]>
    return (m[airtableId] ?? []).slice(0, 4)
  } catch { return [] }
}

// === investment helpers (mirror lib/consultant.ts) =======================

function computeMonthlyRentComp(rentals: Awaited<ReturnType<typeof loadAllRental>>, district: string | null, bedrooms: number | null): { usd: number; count: number } | null {
  if (!district || bedrooms == null || rentals.length === 0) return null
  const dLower = district.toLowerCase()
  const matches = rentals.filter(r => {
    if (!r.location || !r.location.toLowerCase().includes(dLower)) return false
    if (r.bedrooms == null) return false
    return Math.abs(r.bedrooms - bedrooms) <= 1
  })
  if (matches.length === 0) return null
  const avg = matches.reduce((s, r) => s + r.priceMonthUsd, 0) / matches.length
  return { usd: Math.round(avg), count: matches.length }
}

// District median lookup is filter-by-substring on a JSONB field —
// PostgREST can't do "contains" on jsonb cleanly, so we scope by
// kind + return only the rows whose Location filter starts with the
// asked district. Cached in-memory across requests within the same
// serverless instance for cheap reuse.
const _medianCache = new Map<string, { ts: number; value: { median: number; count: number } | null }>()
const MEDIAN_TTL_MS = 30 * 60_000

async function loadDistrictMedian(kind: ReportKind, district: string | null): Promise<{ median: number; count: number } | null> {
  if (!district) return null
  const cacheKey = `${kind}::${district.toLowerCase()}`
  const cached = _medianCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < MEDIAN_TTL_MS) return cached.value

  const table = TABLE_BY_KIND[kind]
  // ilike pattern uses the ->> JSONB extractor; fast even without an
  // index because we limit to 500 rows of just `data` jsonb.
  const { data } = await sb.from(table)
    .select('data')
    .ilike('data->>Location filter', `%${district}%`)
    .limit(500)
  const rows = (data ?? []) as { data: Record<string, unknown> }[]
  const ppsm: number[] = []
  for (const r of rows) {
    const d = r.data
    const area = num(d['Площадь'])
    const price = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена'])
    const v = num(d['Цена м²']) ?? (price != null && area && area > 0 ? price / area : null)
    if (v && v > 0) ppsm.push(v)
  }
  if (ppsm.length < 3) {
    _medianCache.set(cacheKey, { ts: Date.now(), value: null })
    return null
  }
  const sorted = ppsm.sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  const value = { median: Math.round(median), count: sorted.length }
  _medianCache.set(cacheKey, { ts: Date.now(), value })
  return value
}

// Subset of the BEACH_REFS from lib/consultant. Intentionally
// duplicated to keep this module self-contained for the cron / API
// route — the canonical list lives in consultant.ts.
const BEACH_REFS = [
  { name: 'Echo Beach (Canggu)',  lat: -8.6515, lng: 115.1305 },
  { name: 'Berawa Beach',          lat: -8.6593, lng: 115.1378 },
  { name: 'Pererenan Beach',       lat: -8.6394, lng: 115.1233 },
  { name: 'Batu Bolong (Canggu)',  lat: -8.6582, lng: 115.1300 },
  { name: 'Seminyak Beach',        lat: -8.6911, lng: 115.1672 },
  { name: 'Kuta Beach',            lat: -8.7180, lng: 115.1690 },
  { name: 'Sanur Beach',           lat: -8.6878, lng: 115.2630 },
  { name: 'Nusa Dua Beach',        lat: -8.8003, lng: 115.2294 },
  { name: 'Jimbaran Bay',          lat: -8.7896, lng: 115.1640 },
  { name: 'Balangan (Bukit)',      lat: -8.7910, lng: 115.1297 },
  { name: 'Bingin (Bukit)',        lat: -8.8118, lng: 115.1133 },
  { name: 'Padang Padang (Bukit)', lat: -8.8121, lng: 115.1066 },
  { name: 'Uluwatu Beach',         lat: -8.8290, lng: 115.0853 },
]
function findNearestBeach(lat: number, lng: number): { name: string; km: number } | null {
  let best: { name: string; km: number } | null = null
  for (const b of BEACH_REFS) {
    const km = haversineKm(lat, lng, b.lat, b.lng)
    if (!best || km < best.km) best = { name: b.name, km: Math.round(km * 100) / 100 }
  }
  return best
}
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// === Балина AI verdict ====================================================

type VerdictInput = {
  title: string; district: string | null; bedrooms: number | null;
  area: number | null; priceUsd: number | null; pricePerSqmUsd: number | null;
  landZone: string | null; leaseYears: number | null; completionYear: string | null;
  status: string | null; capRateGood: number | null; capRateMedian: number | null;
  monthlyRentUsd: number | null; districtMedianPricePerSqmUsd: number | null;
  descriptionPreview: string | null; nearestBeachKm: number | null;
}

const VERDICT_FALLBACK: BalinaVerdict = {
  oneLineSummary: 'Полный разбор временно недоступен — данные собраны, но AI-комментарий не сгенерирован.',
  pros: [],
  risks: [],
  recommendationByGoal: {
    forLiving: 'Уточните у менеджера.',
    forSTR: 'Уточните у менеджера.',
    forLongTermRental: 'Уточните у менеджера.',
  },
  finalRating: 'consider',
  confidence: 'low',
}

// Cache wrapper around generateBalinaVerdict — keyed by (kind, slug),
// TTL 7 days. Falls through to live generation on cache miss / error;
// any cache write failure is non-fatal so a Storage hiccup never
// blocks the user from getting a report.
const VERDICT_TTL_MS = 7 * 24 * 3600_000

async function loadOrGenerateVerdict(
  kind: ReportKind, slug: string,
  generate: () => Promise<BalinaVerdict>,
): Promise<BalinaVerdict> {
  try {
    const { data } = await sb
      .from('ai_report_verdict_cache')
      .select('verdict, generated_at')
      .eq('kind', kind).eq('slug', slug)
      .maybeSingle()
    if (data) {
      const ageMs = Date.now() - new Date(data.generated_at).getTime()
      if (ageMs < VERDICT_TTL_MS && data.verdict) {
        return data.verdict as BalinaVerdict
      }
    }
  } catch (e) {
    console.warn('[report] verdict cache read failed (regenerating):', e)
  }

  const fresh = await generate()
  // Don't await — write fires in the background so the request
  // returns the PDF as fast as possible. Errors logged, not raised.
  sb.from('ai_report_verdict_cache')
    .upsert({ kind, slug, verdict: fresh, generated_at: new Date().toISOString() }, { onConflict: 'kind,slug' })
    .then(({ error }) => { if (error) console.warn('[report] verdict cache write failed:', error.message) })
  return fresh
}

async function generateBalinaVerdict(input: VerdictInput): Promise<BalinaVerdict> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return VERDICT_FALLBACK
  const client = new OpenAI({ apiKey })

  const systemPrompt = await getSystemPrompt()
  const userPayload =
    `Сгенерируй структурированный JSON-вердикт для PDF-отчёта по этому объекту:\n\n` +
    `Объект: ${input.title}\n` +
    `Район: ${input.district ?? 'не указан'}\n` +
    `Спален: ${input.bedrooms ?? '?'}, площадь: ${input.area ?? '?'} м²\n` +
    `Цена: ${input.priceUsd != null ? '$' + input.priceUsd.toLocaleString('en-US') : '?'}\n` +
    `Цена/м²: ${input.pricePerSqmUsd != null ? '$' + input.pricePerSqmUsd.toLocaleString('en-US') : '?'} ` +
    (input.districtMedianPricePerSqmUsd ? `(медиана района $${input.districtMedianPricePerSqmUsd.toLocaleString('en-US')}/м²)` : '') + '\n' +
    `Земля: ${input.landZone ?? 'неизвестно'}\n` +
    `Лизхолд: ${input.leaseYears ?? '?'} лет\n` +
    `Статус/готовность: ${input.status ?? '?'}, год ${input.completionYear ?? '?'}\n` +
    `Cap rate (good): ${input.capRateGood != null ? (input.capRateGood * 100).toFixed(1) + '%' : 'нет данных'}\n` +
    `Помесячная аренда соседей: ${input.monthlyRentUsd != null ? '$' + input.monthlyRentUsd + '/мес' : 'нет данных'}\n` +
    `До ближайшего пляжа: ${input.nearestBeachKm != null ? input.nearestBeachKm + ' км' : '—'}\n\n` +
    `Описание: ${input.descriptionPreview ?? '—'}\n\n` +
    `Верни строго JSON по этой схеме (никакого markdown / преамбулы):\n` +
    `{\n` +
    `  "oneLineSummary": "1 фраза до 100 символов — суть объекта одним предложением",\n` +
    `  "pros": ["3-5 коротких плюсов с цифрами где можно"],\n` +
    `  "risks": ["2-4 коротких риска с конкретикой"],\n` +
    `  "recommendationByGoal": {\n` +
    `    "forLiving": "1-2 предложения — стоит ли жить самому",\n` +
    `    "forSTR": "1-2 предложения — стоит ли сдавать посуточно (Booking/Airbnb)",\n` +
    `    "forLongTermRental": "1-2 предложения — стоит ли сдавать помесячно"\n` +
    `  },\n` +
    `  "finalRating": "strong-buy | consider | caution | skip",\n` +
    `  "confidence": "high | medium | low"\n` +
    `}\n` +
    `Будь честным — если земля yellow и клиент явно не для жизни, ставь caution и так и пиши. Если лизхолд <25 лет, прямо называй это риском.`

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayload },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    })
    const text = completion.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(text) as BalinaVerdict
    // Light validation — fall back if anything required is missing.
    if (!parsed.oneLineSummary || !Array.isArray(parsed.pros) || !Array.isArray(parsed.risks)) {
      return VERDICT_FALLBACK
    }
    return parsed
  } catch (e) {
    console.error('[report] verdict generation failed:', e)
    return VERDICT_FALLBACK
  }
}

// === local utils ==========================================================

function fs1(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return fs1((v as Record<string, unknown>).value)
  return null
}
function num(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.\-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}
function parseGeoStr(v: unknown): number | null {
  const s = fs1(v); if (!s) return null
  const m = s.match(/-?\d+(?:\.\d+)?/); if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}
function classifyZone(purpose: string | null, color: string | null): string | null {
  if (purpose) {
    const p = purpose.toLowerCase()
    if (p.includes('туристическ') || p.includes('посуточн')) return 'tourism'
    if (p.includes('коммерч') || p.includes('бизнес')) return 'commercial'
    if (p.includes('жилья, туризма') || p.includes('смешан')) return 'commercial'
    if (p.includes('проживания и долгосрочной') || p.includes('только для проживания')) return 'yellow'
  }
  if (color) {
    const c = color.toLowerCase()
    if (c.includes('pink') || c.includes('розов')) return 'pink'
    if (c.includes('tourism') || c.includes('туристическ')) return 'tourism'
    if (c.includes('red') || c.includes('orange') || c.includes('красн') || c.includes('оранж') ||
        c.includes('c1') || c.includes('c2') || c.includes('к2') || c.includes('pondok')) return 'commercial'
    if (c.includes('yellow') || c.includes('жёлт') || c.includes('желт')) return 'yellow'
    if (c.includes('green') || c.includes('зелён') || c.includes('зелен') || c.includes('agricultural')) return 'green'
  }
  return null
}
