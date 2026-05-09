// Server-side system prompt + tool definitions + tool executor for the
// chat consultant. Lives off Supabase data the rest of the site uses.

import { createClient } from '@supabase/supabase-js'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { loadAllVillaScores } from './investment/batch-scores'
import { loadAllRental } from './rental'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// Result type rendered as a card in the chat UI. Tool result is JSON-encoded
// shape of `{ results: ListingCard[] }`; the API route extracts and returns
// listings alongside the assistant message so the client can render cards.
export type ListingCard = {
  kind: 'villa' | 'apartment' | 'complex' | 'developer' | 'rental'
  title: string
  url: string
  photo: string | null
  district: string | null
  bedrooms: number | null
  area_sqm: number | null
  price_usd: number | null
  price_per_sqm_usd: number | null
  rent_per_month_usd: number | null
  // Risk + investment-relevant signals so Балина can reason out loud
  // about each card instead of just listing them. All optional; null
  // when the field isn't filled in Airtable.
  //
  //   land_zone — colour of the zoning permit:
  //     'pink' / 'tourism' / 'commercial' — short-term rentals legal
  //     'yellow' — residential ONLY; daily rental technically illegal
  //     'green' / 'agricultural' — generally not for foreigners
  //     null — unknown, must verify
  //   permit — PBG (build permit) string from Airtable, or 'нет'
  //   lease_years — leasehold years remaining, e.g. 25, 50, 80
  //   completion_year — string like "2024" / "2026 Q3" / null when not set
  //   status — "Построен" / "Строится" / "Под заказ"
  //   claimed_yield_pct — declared annual yield (developer's number, 0..1)
  land_zone: 'pink' | 'yellow' | 'green' | 'commercial' | 'tourism' | 'unknown' | null
  // Original "Назначение земли" string from Airtable verbatim — gives
  // the model the exact wording the editor used so it can cite it
  // back to the visitor instead of paraphrasing the enum.
  land_purpose: string | null
  permit: string | null
  lease_years: number | null
  completion_year: string | null
  status: string | null
  claimed_yield_pct: number | null
  // Two-scenario rental economics. For villas we have a real Booking-
  // based capRate model (lib/investment/batch-scores.ts) — both the
  // median and the optimistic ("good") scenario. For both villas and
  // apartments we attach a same-district monthly-rental comparison
  // pulled from the rental catalog so Балина can frame "if Booking
  // doesn't work, fall back to monthly".
  //   cap_rate_median — fraction (0..1), e.g. 0.09 = 9%/year
  //   cap_rate_good — optimistic scenario, fraction
  //   monthly_rent_comp_usd — average $/mo of comparable rentals nearby
  //   monthly_rent_comp_count — how many rentals were averaged
  cap_rate_median: number | null
  cap_rate_good: number | null
  monthly_rent_comp_usd: number | null
  monthly_rent_comp_count: number | null
  // District benchmark — median $/m² across every published listing
  // of the same kind in this district. Lets Балина say "this villa is
  // $4500/m² vs $3200 median in Чангу — 40% premium". `count` is how
  // many listings went into the median, so the model can hedge when
  // the sample is small.
  district_median_price_per_sqm_usd: number | null
  district_listings_count: number | null
}

// Editable knowledge base lives in DB + lib/assistant-knowledge.ts.
// Consumers should call getSystemPrompt() (async) instead of using a
// constant. The export below is kept as a fallback for any caller
// that needs an immediate string — admin/balina renders the live
// version, the chat route uses the async loader.
export { getSystemPrompt } from './assistant-knowledge'


export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_listings',
      description: 'Поиск объектов в каталоге сайта по фильтрам. Используй для любого фактического запроса о конкретных виллах, апартаментах, ЖК или застройщиках. Возвращает топ-N подходящих объектов с заголовком, ценой, районом, числом спален и ссылкой на страницу.',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['villa', 'apartment', 'complex', 'developer', 'rental'],
            description: 'Тип объекта: villa (виллы), apartment (апартаменты), complex (жилой комплекс), developer (застройщик), rental (помесячная аренда)',
          },
          district: { type: 'string', description: 'Район на Бали, например Canggu, Bukit, Ubud, Seminyak, Berawa, Cemagi, Pererenan, Jimbaran, Uluwatu' },
          bedrooms_min: { type: 'number', description: 'Минимум спален' },
          bedrooms_max: { type: 'number', description: 'Максимум спален' },
          price_min_usd: { type: 'number', description: 'Минимальная цена в USD (для покупки) или USD/мес (для аренды)' },
          price_max_usd: { type: 'number', description: 'Максимальная цена в USD' },
          query: { type: 'string', description: 'Свободный поисковый запрос — ищет по заголовку' },
          limit: { type: 'number', description: 'Сколько результатов вернуть (по умолчанию 6, максимум 12)' },
          exclude_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Список URL объектов, которые УЖЕ были показаны пользователю — исключить из выдачи. Используй когда пользователь просит "что ещё / другие варианты / больше".',
          },
          str_only: {
            type: 'boolean',
            description: 'true = вернуть ТОЛЬКО объекты на земле, где разрешена краткосрочная аренда (tourism / commercial / pink). Yellow / green / unknown отфильтруются. Ставь true, когда клиент явно сказал "под аренду", "посуточно", "Booking", "Airbnb", "STR", "сдавать туристам".',
          },
          max_distance_to_beach: {
            type: 'string',
            enum: ['beachfront', 'walking', 'scooter', 'any'],
            description: 'Максимальное расстояние до океана: beachfront ≤100м (1 линия), walking ≤500м (пешком 5–7мин), scooter ≤1.5км (на скутере), any (не важно). Ставь когда клиент явно упомянул море/океан/пляж/у воды. По умолчанию — any.',
          },
        },
        required: ['kind'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_feedback',
      description: 'Записать обратную связь от пользователя. Вызывай когда пользователь делится мнением, жалуется на ошибку, предлагает идею — даже без явного запроса от пользователя записать.',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['like', 'dislike', 'bug', 'idea'],
            description: 'like — что нравится; dislike — что не нравится; bug — нашёл ошибку; idea — предложение/идея',
          },
          message: { type: 'string', description: 'Что именно сказал пользователь (можно перефразировать кратко на русском)' },
          page: { type: 'string', description: 'URL страницы или раздел сайта о котором идёт речь, если применимо' },
        },
        required: ['kind', 'message'],
      },
    },
  },
]

const SITE_URL = 'https://balinsky.info'

type SearchArgs = {
  kind: 'villa' | 'apartment' | 'complex' | 'developer' | 'rental'
  district?: string
  bedrooms_min?: number
  bedrooms_max?: number
  price_min_usd?: number
  price_max_usd?: number
  query?: string
  limit?: number
  exclude_urls?: string[]
  str_only?: boolean
  max_distance_to_beach?: 'beachfront' | 'walking' | 'scooter' | 'any'
}

function fs1(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return fs1((v as Record<string, unknown>).value)
  return null
}
function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/\s/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length) return num(v[0])
  return null
}
// District names (RU + EN substrings, lowercased) that are clearly
// inland on Bali — anything containing one of these is dropped when
// the visitor asked for proximity to the ocean. Whitelisting coastal
// districts is a moving target (new spellings appear constantly);
// the inland set is short and stable, so we exclude it instead.
const INLAND_DISTRICT_TOKENS = [
  'убуд', 'ubud',
  'табан', 'tabanan',
  'бедугул', 'bedugul',
  'мундук', 'munduk',
  'кинтамани', 'kintamani',
  'сидеман', 'sideman', 'sidemen',
  'паянган', 'payangan',
  'мас', 'mas ',
  'тегаллаланг', 'tegallalang', 'tegalalang',
]
function isCoastalRow(d: Record<string, unknown>): boolean {
  const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
  if (!districtRaw) return true
  const lower = districtRaw.toLowerCase()
  return !INLAND_DISTRICT_TOKENS.some(t => lower.includes(t))
}

function matchDistrict(d: Record<string, unknown>, want: string): boolean {
  const fields = ['Location filter', 'Location 2', 'Location', 'District']
  for (const k of fields) {
    const v = fs1(d[k])
    if (v && v.toLowerCase().includes(want.toLowerCase())) return true
  }
  return false
}

// Lazy-loaded photo manifests, used to attach a cover image to each result.
const photoManifestCache: Record<string, Record<string, string[]>> = {}
async function loadPhotoManifest(bucket: string): Promise<Record<string, string[]>> {
  if (photoManifestCache[bucket]) return photoManifestCache[bucket]
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/_manifest.json`, { cache: 'no-store' })
    if (r.ok) photoManifestCache[bucket] = await r.json()
    else photoManifestCache[bucket] = {}
  } catch { photoManifestCache[bucket] = {} }
  return photoManifestCache[bucket]
}

async function searchSupabaseTable(
  table: 'raw_villas' | 'raw_apartments' | 'raw_complexes' | 'raw_developers',
  kind: ListingCard['kind'],
  args: SearchArgs,
  pathPrefix: string,
  photoBucket: string | null,
): Promise<ListingCard[]> {
  const select = table === 'raw_developers' ? 'airtable_id, data, logo_url' : 'airtable_id, data'
  const { data } = await sb.from(table).select(select).limit(2000)
  const rows = (data ?? []) as unknown as { airtable_id: string; data: Record<string, unknown>; logo_url?: string | null }[]
  const limit = Math.min(args.limit ?? 6, 12)

  const filtered = rows.filter(r => {
    const d = r.data
    if (d['Опубликовать'] !== true && d['Публикация'] !== true) return false
    const slug = fs1(d['SEO:Slug'])
    if (!slug || slug.startsWith('-')) return false

    if (args.district && !matchDistrict(d, args.district)) return false

    // Coastal whitelist — applied when the visitor explicitly cares
    // about being near water. We don't have per-listing distance data,
    // so we approximate by district. This filter is intentionally
    // generous (anything except the obvious inland set) to avoid
    // false negatives.
    if (args.max_distance_to_beach && args.max_distance_to_beach !== 'any') {
      if (!isCoastalRow(d)) return false
    }

    // STR-only filter — drop yellow / green / unknown land. Cheaper
    // to compute zone twice than to thread it through the filter.
    if (args.str_only) {
      const purpose = fs1(d['Назначение земли'])
      const color = fs1(d['Land color']) ?? fs1(d['Цвет земли']) ?? fs1(d['Цвет земли вторичка'])
      const z = classifyLandZone(purpose, color)
      if (z !== 'pink' && z !== 'tourism' && z !== 'commercial') return false
    }

    if (args.bedrooms_min != null || args.bedrooms_max != null) {
      const br = num(d['Комнаты']) ?? num(d['Спальни'])
      if (br == null) return false
      if (args.bedrooms_min != null && br < args.bedrooms_min) return false
      if (args.bedrooms_max != null && br > args.bedrooms_max) return false
    }

    if (args.price_min_usd != null || args.price_max_usd != null) {
      const price = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена'])
      if (price == null) return false
      if (args.price_min_usd != null && price < args.price_min_usd) return false
      if (args.price_max_usd != null && price > args.price_max_usd) return false
    }

    if (args.query) {
      const blob = [
        fs1(d['SEO:Title']) ?? '',
        fs1(d['ИИ Имя']) ?? '',
        fs1(d['Name']) ?? '',
        fs1(d['Project']) ?? '',
        fs1(d['Developer']) ?? '',
      ].join(' ').toLowerCase()
      if (!blob.includes(args.query.toLowerCase())) return false
    }

    return true
  })

  const photoManifest = photoBucket ? await loadPhotoManifest(photoBucket) : {}

  const sliced = filtered.slice(0, limit)
  const cards = sliced.map(r => {
    const d = r.data
    const slug = fs1(d['SEO:Slug'])!
    const title = fs1(d['SEO:Title']) ?? fs1(d['ИИ Имя']) ?? fs1(d['Name']) ?? fs1(d['Project']) ?? fs1(d['Developer']) ?? ''
    const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
    // Some villa rows have airtable record IDs in 'Location' (linked record).
    // Drop them so the chat card shows nothing instead of "recXXX".
    const district = districtRaw && /^rec[A-Za-z0-9]{14,}$/.test(districtRaw) ? null : districtRaw
    const bedrooms = num(d['Комнаты']) ?? num(d['Спальни']) ?? null
    const area = num(d['Площадь']) ?? null
    const priceUsd = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена']) ?? null
    const pricePerSqm = num(d['Цена м²']) ?? (priceUsd != null && area && area > 0 ? Math.round(priceUsd / area) : null)
    const photo = kind === 'developer'
      ? (r.logo_url ?? null)
      : (photoManifest[r.airtable_id]?.[0] ?? null)
    // Risk-relevant signals — Балина uses these in the assistant
    // commentary block to flag yellow-zone properties, near-expiry
    // leaseholds, missing PBG, etc.
    // Two zoning signals — Russian "Назначение земли" is primary
    // (editor explicitly states what's permitted), colour code is
    // fallback when the purpose isn't filled. classifyLandZone
    // checks them in that order.
    const landPurpose = fs1(d['Назначение земли'])
    const landColor = fs1(d['Land color']) ?? fs1(d['Цвет земли']) ?? fs1(d['Цвет земли вторичка'])
    const permitRaw = fs1(d['Разрешение']) ?? fs1(d['PBG'])
    const leaseRaw = fs1(d['Leasehold']) ?? fs1(d['Leashold'])
    const yieldRaw = num(d['Заявленная доходность'])
    return {
      kind,
      title: title.replace(/\s*\|\s*Balinsky\s*$/, '').trim(),
      url: `${SITE_URL}${pathPrefix}${slug}`,
      photo,
      district,
      bedrooms,
      area_sqm: area,
      price_usd: priceUsd,
      price_per_sqm_usd: pricePerSqm,
      rent_per_month_usd: null,
      land_zone: classifyLandZone(landPurpose, landColor),
      land_purpose: landPurpose,
      permit: permitRaw,
      lease_years: leaseRaw ? Number(leaseRaw) || null : null,
      completion_year: fs1(d['Year of completion']) ?? fs1(d['Year of completion ']) ?? null,
      status: fs1(d['Статус']),
      claimed_yield_pct: yieldRaw,
      // These four are populated post-hoc in attachInvestmentMetrics —
      // we need cards built first so we have district/bedrooms to
      // run the rental comp against.
      cap_rate_median: null,
      cap_rate_good: null,
      monthly_rent_comp_usd: null,
      monthly_rent_comp_count: null,
      district_median_price_per_sqm_usd: null,
      district_listings_count: null,
    }
  })
  await attachInvestmentMetrics(cards, kind, sliced.map(r => r.airtable_id))
  // District price/m² medians use the FULL `rows` set (not the
  // filtered+limited slice) so the benchmark reflects the whole
  // catalog, not just what matched the visitor's query.
  attachDistrictBenchmarks(cards, rows)
  return cards
}

// Median $/m² per district across the full catalog of this kind.
// Skips districts with fewer than 3 listings — too small to be a
// useful comparison. Mutates cards in place.
function attachDistrictBenchmarks(
  cards: ListingCard[],
  rows: { data: Record<string, unknown> }[],
): void {
  const byDistrict = new Map<string, number[]>()
  for (const r of rows) {
    const d = r.data
    if (d['Опубликовать'] !== true && d['Публикация'] !== true) continue
    const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
    if (!districtRaw || /^rec[A-Za-z0-9]{14,}$/.test(districtRaw)) continue
    const area = num(d['Площадь'])
    const priceUsd = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена'])
    const ppsm = num(d['Цена м²']) ?? (priceUsd != null && area && area > 0 ? priceUsd / area : null)
    if (ppsm == null || ppsm <= 0) continue
    const key = districtRaw.toLowerCase().trim()
    const arr = byDistrict.get(key) ?? []
    arr.push(ppsm)
    byDistrict.set(key, arr)
  }
  for (const card of cards) {
    if (!card.district) continue
    const arr = byDistrict.get(card.district.toLowerCase().trim())
    if (!arr || arr.length < 3) continue
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    card.district_median_price_per_sqm_usd = Math.round(median)
    card.district_listings_count = arr.length
  }
}

// Layer two of the search pipeline. Once the basic cards are built
// we attach rental economics so Балина can talk about both scenarios:
//   - per-day (Booking comps via batch-scores) — applies to villas
//     where the data pipeline produces a capRate.
//   - per-month (in-district rental comparison) — applies to villas
//     and apartments by averaging rentals with similar bedroom count
//     in the same district.
async function attachInvestmentMetrics(
  cards: ListingCard[],
  kind: ListingCard['kind'],
  airtableIds: string[],
): Promise<void> {
  // 1. Per-day cap rate (villa-only — apartments don't have a
  //    batch-score pipeline yet).
  if (kind === 'villa') {
    const scores = await loadAllVillaScores().catch(() => null)
    if (scores) {
      for (let i = 0; i < cards.length; i++) {
        const s = scores.get(airtableIds[i])
        if (s) {
          cards[i].cap_rate_median = s.capRate ?? null
          cards[i].cap_rate_good = s.goodCapRate ?? null
        }
      }
    }
  }

  // 2. Per-month rental comparables — same district + bedrooms ±1.
  if (kind === 'villa' || kind === 'apartment') {
    const rentals = await loadAllRental().catch(() => [])
    if (rentals.length === 0) return
    for (const card of cards) {
      if (!card.district || card.bedrooms == null) continue
      const dLower = card.district.toLowerCase()
      const matches = rentals.filter(r => {
        if (!r.location || !r.location.toLowerCase().includes(dLower)) return false
        if (r.bedrooms == null) return false
        return Math.abs(r.bedrooms - (card.bedrooms ?? 0)) <= 1
      })
      if (matches.length === 0) continue
      const avg = matches.reduce((s, r) => s + r.priceMonthUsd, 0) / matches.length
      card.monthly_rent_comp_usd = Math.round(avg)
      card.monthly_rent_comp_count = matches.length
    }
  }
}

// Classifies zoning into a small enum the model can reason about.
//
// Primary signal — the Russian purpose string ("Назначение земли")
// the editor fills explicitly per villa. Secondary signal — the raw
// colour code ("Land color"). The purpose is far more reliable
// because it spells out what the zoning actually allows in plain
// language; the colour code is a Bali-specific shorthand that maps
// inconsistently across editors.
//
// Output buckets — the only thing that matters for the user is
// "can I sdавать посуточно":
//   tourism / commercial → STR legal
//   yellow → residential only (no Booking, no Airbnb)
//   green → not for foreigners at all
//   unknown → ask, don't invent
function classifyLandZone(purpose: string | null, color: string | null): ListingCard['land_zone'] {
  // Step 1: try the Russian purpose text — most authoritative.
  if (purpose) {
    const p = purpose.toLowerCase()
    // Touristic/STR explicit phrasing
    if (p.includes('туристическ') || p.includes('посуточн')) return 'tourism'
    // Commercial — STR-friendly via commercial / pondok wisata permit
    if (p.includes('коммерч') || p.includes('бизнес')) return 'commercial'
    // Mixed-use ("Подходит для жилья, туризма и коммерции") — also STR-OK
    if (p.includes('жилья, туризма') || p.includes('смешан')) return 'commercial'
    // Residential ONLY — STR-illegal
    if (p.includes('проживания и долгосрочной') || p.includes('только для проживания')) return 'yellow'
    // Editor flagged "не определено" — fall through to color
    // Unknown — fall through to color
  }
  // Step 2: fall back to the colour code.
  if (color) {
    const s = color.toLowerCase()
    if (s.includes('yellow') || s.includes('жёлт') || s.includes('желт')
        || /\br-?\d/.test(s) || s.includes('residence') || s.includes('residential')) return 'yellow'
    if (s.includes('green') || s.includes('зелён') || s.includes('зелен') || s.includes('agricult')) return 'green'
    if (s.includes('pink') || s.includes('розов')) return 'pink'
    if (s.includes('tourism') || s.includes('туризм')) return 'tourism'
    if (s.includes('red') || s.includes('красн')
        || s.includes('orange') || s.includes('оранж')
        || /\bc-?\d/.test(s) || /\bк-?\d/.test(s)
        || s.includes('commercial') || s.includes('коммерч')
        || s.includes('pondok wisata')) return 'commercial'
  }
  return 'unknown'
}

async function searchRental(args: SearchArgs): Promise<ListingCard[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/rental/_rental.json`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json() as { items?: { id: string; slug: string; title: string; type: string | null; bedrooms: number | null; location: string | null; priceMonthUsd: number; photos: string[] }[] }
  const items = Array.isArray(j.items) ? j.items : []
  const limit = Math.min(args.limit ?? 6, 12)

  const filtered = items.filter(it => {
    if (args.district && (!it.location || !it.location.toLowerCase().includes(args.district.toLowerCase()))) return false
    if (args.bedrooms_min != null && (it.bedrooms == null || it.bedrooms < args.bedrooms_min)) return false
    if (args.bedrooms_max != null && (it.bedrooms == null || it.bedrooms > args.bedrooms_max)) return false
    if (args.price_min_usd != null && it.priceMonthUsd < args.price_min_usd) return false
    if (args.price_max_usd != null && it.priceMonthUsd > args.price_max_usd) return false
    if (args.query && !it.title.toLowerCase().includes(args.query.toLowerCase())) return false
    return true
  })

  return filtered.slice(0, limit).map<ListingCard>(it => ({
    kind: 'rental',
    title: it.title,
    url: `${SITE_URL}/ru/arenda/o/${it.slug}`,
    photo: it.photos?.[0] ?? null,
    district: it.location,
    bedrooms: it.bedrooms,
    area_sqm: null,
    price_usd: null,
    price_per_sqm_usd: null,
    rent_per_month_usd: it.priceMonthUsd,
    // Rental doesn't carry purchase-side risk fields.
    land_zone: null,
    land_purpose: null,
    permit: null,
    lease_years: null,
    completion_year: null,
    status: null,
    claimed_yield_pct: null,
    cap_rate_median: null,
    cap_rate_good: null,
    monthly_rent_comp_usd: null,
    monthly_rent_comp_count: null,
    district_median_price_per_sqm_usd: null,
    district_listings_count: null,
  }))
}

async function searchListings(args: SearchArgs): Promise<ListingCard[]> {
  let raw: ListingCard[]
  switch (args.kind) {
    case 'villa':     raw = await searchSupabaseTable('raw_villas', 'villa', args, '/ru/villy/o/', 'villa-photos'); break
    case 'apartment': raw = await searchSupabaseTable('raw_apartments', 'apartment', args, '/ru/apartamenty/o/', 'apartment-photos'); break
    case 'complex':   raw = await searchSupabaseTable('raw_complexes', 'complex', args, '/ru/zhilye-kompleksy/o/', 'complex-photos'); break
    case 'developer': raw = await searchSupabaseTable('raw_developers', 'developer', args, '/ru/zastrojshhiki/', null); break
    case 'rental':    raw = await searchRental(args); break
    default:          return []
  }
  // Drop already-shown listings when the model passes exclude_urls.
  // Match URL-only — slug-suffix on /ru/villy/o/foo matches whether
  // the model passed the bare path or a full https URL.
  if (args.exclude_urls?.length) {
    const stop = new Set(args.exclude_urls.map(u => u.replace(/^https?:\/\/[^/]+/, '')))
    raw = raw.filter(c => !stop.has(c.url.replace(/^https?:\/\/[^/]+/, '')))
  }
  return raw
}

type FeedbackArgs = {
  kind: 'like' | 'dislike' | 'bug' | 'idea'
  message: string
  page?: string
}

async function submitFeedback(args: FeedbackArgs): Promise<{ ok: boolean }> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const rand = Math.random().toString(36).slice(2, 8)
  const key = `${ts}-${args.kind}-${rand}.json`
  const body = JSON.stringify({
    receivedAt: new Date().toISOString(),
    source: 'consultant',
    ...args,
  })
  try {
    await sb.storage.from('feedback').upload(key, body, {
      contentType: 'application/json', upsert: false,
    })
    return { ok: true }
  } catch (err) {
    console.error('[consultant] feedback upload failed:', err)
    return { ok: false }
  }
}

export async function ensureFeedbackBucket() {
  const { data: list } = await sb.storage.listBuckets()
  if (!list?.some(b => b.name === 'feedback')) {
    await sb.storage.createBucket('feedback', { public: false }).catch(() => null)
  }
}

export async function executeToolCall(name: string, rawArgs: string): Promise<string> {
  let args: unknown
  try { args = JSON.parse(rawArgs) } catch { return JSON.stringify({ error: 'invalid_arguments' }) }
  if (name === 'search_listings') {
    const result = await searchListings(args as SearchArgs)
    return JSON.stringify({ results: result })
  }
  if (name === 'submit_feedback') {
    const result = await submitFeedback(args as FeedbackArgs)
    return JSON.stringify(result)
  }
  return JSON.stringify({ error: 'unknown_tool' })
}
