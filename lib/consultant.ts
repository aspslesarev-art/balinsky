// Server-side system prompt + tool definitions + tool executor for the
// chat consultant. Lives off Supabase data the rest of the site uses.

import { createClient } from '@supabase/supabase-js'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { loadAllVillaScores } from './investment/batch-scores'
import { isHiddenDeveloper } from './hidden-developers'
import { loadReviewHeat, type HeatCell } from './reviews-heat'
import { loadAllRental } from './rental'
import { cdnManifestUrl } from './photo-cdn'

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
  //   permit            — legacy single string ("PBG", "Заявка PBG",
  //                       "SLF", "Заявка SLF", "нет"). Kept for
  //                       backwards-compat — model may read it directly.
  //   permit_pbg        — 'есть' | 'заявка' | 'нет' | null
  //   permit_slf        — 'есть' | 'заявка' | 'нет' | null
  //   permit_pbg_number — actual PBG certificate id when known
  //   permit_summary    — one phrase Балина can quote verbatim to the
  //                       visitor, e.g. «PBG есть, SLF — на стадии заявки»
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
  permit_pbg: 'есть' | 'заявка' | 'нет' | null
  permit_slf: 'есть' | 'заявка' | 'нет' | null
  permit_pbg_number: string | null
  permit_summary: string | null
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
  // Free-form copy from Airtable's "SEO Text" / "Notes" field —
  // capped to keep the search-results payload bounded. Model uses
  // this to comment on what's actually in the unit (interior, view,
  // pool, distance to specific landmarks) without having to call
  // get_listing_full first.
  description_preview: string | null
  // Geographic anchors. lat/lng come from Airtable's Geo / Geo 2
  // columns. distance_to_beach_km is computed via haversine to the
  // nearest beach in BEACH_REFS (canonical Bali surf + family
  // beach coordinates). These let Балина answer "сколько минут до
  // моря" honestly with a number instead of guessing from the
  // district name.
  lat: number | null
  lng: number | null
  distance_to_beach_km: number | null
  nearest_beach: string | null
  // 0–100 "how lively is the area around this object" from our tourism map
  // (Google-reviewed POI density: cafés, bars, beach clubs, attractions).
  // High = strong tourist footfall → better rental occupancy; low = quiet.
  tourism_score?: number | null
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
          slug: { type: 'string', description: 'Точный slug объекта — используй когда нужно достать ОДИН конкретный объект (например, в системе указана текущая страница и посетитель спрашивает «про эту виллу»). Возвращает максимум 1 результат, остальные фильтры игнорируются.' },
          near_lat: { type: 'number', description: 'Широта точки-якоря (например, координаты Atlas Beach Club или другого ориентира). Используй вместе с near_lng + max_distance_km, чтобы вернуть только объекты в радиусе от этой точки. Координату возьми через find_landmark.' },
          near_lng: { type: 'number', description: 'Долгота точки-якоря. См. near_lat.' },
          max_distance_km: { type: 'number', description: 'Радиус в километрах от near_lat/near_lng. По умолчанию 1.5 (пешком). Используй 0.5 для строго-беговой доступности, 3 — для скутер-доступности.' },
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
          status: {
            type: 'string',
            enum: ['ready', 'building', 'planned', 'any'],
            description: 'Готовность стройки (жёсткий фильтр по факту из базы): ready = уже ПОСТРОЕН/сдан (только готовые, БЕЗ строящихся!), building = строится, planned = под заказ / на стадии планирования / котлован, any = не важно. Ставь ready, когда клиент просит "готовое", "уже построено", "сдан", "можно заехать/сдавать сейчас". Никогда не показывай строящиеся, если просили готовое.',
          },
          require_pbg: {
            type: 'boolean',
            description: 'true = ТОЛЬКО объекты, у которых PBG (разрешение на строительство) уже ПОЛУЧЕН (не "заявка", не "нет"). Ставь при "с PBG", "с документами", "легально", "без рисков по разрешениям".',
          },
          require_slf: {
            type: 'boolean',
            description: 'true = ТОЛЬКО объекты с уже полученным SLF (сертификат пригодности, выше PBG — без него нельзя легально сдавать). Ставь при "с SLF", "полностью узаконено", "можно официально сдавать".',
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
      name: 'find_landmark',
      description: 'Найти координаты популярного Бали-ориентира (пляжный клуб, ресторан, школа сёрфинга, торговый центр, аэропорт): Atlas Beach Club, FINNS, La Brisa, Old Man\'s, Pretty Poison, Single Fin, Potato Head, Nasi Crew, Pepito, La Baracca, Sundays Beach Club, Karma Beach, Rock Bar и т.п. Возвращает {lat, lng, district, name}. Используй ВСЕГДА когда посетитель спрашивает про близость к конкретному месту по имени, а потом передай координаты в search_listings({near_lat, near_lng, max_distance_km}). Не выдумывай координаты — если не нашлось, скажи об этом честно.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Имя ориентира как сказал посетитель (свободный текст, без необходимости точного написания)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_listing_full',
      description: 'Загрузить ПОЛНЫЕ данные одного конкретного объекта — всё что видно на его странице сайта (готовность строительства, разрешения, плановые сроки сдачи, описание, удобства, презентации, рендеры, расстояния до аэропорта и т.д.). Используй когда посетитель задаёт детальный вопрос про конкретный объект ("процент готовности у X?", "что внутри Y?", "когда сдают Z?", "есть ли бассейн / охрана / парковка?", "что в презентации?"). Тяжелее search_listings, но возвращает на порядок больше деталей. По slug + kind.',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['villa', 'apartment', 'complex', 'developer', 'rental'],
            description: 'Тип объекта',
          },
          slug: { type: 'string', description: 'Точный SEO-slug объекта (как в URL после /o/)' },
        },
        required: ['kind', 'slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'semantic_search',
      description: 'Семантический поиск по каталогу — НЕ field-based, а по СМЫСЛУ описания. Используй когда посетитель упоминает мягкие/качественные атрибуты, которые не маппятся на структурные поля Airtable: «инфинити-бассейн», «вид на закат», «среди джунглей», «тропический минимализм», «для digital-nomad пары», «семейная атмосфера», «лофт-формат», «крыша с jacuzzi», «pet-friendly». Эмбеддит запрос через text-embedding-3-large и возвращает топ-N объектов по косинусной близости описаний. Жёсткие фильтры (район, цена, спальни) — это для search_listings. Если запрос смешанный («вилла в Чангу с инфинити-бассейном до 600k») — сначала зови semantic_search со всем текстом запроса, потом мягко фильтруй результаты по цене / району в своём ответе (или вызывай оба tool и мерджи).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Свободно-текстовый запрос как сказал посетитель — все мягкие признаки, описание стиля, образ жизни и т.д.' },
          kinds: {
            type: 'array',
            items: { type: 'string', enum: ['villa', 'apartment', 'complex'] },
            description: 'Ограничить выдачу одним или несколькими типами объектов. По умолчанию ищем по всем трём.',
          },
          limit: { type: 'number', description: 'Сколько вернуть (по умолчанию 8, максимум 20)' },
        },
        required: ['query'],
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
  slug?: string
  limit?: number
  exclude_urls?: string[]
  str_only?: boolean
  status?: 'ready' | 'building' | 'planned' | 'any'
  require_pbg?: boolean
  require_slf?: boolean
  max_distance_to_beach?: 'beachfront' | 'walking' | 'scooter' | 'any'
  near_lat?: number
  near_lng?: number
  max_distance_km?: number
}

function fs1(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return fs1((v as Record<string, unknown>).value)
  return null
}
// Airtable's "Geo" / "Geo 2" columns hold one number each as text
// ("-8.681307" / "115.260389"). Sometimes editors paste both
// coordinates into one cell — pull the first parseable float so
// we get something usable either way.
function parseGeoStr(v: unknown): number | null {
  const s = fs1(v)
  if (!s) return null
  const m = s.match(/-?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

// Canonical Bali beach coordinates — surf + family-friendly mix.
// Used to compute "nearest beach" + km distance per card so the
// model can answer "сколько до моря" with a real number.
const BEACH_REFS: { name: string; lat: number; lng: number }[] = [
  { name: 'Echo Beach (Canggu)',          lat: -8.6515, lng: 115.1305 },
  { name: 'Berawa Beach',                 lat: -8.6593, lng: 115.1378 },
  { name: 'Pererenan Beach',              lat: -8.6394, lng: 115.1233 },
  { name: 'Batu Bolong Beach (Canggu)',   lat: -8.6582, lng: 115.1300 },
  { name: 'Nyanyi Beach',                 lat: -8.6253, lng: 115.1041 },
  { name: 'Seseh Beach',                  lat: -8.6133, lng: 115.0960 },
  { name: 'Tanah Lot',                    lat: -8.6212, lng: 115.0867 },
  { name: 'Seminyak Beach',               lat: -8.6911, lng: 115.1672 },
  { name: 'Kuta Beach',                   lat: -8.7180, lng: 115.1690 },
  { name: 'Sanur Beach',                  lat: -8.6878, lng: 115.2630 },
  { name: 'Tanjung Benoa',                lat: -8.7635, lng: 115.2266 },
  { name: 'Nusa Dua Beach',               lat: -8.8003, lng: 115.2294 },
  { name: 'Jimbaran Bay',                 lat: -8.7896, lng: 115.1640 },
  { name: 'Balangan Beach (Bukit)',       lat: -8.7910, lng: 115.1297 },
  { name: 'Dreamland Beach (Bukit)',      lat: -8.7970, lng: 115.1110 },
  { name: 'Bingin Beach (Bukit)',         lat: -8.8118, lng: 115.1133 },
  { name: 'Padang Padang (Bukit)',        lat: -8.8121, lng: 115.1066 },
  { name: 'Uluwatu Beach',                lat: -8.8290, lng: 115.0853 },
  { name: 'Pandawa Beach',                lat: -8.8467, lng: 115.1900 },
  { name: 'Melasti Beach',                lat: -8.8456, lng: 115.1670 },
  { name: 'Green Bowl Beach',             lat: -8.8559, lng: 115.1814 },
  { name: 'Amed Beach',                   lat: -8.3387, lng: 115.6655 },
  { name: 'Lovina Beach',                 lat: -8.1576, lng: 115.0264 },
]

function nearestBeach(lat: number, lng: number): { name: string; km: number } | null {
  let best: { name: string; km: number } | null = null
  for (const b of BEACH_REFS) {
    const km = haversineKm(lat, lng, b.lat, b.lng)
    if (!best || km < best.km) best = { name: b.name, km: Math.round(km * 100) / 100 }
  }
  return best
}

// Cross-script + Whisper-tolerant query matching for search_listings.
//
// Bug case that motivated this: visitor asked "Сравни Maison Boheme и
// Origins" via voice. Whisper transcribed it as "Mason, Богем и
// Origins". Plain blob.includes() couldn't match because:
//   - "mason" is not a substring of "maison" (an "i" got dropped)
//   - "богем" is Cyrillic, "boheme" is Latin
// Both situations are common with voice input + foreign brand names.
//
// Strategy:
//   1. Tokenize query + haystack into words ≥3 chars.
//   2. Generate Cyrillic→Latin transliteration variants of each
//      Russian token (Russian г can land as g/gh/h, ё as yo/e, etc.)
//      so "богем" yields "bogem", "boghem", "bohem".
//   3. For every query token, accept a row if ANY haystack token
//      is a substring match OR within Levenshtein distance 1 (for
//      tokens of length ≥4) of a query variant.
//   4. ALL query tokens must match — semantically equivalent to
//      the old "must contain phrase" rule, just split per word.
const TRANSLIT: Record<string, string[]> = {
  а:['a'], б:['b'], в:['v'], г:['g','gh','h'], д:['d'],
  е:['e','ye'], ё:['yo','e'], ж:['zh','j'], з:['z'],
  и:['i'], й:['i','y','j'], к:['k'], л:['l'], м:['m'],
  н:['n'], о:['o'], п:['p'], р:['r'], с:['s'], т:['t'],
  у:['u'], ф:['f'], х:['h','kh'], ц:['ts','c'], ч:['ch'],
  ш:['sh'], щ:['shch','sch'], ъ:[''], ы:['y','i'], ь:[''],
  э:['e'], ю:['yu','iu','u'], я:['ya','ia','a'],
}

function transliterateVariants(s: string): string[] {
  const lower = s.toLowerCase()
  let variants = ['']
  for (const c of lower) {
    const cands = TRANSLIT[c] ?? [c]
    const next: string[] = []
    for (const v of variants) {
      for (const cand of cands) next.push(v + cand)
    }
    variants = next
    // Explosion guard — limit branches per token.
    if (variants.length > 24) variants = variants.slice(0, 24)
  }
  return variants
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(t => t.length >= 3)
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = new Array(b.length + 1)
  let cur = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    [prev, cur] = [cur, prev]
  }
  return prev[b.length]
}

function fuzzyQueryMatch(query: string, haystack: string): boolean {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return true
  // Pre-compute haystack tokens once, including transliteration so
  // a Latin haystack can match a Cyrillic query and vice versa.
  const hayBaseTokens = tokenize(haystack)
  const hayTokens = new Set<string>(hayBaseTokens)
  for (const t of hayBaseTokens) {
    for (const v of transliterateVariants(t)) hayTokens.add(v)
  }
  for (const qt of queryTokens) {
    // Generate candidate forms of the query token: original + all
    // transliterations. For a Cyrillic query word like "богем" this
    // gives {bogem, boghem, bohem, ...}; for a Latin word, just itself.
    const qVariants = new Set<string>([qt, ...transliterateVariants(qt)])

    let matched = false
    outer: for (const qv of qVariants) {
      for (const ht of hayTokens) {
        if (ht.includes(qv) || qv.includes(ht)) { matched = true; break outer }
        if (qv.length >= 4 && ht.length >= 4 && Math.abs(qv.length - ht.length) <= 1
            && levenshtein(qv, ht) <= 1) { matched = true; break outer }
      }
    }
    if (!matched) return false
  }
  return true
}

// Curated Bali landmark coordinates — popular beach clubs, surf
// schools, restaurants, shopping. Used by find_landmark to translate
// "near Atlas Beach Club" into an actual lat/lng anchor for
// search_listings near_lat/near_lng. Hand-picked from Google Maps;
// covers the 80 % of cases the visitor actually asks about. For
// anything not in the list we fall back to Google Places Text
// Search if NEXT_PUBLIC_GOOGLE_MAPS_KEY is configured.
type Landmark = { name: string; aliases: string[]; lat: number; lng: number; district: string }
const LANDMARKS: Landmark[] = [
  // Beach clubs
  { name: 'Atlas Beach Club',     aliases: ['atlas', 'атлас'],                                 lat: -8.6608, lng: 115.1378, district: 'Berawa' },
  { name: 'FINNS Beach Club',     aliases: ['finns', 'finn\'s', 'финнс', 'финс'],              lat: -8.6627, lng: 115.1390, district: 'Berawa' },
  { name: 'La Brisa',             aliases: ['la brisa', 'лабриса', 'ла бриса'],                lat: -8.6485, lng: 115.1245, district: 'Echo Beach (Canggu)' },
  { name: 'Potato Head Beach Club', aliases: ['potato head', 'потейто', 'патейто'],            lat: -8.6826, lng: 115.1591, district: 'Seminyak' },
  { name: 'Karma Beach Club',     aliases: ['karma', 'карма'],                                 lat: -8.8120, lng: 115.0865, district: 'Uluwatu' },
  { name: 'Sundays Beach Club',   aliases: ['sundays', 'сандейс', 'сандэйс'],                  lat: -8.8403, lng: 115.0875, district: 'Bukit (Ungasan)' },
  { name: 'OMNIA Bali',           aliases: ['omnia', 'омния', 'омниа'],                        lat: -8.8417, lng: 115.0850, district: 'Bukit (Uluwatu)' },
  { name: 'Savaya Bali',          aliases: ['savaya', 'савайя', 'савайа'],                     lat: -8.8487, lng: 115.0850, district: 'Bukit (Uluwatu)' },
  { name: 'Rock Bar (AYANA)',     aliases: ['rock bar', 'рок бар', 'ayana', 'аяна'],           lat: -8.7855, lng: 115.1413, district: 'Jimbaran' },
  { name: 'Single Fin Uluwatu',   aliases: ['single fin', 'сингл фин', 'singlefin'],           lat: -8.8127, lng: 115.0902, district: 'Uluwatu' },
  // Cafes / restaurants
  { name: 'Old Man\'s Canggu',    aliases: ['old man', 'old mans', 'олд мэн', 'олдмэн'],       lat: -8.6572, lng: 115.1314, district: 'Batu Bolong (Canggu)' },
  { name: 'Pretty Poison',        aliases: ['pretty poison', 'претти пойзон'],                 lat: -8.6450, lng: 115.1342, district: 'Pererenan' },
  { name: 'The Lawn Canggu',      aliases: ['the lawn', 'лаун', 'лон'],                        lat: -8.6535, lng: 115.1319, district: 'Berawa' },
  { name: 'Nasi Crew',            aliases: ['nasi crew', 'наси крю'],                          lat: -8.6505, lng: 115.1369, district: 'Berawa' },
  { name: 'Pepito',               aliases: ['pepito', 'пепито'],                               lat: -8.6601, lng: 115.1390, district: 'Canggu (Tibubeneng)' },
  { name: 'Lacalita',             aliases: ['lacalita', 'la calita', 'лакалита'],              lat: -8.6498, lng: 115.1311, district: 'Berawa' },
  { name: 'La Baracca',           aliases: ['la baracca', 'ла баракка'],                       lat: -8.6577, lng: 115.1289, district: 'Batu Bolong (Canggu)' },
  { name: 'Crate Cafe',           aliases: ['crate', 'крейт'],                                 lat: -8.6447, lng: 115.1361, district: 'Pererenan' },
  { name: 'Milk and Madu',        aliases: ['milk and madu', 'milk & madu', 'милк маду'],      lat: -8.6478, lng: 115.1379, district: 'Berawa' },
  // Surf
  { name: 'Echo Beach',           aliases: ['echo beach', 'echo', 'эко бич', 'эхо бич'],       lat: -8.6515, lng: 115.1305, district: 'Echo Beach (Canggu)' },
  { name: 'Berawa Beach',         aliases: ['berawa beach', 'берава бич'],                     lat: -8.6593, lng: 115.1378, district: 'Berawa' },
  { name: 'Padang Padang Beach',  aliases: ['padang padang', 'паданг паданг'],                 lat: -8.8121, lng: 115.1066, district: 'Bukit (Padang Padang)' },
  { name: 'Bingin Beach',         aliases: ['bingin', 'бингин'],                               lat: -8.8118, lng: 115.1133, district: 'Bukit (Bingin)' },
  { name: 'Uluwatu Temple',       aliases: ['uluwatu temple', 'храм улуват', 'pura uluwatu'],  lat: -8.8290, lng: 115.0853, district: 'Uluwatu' },
  // Shopping / hubs
  { name: 'Beachwalk Kuta',       aliases: ['beachwalk', 'бичволк'],                           lat: -8.7224, lng: 115.1671, district: 'Kuta' },
  { name: 'Samasta Lifestyle',    aliases: ['samasta', 'самаста'],                             lat: -8.7813, lng: 115.1597, district: 'Jimbaran' },
  { name: 'Discovery Mall',       aliases: ['discovery mall', 'дискавери молл'],               lat: -8.7320, lng: 115.1670, district: 'Kuta' },
  // Schools / hospitals
  { name: 'Green School',         aliases: ['green school', 'грин скул'],                      lat: -8.5176, lng: 115.2447, district: 'Sibang Kaja' },
  { name: 'BIS (Bali Island School)', aliases: ['bali island school', 'bis bali'],             lat: -8.6495, lng: 115.2354, district: 'Sanur' },
  { name: 'Sanglah Hospital',     aliases: ['sanglah', 'санглах'],                             lat: -8.6862, lng: 115.2126, district: 'Denpasar' },
  { name: 'BIMC Nusa Dua',        aliases: ['bimc nusa dua'],                                  lat: -8.7920, lng: 115.2280, district: 'Nusa Dua' },
  { name: 'BIMC Kuta',            aliases: ['bimc kuta'],                                      lat: -8.7345, lng: 115.1782, district: 'Kuta' },
  { name: 'Ngurah Rai Airport',   aliases: ['airport', 'аэропорт', 'denpasar airport', 'нгура рай'], lat: -8.7467, lng: 115.1667, district: 'Tuban' },
]

async function findLandmark(name: string): Promise<{ lat: number; lng: number; name: string; district: string; source: 'curated' | 'google' } | { error: string }> {
  const normalized = name.toLowerCase().trim()
  // 1. Curated exact-or-fuzzy match (uses fuzzyQueryMatch on each alias).
  for (const l of LANDMARKS) {
    const haystack = [l.name, ...l.aliases].join(' ')
    if (fuzzyQueryMatch(normalized, haystack)) {
      return { lat: l.lat, lng: l.lng, name: l.name, district: l.district, source: 'curated' }
    }
  }
  // 2. Google Places Text Search fallback (only if API key configured).
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!key) return { error: 'not_in_curated_list' }
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name + ' Bali')}&key=${key}`
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return { error: `google_places_${r.status}` }
    const j = await r.json() as { results?: Array<{ name: string; geometry?: { location?: { lat: number; lng: number } }; vicinity?: string; formatted_address?: string }> }
    const top = j.results?.[0]
    if (!top?.geometry?.location) return { error: 'not_found_via_google' }
    return {
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      name: top.name,
      district: top.vicinity ?? top.formatted_address ?? '',
      source: 'google',
    }
  } catch {
    return { error: 'google_lookup_failed' }
  }
}

// Inline haversine — same formula as lib/competitor-utils.ts but
// kept local so consultant.ts doesn't pick up a peer-module dep.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/\s/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length) return num(v[0])
  return null
}

// Sample the tourism heatmap at a listing's coordinates → 0–100: how much
// reviewed-POI activity sits within ~1 km. Sum of nearby cell weights (so a
// dense cluster beats a lone hot spot), normalised by the single hottest cell
// ×2 with a sqrt curve. Calibrated against real villa coords — Berawa ~85,
// Sanur ~52, Ubud ~36, Uluwatu ~26 — so the 30/55 thresholds discriminate.
function tourismDensityAt(lat: number | null, lng: number | null, heat: { cells: HeatCell[]; max: number }): number | null {
  if (lat == null || lng == null || !heat.cells.length) return null
  let trueMax = 1
  for (const c of heat.cells) if (c.weight > trueMax) trueMax = c.weight
  let sum = 0
  for (const c of heat.cells) if (haversineKm(lat, lng, c.lat, c.lng) <= 1.0) sum += c.weight
  if (sum <= 0) return 0
  return Math.round(Math.min(1, Math.sqrt(sum / (trueMax * 2))) * 100)
}

// Map the freeform `Статус` / `Готовность` field to a stable bucket so the
// search status-filter is deterministic. Unknown / empty → null (a strict
// status ask then drops the row rather than guessing it's ready).
function normalizeStatus(raw: string | null): 'ready' | 'building' | 'planned' | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (/постро|сдан|готов|заверш|complet|built|ready|done/.test(s)) return 'ready'
  if (/строит|строящ|возвод|in progress|under con|building/.test(s)) return 'building'
  if (/заказ|план|котлован|проект|pre.?sale|off.?plan|офф.?план|planned/.test(s)) return 'planned'
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
  const limit = Math.min(args.limit ?? 5, 8)

  const filtered = rows.filter(r => {
    const d = r.data
    if (d['Опубликовать'] !== true && d['Публикация'] !== true) return false
    if (isHiddenDeveloper(fs1(d['Developer1']), fs1(d['Developer']))) return false
    const slug = fs1(d['SEO:Slug'])
    if (!slug || slug.startsWith('-')) return false

    // Exact-slug short-circuit: when the model passes `slug` it wants
    // ONE listing (the one the visitor is currently viewing). Skip
    // every other filter — a slug match is the strongest signal we
    // have and re-filtering by district / bedrooms could exclude a
    // legitimate hit if Airtable's metadata disagrees with the URL.
    if (args.slug) return slug === args.slug

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

    // Build-status filter — "готовое" must mean ONLY ready, never under
    // construction. Status lives in `Статус` (villas/apts) or `Готовность`
    // (complexes). Anything we can't classify is dropped under a strict ask.
    if (args.status && args.status !== 'any') {
      if (normalizeStatus(fs1(d['Статус']) ?? fs1(d['Готовность'])) !== args.status) return false
    }

    // Permit filter — "с PBG" / "с SLF" must be a hard fact from the base,
    // not a guess. parsePermitStatus turns the raw field into есть/заявка/нет.
    if (args.require_pbg || args.require_slf) {
      const permitRaw = fs1(d['Разрешение']) ?? fs1(d['Разрешительные документы']) ?? fs1(d['PBG'])
      const ps = parsePermitStatus(permitRaw)
      if (args.require_pbg && ps.pbg !== 'есть') return false
      if (args.require_slf && ps.slf !== 'есть') return false
    }

    if (args.query) {
      const blob = [
        fs1(d['SEO:Title']) ?? '',
        fs1(d['ИИ Имя']) ?? '',
        fs1(d['Name']) ?? '',
        fs1(d['Project']) ?? '',
        fs1(d['Developer']) ?? '',
      ].join(' ')
      if (!fuzzyQueryMatch(args.query, blob)) return false
    }

    // Radius-from-landmark filter. When the visitor asked "near
    // Atlas Beach Club", find_landmark returns its lat/lng and the
    // model passes it here as near_lat/near_lng + max_distance_km.
    // Default radius is 1.5 km — comfortable scooter / 15-min walk.
    //
    // Lenient mode: if a row has no Geo coords AND the model also
    // passed args.district (which find_landmark returns), accept
    // it on district match — Airtable geo coverage is patchy and
    // strict reject would zero the result for popular venues.
    if (args.near_lat != null && args.near_lng != null) {
      const lat = parseGeoStr(d['Geo'])
      const lng = parseGeoStr(d['Geo 2'])
      const maxKm = typeof args.max_distance_km === 'number' && args.max_distance_km > 0 ? args.max_distance_km : 1.5
      if (lat == null || lng == null) {
        // Fallback to district hint if available; otherwise drop.
        if (!args.district) return false
        // matchDistrict already ran above when args.district was set
        // — we wouldn't be here if it didn't pass.
      } else {
        const km = haversineKm(lat, lng, args.near_lat, args.near_lng)
        if (km > maxKm) return false
      }
    }

    return true
  })

  const photoManifest = photoBucket ? await loadPhotoManifest(photoBucket) : {}
  // Tourism map (Google-reviewed POI density) — used to tell the model how
  // lively the area around each result is. Cached loader; never blocks search.
  const heat = await loadReviewHeat().catch(() => ({ cells: [] as HeatCell[], max: 1 }))

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
    const pricePerSqmRaw = num(d['Цена м²']) ?? (priceUsd != null && area && area > 0 ? priceUsd / area : null)
    const pricePerSqm = pricePerSqmRaw != null ? Math.round(pricePerSqmRaw) : null
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
    // Per-listing permits. The editor uses ONE composite string in
    // `Разрешение` / `Разрешительные документы` ("нет" / "Заявка PBG"
    // / "PBG" / "Заявка SLF" / "SLF") plus the actual PBG certificate
    // id in a separate `PBG` column on complexes. parsePermitStatus()
    // turns that into a structured {pbg, slf, summary, pbgNumber}
    // tuple so Балина can speak about each line item in plain words
    // without having to parse the raw value herself.
    const permitRaw = fs1(d['Разрешение']) ?? fs1(d['Разрешительные документы']) ?? fs1(d['PBG'])
    const pbgNumber = fs1(d['PBG'])
    const permitStatus = parsePermitStatus(permitRaw)
    const leaseRaw = fs1(d['Leasehold']) ?? fs1(d['Leashold'])
    const yieldRaw = num(d['Заявленная доходность'])
    // Compact preview of the editor-written description so the model
    // can comment on amenities / interior / proximity to landmarks
    // without a follow-up tool call. ~400 chars keeps the per-card
    // token cost under control while giving 2-3 sentences of useful
    // context. Full text is reachable via get_listing_full(slug).
    const seoText = fs1(d['SEO Text']) ?? fs1(d['Notes']) ?? fs1(d['Описание'])
    const descriptionPreview = seoText
      ? (seoText.length > 220 ? seoText.slice(0, 220).trim() + '…' : seoText.trim())
      : null
    // Geo: Airtable stores lat in 'Geo' and lng in 'Geo 2' as
    // free-text "decimal[, ...]" — parseGeoStr extracts the first
    // float. Distance to beach is the closest of BEACH_REFS via
    // haversine, plus the name of which one matched so the model
    // can say "5 минут до Echo Beach".
    const lat = parseGeoStr(d['Geo'])
    const lng = parseGeoStr(d['Geo 2'])
    const beach = lat != null && lng != null ? nearestBeach(lat, lng) : null
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
      permit_pbg: permitStatus.pbg,
      permit_slf: permitStatus.slf,
      permit_pbg_number: pbgNumber && pbgNumber.toLowerCase() !== 'нет' ? pbgNumber : null,
      permit_summary: permitStatus.summary,
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
      description_preview: descriptionPreview,
      lat,
      lng,
      distance_to_beach_km: beach?.km ?? null,
      nearest_beach: beach?.name ?? null,
      tourism_score: tourismDensityAt(lat, lng, heat),
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
    if (isHiddenDeveloper(fs1(d['Developer1']), fs1(d['Developer']))) continue
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
        // Drop garbage prices ($0.0013, $0, a mis-typed nightly rate) so they
        // can't pollute the comp set.
        if (!(r.priceMonthUsd >= 200 && r.priceMonthUsd <= 30000)) return false
        return Math.abs(r.bedrooms - (card.bedrooms ?? 0)) <= 1
      })
      if (matches.length === 0) continue
      // Median, not mean — a couple of luxury outliers shouldn't drag the
      // "fair monthly rent" estimate up. For a new/quality villa the prompt
      // positions the answer at the upper part of the comp range.
      const sorted = matches.map(r => r.priceMonthUsd).sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      card.monthly_rent_comp_usd = Math.round(median)
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
// Editors stuff one of five strings into the `Разрешение` /
// `Разрешительные документы` field: "нет" / "Заявка PBG" / "PBG" /
// "Заявка SLF" / "SLF". The progression is linear:
//   нет          → no permits at all (highest risk)
//   Заявка PBG   → PBG (build permit) applied, not granted yet
//   PBG          → PBG granted; SLF not started
//   Заявка SLF   → PBG granted, SLF (occupancy certificate) in progress
//   SLF          → both granted; legally rentable
// We split that into per-permit slots so Балина can speak about PBG
// and SLF independently ("PBG получен, SLF на стадии заявки") instead
// of paraphrasing one combined string.
function parsePermitStatus(raw: string | null): {
  pbg: 'есть' | 'заявка' | 'нет' | null
  slf: 'есть' | 'заявка' | 'нет' | null
  summary: string | null
} {
  if (!raw) return { pbg: null, slf: null, summary: null }
  const s = raw.toLowerCase().trim()
  if (!s || s === '—' || s === '-') return { pbg: null, slf: null, summary: null }
  if (s === 'нет' || s === 'no' || s === 'none') {
    return { pbg: 'нет', slf: 'нет', summary: 'Разрешений на стройку нет' }
  }
  const hasSlf = s.includes('slf') || s.includes('сертификат пригодн') || s.includes('сертификат соответ')
  const hasPbg = s.includes('pbg') || s.includes('imb') || s.includes('разрешение на стройку') || s.includes('разрешение на строительство')
  const isApp = s.includes('заявк') || s.includes('appli') || s.includes('в процесс') || s.includes('оформл')
  // SLF strictly subsumes PBG — you can't get SLF without PBG.
  if (hasSlf && !isApp) return { pbg: 'есть', slf: 'есть', summary: 'PBG и SLF получены — объект легален для аренды' }
  if (hasSlf && isApp)  return { pbg: 'есть', slf: 'заявка', summary: 'PBG есть, SLF на стадии заявки' }
  if (hasPbg && !isApp) return { pbg: 'есть', slf: 'нет', summary: 'PBG получен; SLF не подавали' }
  if (hasPbg && isApp)  return { pbg: 'заявка', slf: 'нет', summary: 'PBG — на стадии заявки' }
  // Looks like a raw PBG certificate number (e.g. SK-PBG-510306-…).
  if (/^[a-z0-9-]{6,}$/.test(s)) return { pbg: 'есть', slf: 'нет', summary: 'PBG получен (есть номер), SLF не подавали' }
  return { pbg: null, slf: null, summary: raw }
}

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
  const r = await fetch(cdnManifestUrl(url, 600), { cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json() as { items?: { id: string; slug: string; title: string; type: string | null; bedrooms: number | null; location: string | null; priceMonthUsd: number; photos: string[] }[] }
  const items = Array.isArray(j.items) ? j.items : []
  const limit = Math.min(args.limit ?? 5, 8)

  const filtered = items.filter(it => {
    if (args.slug) return it.slug === args.slug
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
    permit_pbg: null,
    permit_slf: null,
    permit_pbg_number: null,
    permit_summary: null,
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
    description_preview: null,
    lat: null,
    lng: null,
    distance_to_beach_km: null,
    nearest_beach: null,
  }))
}

async function searchListings(args: SearchArgs): Promise<ListingCard[]> {
  let raw = await searchOneKind(args)

  // Server-side fan-out for name searches. The model frequently
  // queries `kind=villa` first and gives up after 0 hits — but the
  // visitor's "Surfside" might be in raw_complexes, "Maison Boheme"
  // sits across both. When `query` is set AND we got 0 hits AND the
  // visitor didn't explicitly pick another bucket via slug, retry
  // across the other primary kinds (villa → apartment → complex).
  if (raw.length === 0 && args.query && args.query.trim().length >= 3 && !args.slug) {
    const tried = new Set([args.kind])
    const fallbackKinds: SearchArgs['kind'][] = ['villa', 'apartment', 'complex']
    for (const k of fallbackKinds) {
      if (tried.has(k)) continue
      const probe = await searchOneKind({ ...args, kind: k })
      if (probe.length > 0) { raw = probe; break }
    }
  }

  // Drop already-shown listings when the model passes exclude_urls.
  if (args.exclude_urls?.length) {
    const stop = new Set(args.exclude_urls.map(u => u.replace(/^https?:\/\/[^/]+/, '')))
    raw = raw.filter(c => !stop.has(c.url.replace(/^https?:\/\/[^/]+/, '')))
  }
  return raw
}

async function searchOneKind(args: SearchArgs): Promise<ListingCard[]> {
  switch (args.kind) {
    case 'villa':     return searchSupabaseTable('raw_villas', 'villa', args, '/ru/villy/o/', 'villa-photos')
    case 'apartment': return searchSupabaseTable('raw_apartments', 'apartment', args, '/ru/apartamenty/o/', 'apartment-photos')
    case 'complex':   return searchSupabaseTable('raw_complexes', 'complex', args, '/ru/zhilye-kompleksy/o/', 'complex-photos')
    case 'developer': return searchSupabaseTable('raw_developers', 'developer', args, '/ru/zastrojshhiki/', null)
    case 'rental':    return searchRental(args)
    default:          return []
  }
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
  if (name === 'get_listing_full') {
    const result = await getListingFull(args as { kind?: string; slug?: string })
    return JSON.stringify(result)
  }
  if (name === 'find_landmark') {
    const lookupName = (args as { name?: string })?.name ?? ''
    const result = await findLandmark(lookupName)
    return JSON.stringify(result)
  }
  if (name === 'semantic_search') {
    const result = await searchSemantic(args as SemanticArgs)
    return JSON.stringify({ results: result })
  }
  return JSON.stringify({ error: 'unknown_tool' })
}

// =========== Semantic search via pgvector ============================
//
// Embeds the visitor's free-text query through Azure OpenAI's
// text-embedding-3-large (1536-dim Matryoshka truncation, matching
// the column type defined in migration 023), then asks
// `semantic_search_catalog` RPC for the nearest rows across all three
// catalogs. The RPC already filters non-published rows server-side.

type SemanticArgs = {
  query?: string
  kinds?: Array<'villa' | 'apartment' | 'complex'>
  limit?: number
}

async function searchSemantic(args: SemanticArgs): Promise<ListingCard[]> {
  const q = (args.query ?? '').trim()
  if (q.length < 3) return []
  const limit = Math.max(1, Math.min(20, args.limit ?? 8))
  const kinds: Array<'villa' | 'apartment' | 'complex'> =
    args.kinds && args.kinds.length ? args.kinds : ['villa', 'apartment', 'complex']

  const { semanticSearch } = await import('@/lib/semantic-search')
  const hits = await semanticSearch(q, { limit, kinds })
  if (hits.length === 0) return []

  // Fetch rows in batch from the three tables.
  const byKind: Record<'villa' | 'apartment' | 'complex', string[]> = { villa: [], apartment: [], complex: [] }
  for (const h of hits) byKind[h.kind].push(h.airtable_id)

  type AnyRow = { airtable_id: string; data: Record<string, unknown>; logo_url?: string | null }
  const rowsByKey = new Map<string, AnyRow>()
  const tasks: Promise<void>[] = []
  if (byKind.villa.length) {
    tasks.push((async () => {
      const r = await sb.from('raw_villas').select('airtable_id, data').in('airtable_id', byKind.villa)
      for (const row of (r.data ?? []) as AnyRow[]) rowsByKey.set(`villa:${row.airtable_id}`, row)
    })())
  }
  if (byKind.apartment.length) {
    tasks.push((async () => {
      const r = await sb.from('raw_apartments').select('airtable_id, data').in('airtable_id', byKind.apartment)
      for (const row of (r.data ?? []) as AnyRow[]) rowsByKey.set(`apartment:${row.airtable_id}`, row)
    })())
  }
  if (byKind.complex.length) {
    tasks.push((async () => {
      const r = await sb.from('raw_complexes').select('airtable_id, data').in('airtable_id', byKind.complex)
      for (const row of (r.data ?? []) as AnyRow[]) rowsByKey.set(`complex:${row.airtable_id}`, row)
    })())
  }
  await Promise.all(tasks)

  const photoManifests: Record<'villa' | 'apartment' | 'complex', Record<string, string[]>> = {
    villa: await loadPhotoManifest('villa-photos'),
    apartment: await loadPhotoManifest('apartment-photos'),
    complex: await loadPhotoManifest('complex-photos'),
  }
  const pathByKind: Record<'villa' | 'apartment' | 'complex', string> = {
    villa: '/ru/villy/o/', apartment: '/ru/apartamenty/o/', complex: '/ru/zhilye-kompleksy/o/',
  }

  const cards: ListingCard[] = []
  for (const h of hits) {
    const row = rowsByKey.get(`${h.kind}:${h.airtable_id}`)
    if (!row) continue
    const d = row.data
    const slug = fs1(d['SEO:Slug']) ?? null
    if (!slug || slug.startsWith('-')) continue
    const title = fs1(d['SEO:Title']) ?? fs1(d['ИИ Имя']) ?? fs1(d['Name']) ?? fs1(d['Project']) ?? ''
    const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
    const district = districtRaw && /^rec[A-Za-z0-9]{14,}$/.test(districtRaw) ? null : districtRaw
    const bedrooms = num(d['Комнаты']) ?? num(d['Спальни']) ?? null
    const area = num(d['Площадь']) ?? null
    const priceUsd = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена']) ?? null
    const pricePerSqmRaw = num(d['Цена м²']) ?? (priceUsd != null && area && area > 0 ? priceUsd / area : null)
    const pricePerSqm = pricePerSqmRaw != null ? Math.round(pricePerSqmRaw) : null
    const photo = photoManifests[h.kind][row.airtable_id]?.[0] ?? null
    const landPurpose = fs1(d['Назначение земли'])
    const landColor = fs1(d['Land color']) ?? fs1(d['Цвет земли']) ?? fs1(d['Цвет земли вторичка'])
    const leaseRaw = fs1(d['Leasehold']) ?? fs1(d['Leashold'])
    const seoText = fs1(d['SEO Text']) ?? fs1(d['Notes']) ?? fs1(d['Описание'])
    const lat = parseGeoStr(d['Geo'])
    const lng = parseGeoStr(d['Geo 2'])
    const beach = lat != null && lng != null ? nearestBeach(lat, lng) : null
    cards.push({
      kind: h.kind,
      title: title.replace(/\s*\|\s*Balinsky\s*$/, '').trim(),
      url: `${SITE_URL}${pathByKind[h.kind]}${slug}`,
      photo,
      district,
      bedrooms,
      area_sqm: area,
      price_usd: priceUsd,
      price_per_sqm_usd: pricePerSqm,
      rent_per_month_usd: null,
      land_zone: classifyLandZone(landPurpose, landColor),
      land_purpose: landPurpose,
      permit: (() => {
        const raw = fs1(d['Разрешение']) ?? fs1(d['Разрешительные документы']) ?? fs1(d['PBG'])
        return raw
      })(),
      ...(() => {
        const raw = fs1(d['Разрешение']) ?? fs1(d['Разрешительные документы']) ?? fs1(d['PBG'])
        const num = fs1(d['PBG'])
        const ps = parsePermitStatus(raw)
        return {
          permit_pbg: ps.pbg,
          permit_slf: ps.slf,
          permit_pbg_number: num && num.toLowerCase() !== 'нет' ? num : null,
          permit_summary: ps.summary,
        }
      })(),
      lease_years: leaseRaw ? Number(leaseRaw) || null : null,
      completion_year: fs1(d['Year of completion']) ?? fs1(d['Year of completion ']) ?? null,
      status: fs1(d['Статус']),
      claimed_yield_pct: num(d['Заявленная доходность']),
      cap_rate_median: null,
      cap_rate_good: null,
      monthly_rent_comp_usd: null,
      monthly_rent_comp_count: null,
      district_median_price_per_sqm_usd: null,
      district_listings_count: null,
      description_preview: seoText ? (seoText.length > 220 ? seoText.slice(0, 220).trim() + '…' : seoText.trim()) : null,
      lat,
      lng,
      distance_to_beach_km: beach?.km ?? null,
      nearest_beach: beach?.name ?? null,
    })
  }
  return cards
}

// Full deep-read of one listing — everything in the Airtable row,
// minus internal-only / linked-record noise. Treat as Балина
// "walking the page": the same fields the human visitor would see
// on /ru/villy/o/<slug> etc. are in here.
//
// We strip:
//   - linked-record id arrays (look like ["recXXXX..."]) — model
//     can't follow them anyway
//   - obviously internal columns that start with "_" or contain
//     "Created"/"Last modified"/"Sync"
//   - empty / null / empty-array values
async function getListingFull(args: { kind?: string; slug?: string }): Promise<Record<string, unknown>> {
  if (!args.slug || typeof args.slug !== 'string') return { error: 'missing_slug' }
  const tableByKind: Record<string, string> = {
    villa: 'raw_villas', apartment: 'raw_apartments',
    complex: 'raw_complexes', developer: 'raw_developers',
  }
  const kind = String(args.kind ?? 'villa').toLowerCase()
  if (kind === 'rental') {
    // Rental lives in a Storage manifest, not Supabase row — load
    // and find by slug.
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/rental/_rental.json`
    const r = await fetch(cdnManifestUrl(url, 600), { cache: 'no-store' })
    if (!r.ok) return { error: 'rental_manifest_failed' }
    const j = await r.json() as { items?: unknown[] }
    const items = (j.items ?? []) as Array<{ slug: string }>
    const item = items.find(it => it.slug === args.slug)
    return item ?? { error: 'not_found' }
  }
  const table = tableByKind[kind]
  if (!table) return { error: 'unknown_kind' }
  const { data, error } = await sb.from(table).select('airtable_id, data').limit(2000)
  if (error) return { error: error.message }
  const rows = (data ?? []) as { airtable_id: string; data: Record<string, unknown> }[]
  const row = rows.find(r => fs1(r.data['SEO:Slug']) === args.slug)
  if (!row) return { error: 'not_found', slug: args.slug }
  return {
    airtable_id: row.airtable_id,
    kind,
    slug: args.slug,
    fields: cleanForModel(row.data),
  }
}

function cleanForModel(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data)) {
    // Skip internal / metadata.
    if (key.startsWith('_')) continue
    if (/^(Created|Last modified|Sync|Auto)\b/i.test(key)) continue
    // Skip empty.
    if (val == null) continue
    if (typeof val === 'string' && val.trim() === '') continue
    if (Array.isArray(val) && val.length === 0) continue
    // Skip pure linked-record id arrays — useless to the model.
    if (Array.isArray(val) && val.every(v => typeof v === 'string' && /^rec[A-Za-z0-9]{14,}$/.test(v))) continue
    out[key] = val
  }
  return out
}
