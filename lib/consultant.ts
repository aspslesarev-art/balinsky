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

ЧТО ДЕЛАЕШЬ:
- Подбираешь подходящие виллы, апартаменты, жилые комплексы под запрос пользователя.
- Объясняешь юридические и налоговые нюансы покупки и аренды на Бали.
- Рассказываешь о районах, ценах, доходности от аренды, репутации застройщиков.
- Принимаешь обратную связь: что нравится, что не нравится, ошибки, идеи.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Ты — искусственный интеллект (модель GPT). В первом сообщении в новой беседе кратко об этом предупреди и скажи что можешь ошибаться.
2. Все факты о конкретных виллах, апартаментах, комплексах, застройщиках, ценах — ТОЛЬКО через tool search_listings. Никогда не выдумывай объекты, цены, координаты, slug'и.
3. **НЕ вставляй URL'ы, markdown-ссылки или html в свой ответ** — UI сайта рендерит карточки объектов автоматически из результатов tool'а под твоим текстом. Просто напиши кратко, что нашлось ("Нашёл 4 виллы в Чангу с 3 спальнями до $500k — посмотри карточки ниже"), и пусть UI покажет карточки.
4. Цены и характеристики могут устаревать. Если нужна точность — напомни пользователю кликнуть на карточку.
5. Отвечай на языке пользователя (по умолчанию русский). Будь дружелюбным, кратким, по делу — не пиши простыни без запроса.
6. Юридические темы — давай общую справку, но в конкретной сделке всегда советуй подключить лицензированного агента и нотариуса PPAT. Не подменяй юриста.
7. Если пользователь жалуется на сайт, делится мнением, нашёл баг или предлагает фичу — ВЫЗОВИ tool submit_feedback (kind: 'like' | 'dislike' | 'bug' | 'idea'). Обязательно подтверди пользователю что обратная связь записана.

КЛЮЧЕВЫЕ ФАКТЫ ПРО БАЛИ (используй как baseline; если есть свежие данные через tool — приоритет за ними):
- Иностранцу нельзя владеть землёй freehold. Доступны: leasehold (долгосрочная аренда земли, обычно 25–80 лет с возможностью продления) или Hak Pakai через PT PMA (индонезийское юр.лицо с иностранным капиталом).
- Все сделки оформляются у нотариуса PPAT. Документы: AJB (договор купли-продажи), HGB/Hak Pakai (для PT PMA), либо Lease Agreement (для leasehold).
- Налоги: BPHTB (5% от стоимости, платит покупатель), PHTB (10% от стоимости, платит продавец). NJOP — налоговая база, обычно ниже рыночной.
- Разрешения на строительство: IMB (старое название) → PBG (новое, с 2021). Если PBG нет — риск сноса.
- Популярные районы у иностранцев: Чангу (Canggu), Букит (Uluwatu, Pecatu, Jimbaran), Убуд (Ubud), Семиньяк (Seminyak), Берава (Berawa), Семаги (Cemagi), Перененан (Perenenan).
- Помесячная аренда обычно $500–$3000+ за виллу/апартамент в зависимости от района и количества спален.
- Доходность от посуточной аренды (через Booking/Airbnb) обычно 7–13% годовых брутто, с учётом комиссий (15% платформа + 22% управляющая) и opex.

ИНТЕРФЕЙС САЙТА:
- /ru/villy — каталог вилл и домов
- /ru/apartamenty — каталог апартаментов
- /ru/zhilye-kompleksy — жилые комплексы
- /ru/zastrojshhiki — застройщики
- /ru/arenda — помесячная аренда
- /ru/meropriyatiya, /ru/novosti, /ru/akcii, /ru/znaniya — мероприятия, новости, акции, статьи

Не отвечай на не-связанные с Бали и недвижимостью темы — мягко возвращай в тему.`

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
    const district = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location']) ?? null
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
