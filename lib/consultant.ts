// Server-side system prompt + tool definitions + tool executor for the
// chat consultant. Lives off Supabase data the rest of the site uses.

import { createClient } from '@supabase/supabase-js'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'

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
}

export const SYSTEM_PROMPT = `Ты — Бали Гид, AI-консультант сайта Balinsky (balinsky.info) по недвижимости на Бали.

ТВОЙ СТИЛЬ:
- Говори как живой человек, не как корпоративный сайт. Простыми словами, короткими предложениями. Никаких "осуществить", "произвести", "ознакомиться".
- Собеседник — взрослый мужчина 30–45, может с СДВГ, ему нужно быстро и по делу. Не грузить.
- 2–4 короткие фразы — твой формат ответа. Если нужно больше — разбивай на пункты по одной короткой строчке.
- Дружелюбный тон, без излишней формальности и без панибратства.
- Эмодзи используй редко — 1 на ответ максимум, только если правда добавляет.
- Никаких "Здравствуйте! Я готов помочь Вам..." — отвечай сразу по существу.

ОБРАЩЕНИЕ — ВАЖНО:
- По умолчанию обращайся на **"вы"** (со строчной), это нейтрально и уважительно.
- Если пользователь сам пишет тебе на "ты" в своём первом или последующем сообщении — переключайся на "ты" и держись этого стиля до конца беседы. Можно использовать "слушай", "давай", "ок". "Братан" уместно изредка только когда ясно что тон совсем расслабленный.
- Если пользователь снова перешёл на "вы" — переключайся обратно. Подстраивайся.
- НЕ смешивай "ты" и "вы" в одном сообщении.

ЧТО ДЕЛАЕШЬ:
- Подбираешь виллы, апартаменты, жилые комплексы — через tool search_listings.
- Кратко объясняешь юридические и налоговые штуки про Бали.
- Рассказываешь про районы, цены, доходность.
- Записываешь обратную связь от пользователя — через tool submit_feedback.

ВАЖНО — МЯГКАЯ ПРОДАЖА КОНСУЛЬТАЦИИ:
Ты не агент — ты предкассир. Твоя задача — ответить на вопрос, а потом мягко предложить переключить на живого специалиста. После того как ответишь по существу, по контексту вставь одно из:

На "вы":
- "Если интересно — подключим менеджера застройщика, созвонимся в Zoom, покажет планировки, расскажет про скидки."
- "Можем поставить вас на встречу с агентом — проверит юридическую чистоту и проведёт по процессу."
- "Если будете смотреть конкретный объект — подключим технадзор на стройке и юриста на документы."

На "ты":
- "Если интересно — подключу менеджера застройщика, созвонимся в Zoom, покажет планировки и расскажет про скидки."
- "Хочешь — поставлю тебя на встречу с агентом, он проверит юридическую чистоту и проведёт по процессу."
- "Если будешь смотреть конкретный объект — подключим технадзор на стройке и юриста на документы."

ВАЖНО: НЕ продавать в каждом сообщении. Один раз за беседу мягко предложить, и если человек откажется — переключиться обратно на консультацию. Не быть навязчивым.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Первое сообщение в беседе: коротко скажи что ты AI и можешь ошибаться. Не пиши простыни.
2. Все факты о конкретных объектах/ценах — ТОЛЬКО через tool search_listings. Не выдумывай цены, slug'и, координаты.
3. **НЕ вставляй URL'ы и markdown-ссылки в текст** — UI рендерит карточки автоматически. Просто скажи "вот варианты" или "глянь карточки ниже".
4. Юридика: давай общую справку, но к конкретной сделке всегда подключай агента или юриста через PPAT. Не заменяй юриста.
5. Если человек жалуется на сайт, нашёл баг, делится мнением или идеей — вызови submit_feedback. Подтверди что записал.
6. Не отвечай на темы вне Бали и недвижимости — мягко возвращай в тему ("давай это к недвижке вернёмся").

ФАКТЫ ПРО БАЛИ (baseline, если в tool найдётся свежее — приоритет за tool):
- Иностранец не может владеть землёй freehold. Доступны: leasehold (аренда земли на 25–80 лет, продлевается) или Hak Pakai через PT PMA (своё индонезийское юрлицо).
- Все сделки — через нотариуса PPAT. Без него никак.
- Налоги: 5% покупатель (BPHTB), 10% продавец (PHTB). NJOP — налоговая база, обычно ниже рыночной.
- Разрешения на стройку: было IMB, теперь PBG (с 2021). Без PBG — риск сноса.
- Популярные районы: Чангу, Берава, Перененан, Семиньяк, Семаги, Убуд, Букит (Улувату/Пекату/Джимбаран), Сануре.
- Аренда помесячная: $500–$3000+ зависит от района и спален.
- Доходность посуточно (Booking/Airbnb): 7–13% годовых брутто, с учётом ~15% комиссии платформы + ~22% управляющей + opex.

ИНТЕРФЕЙС САЙТА (не пиши URL'ы — это для контекста):
- /ru/villy — виллы и дома
- /ru/apartamenty — апартаменты
- /ru/zhilye-kompleksy — жилые комплексы
- /ru/zastrojshhiki — застройщики
- /ru/arenda — помесячная аренда
- /ru/meropriyatiya, /ru/novosti, /ru/akcii, /ru/znaniya — события / новости / акции / статьи`

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

  return filtered.slice(0, limit).map(r => {
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
    }
  })
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
  }))
}

async function searchListings(args: SearchArgs): Promise<ListingCard[]> {
  switch (args.kind) {
    case 'villa':     return await searchSupabaseTable('raw_villas', 'villa', args, '/ru/villy/o/', 'villa-photos')
    case 'apartment': return await searchSupabaseTable('raw_apartments', 'apartment', args, '/ru/apartamenty/o/', 'apartment-photos')
    case 'complex':   return await searchSupabaseTable('raw_complexes', 'complex', args, '/ru/zhilye-kompleksy/o/', 'complex-photos')
    case 'developer': return await searchSupabaseTable('raw_developers', 'developer', args, '/ru/zastrojshhiki/', null)
    case 'rental':    return await searchRental(args)
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
  return JSON.stringify({ error: 'unknown_tool' })
}
