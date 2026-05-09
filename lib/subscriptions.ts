// Saved-search alerts.
//
// Visitor on the catalog clicks "🔔 Уведомлять в Telegram":
//   1. POST /api/subscriptions/draft creates a row with a short
//      pending_token, returns t.me/<bot>?start=sub_<token>.
//   2. User opens deep-link → bot /start handler calls claimDraft()
//      to assign chat_id and clear pending_token. From then on the
//      subscription is active.
//   3. The daily-digest cron (/api/cron/assistant-alerts) iterates
//      every active subscription, runs findMatches() against the
//      live catalog, filters out airtable_ids already in
//      seen_object_ids, and sends a Telegram digest.
//   4. To avoid the first-night flood, claimDraft pre-populates
//      seen_object_ids with the current full match set, then
//      proactively pushes a "вот 3 первых под твой запрос" message
//      so the user sees instant value.
//
// Filter shape mirrors SearchArgs from lib/consultant.ts so that
// what the visitor saw in catalog filters is exactly what they get
// notified about. The matcher reuses the same predicates (district
// substring, bedroom range, price range, str_only, coastal whitelist).

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export type SubscriptionFilter = {
  kind: 'villa' | 'apartment' | 'complex' | 'rental'
  district?: string
  bedrooms_min?: number
  bedrooms_max?: number
  price_min_usd?: number
  price_max_usd?: number
  str_only?: boolean
  max_distance_to_beach?: 'beachfront' | 'walking' | 'scooter' | 'any'
  query?: string
}

export type Subscription = {
  id: number
  chatId: number | null
  pendingToken: string | null
  filter: SubscriptionFilter
  name: string | null
  frequency: 'daily' | 'instant'
  isActive: boolean
  lastSentAt: string | null
  seenObjectIds: string[]
  createdAt: string
}

export type MatchedObject = {
  airtableId: string
  kind: SubscriptionFilter['kind']
  slug: string
  title: string
  district: string | null
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  pricePerSqm: number | null
  url: string
  photo: string | null
  syncedAt: string | null
}

// Cap stored seen_object_ids so the array doesn't grow unbounded.
// 500 covers a year of daily digests at the upper bound (~1.5/day
// new objects), well clear of jsonb / text[] performance concerns.
const SEEN_CAP = 500

// === draft + claim flow =====================================================

// Create a pending subscription with a short token. The token is
// what the visitor's browser sticks into the Telegram deep-link;
// the bot's /start handler claims it and assigns chat_id.
export async function createDraft(
  filter: SubscriptionFilter,
  name?: string,
): Promise<{ id: number; token: string; deepLink: string; botUsername: string }> {
  const token = `s${randomBytes(8).toString('base64url').replace(/[-_]/g, c => c === '-' ? 'A' : 'B').slice(0, 14)}`
  const { data, error } = await sb
    .from('assistant_subscriptions')
    .insert({
      chat_id: null,
      pending_token: token,
      filter,
      name: name ?? null,
      frequency: 'daily',
      is_active: false,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('draft_insert_failed')
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'BalinskyBot'
  return {
    id: data.id,
    token,
    deepLink: `https://t.me/${botUsername}?start=sub_${token}`,
    botUsername,
  }
}

// Bot /start handler calls this with the token. Assigns chat_id +
// activates + pre-populates seen so the next cron run only sends
// truly new objects (not the entire current catalog).
export async function claimDraft(
  token: string,
  chatId: number,
): Promise<{ subscription: Subscription; matches: MatchedObject[] } | null> {
  const { data, error } = await sb
    .from('assistant_subscriptions')
    .select('*')
    .eq('pending_token', token)
    .maybeSingle()
  if (error || !data) return null

  const filter = data.filter as SubscriptionFilter
  const matches = await findMatches(filter, [], 1000)
  const seenIds = matches.map(m => m.airtableId).slice(0, SEEN_CAP)

  const { error: updateErr } = await sb
    .from('assistant_subscriptions')
    .update({
      chat_id: chatId,
      pending_token: null,
      is_active: true,
      seen_object_ids: seenIds,
      last_sent_at: new Date().toISOString(),
    })
    .eq('id', data.id)
  if (updateErr) throw updateErr

  return {
    subscription: rowToSubscription({ ...data, chat_id: chatId, pending_token: null, is_active: true, seen_object_ids: seenIds }),
    matches,
  }
}

// === user-facing CRUD ======================================================

export async function listForChat(chatId: number): Promise<Subscription[]> {
  const { data, error } = await sb
    .from('assistant_subscriptions')
    .select('*')
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToSubscription)
}

export async function deleteSubscription(id: number, chatId: number): Promise<void> {
  await sb
    .from('assistant_subscriptions')
    .update({ is_active: false })
    .eq('id', id)
    .eq('chat_id', chatId)
}

export async function setFrequency(id: number, chatId: number, frequency: 'daily' | 'instant'): Promise<void> {
  await sb
    .from('assistant_subscriptions')
    .update({ frequency })
    .eq('id', id)
    .eq('chat_id', chatId)
}

// === cron-side: enumerate active subs =====================================

export async function listDueDaily(): Promise<Subscription[]> {
  // Anything active where last_sent_at is null OR older than 23h ago
  // (slightly under 24h so a daily cron at fixed UTC hour catches it
  // even if the previous run drifted by a few minutes).
  const cutoff = new Date(Date.now() - 23 * 3600_000).toISOString()
  const { data, error } = await sb
    .from('assistant_subscriptions')
    .select('*')
    .eq('is_active', true)
    .eq('frequency', 'daily')
    .not('chat_id', 'is', null)
    .or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`)
  if (error) throw error
  return (data ?? []).map(rowToSubscription)
}

export async function markSent(id: number, newSeenIds: string[]): Promise<void> {
  await sb
    .from('assistant_subscriptions')
    .update({
      last_sent_at: new Date().toISOString(),
      seen_object_ids: newSeenIds.slice(0, SEEN_CAP),
    })
    .eq('id', id)
}

// === matcher (mirror of search_listings filtering) ========================

const TABLE_BY_KIND: Record<SubscriptionFilter['kind'], string> = {
  villa:     'raw_villas',
  apartment: 'raw_apartments',
  complex:   'raw_complexes',
  rental:    'raw_rental', // rental flow is different, see below
}

const PHOTO_BUCKET_BY_KIND: Record<SubscriptionFilter['kind'], string | null> = {
  villa:     'villa-photos',
  apartment: 'apartment-photos',
  complex:   'complex-photos',
  rental:    null,
}

const PATH_BY_KIND: Record<SubscriptionFilter['kind'], string> = {
  villa:     '/ru/villy/o/',
  apartment: '/ru/apartamenty/o/',
  complex:   '/ru/zhilye-kompleksy/o/',
  rental:    '/ru/arenda/o/',
}

// Same inland-district blocklist as lib/consultant.ts. Kept duplicated
// here to avoid a circular import; consider extracting to a shared
// geography module if it grows.
const INLAND_DISTRICT_TOKENS = [
  'убуд', 'ubud', 'табан', 'tabanan', 'бедугул', 'bedugul',
  'мундук', 'munduk', 'кинтамани', 'kintamani', 'сидеман',
  'sideman', 'sidemen', 'паянган', 'payangan', 'мас', 'mas ',
  'тегаллаланг', 'tegallalang', 'tegalalang',
]

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

function classifyZone(purpose: string | null, color: string | null): 'pink' | 'tourism' | 'commercial' | 'yellow' | 'green' | 'unknown' {
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
  return 'unknown'
}

function isCoastal(districtRaw: string | null): boolean {
  if (!districtRaw) return true
  const lower = districtRaw.toLowerCase()
  return !INLAND_DISTRICT_TOKENS.some(t => lower.includes(t))
}

// Run the same predicate set as search_listings against the full
// catalog and return minimal display records. Sorted by synced_at
// DESC so newest-edited rows surface first in the digest.
export async function findMatches(
  filter: SubscriptionFilter,
  excludeIds: string[],
  limit = 6,
): Promise<MatchedObject[]> {
  if (filter.kind === 'rental') return findRentalMatches(filter, excludeIds, limit)

  const table = TABLE_BY_KIND[filter.kind]
  const { data } = await sb.from(table).select('airtable_id, data, synced_at').limit(2000)
  const rows = (data ?? []) as { airtable_id: string; data: Record<string, unknown>; synced_at?: string }[]

  const exclude = new Set(excludeIds)
  const photoBucket = PHOTO_BUCKET_BY_KIND[filter.kind]
  const photoManifest = photoBucket ? await loadPhotoManifest(photoBucket) : {}

  const matched = rows
    .filter(r => {
      if (exclude.has(r.airtable_id)) return false
      const d = r.data
      if (d['Опубликовать'] !== true && d['Публикация'] !== true) return false
      const slug = fs1(d['SEO:Slug'])
      if (!slug || slug.startsWith('-')) return false

      if (filter.district) {
        const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
        if (!districtRaw || !districtRaw.toLowerCase().includes(filter.district.toLowerCase())) return false
      }

      if (filter.max_distance_to_beach && filter.max_distance_to_beach !== 'any') {
        const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
        if (!isCoastal(districtRaw)) return false
      }

      if (filter.str_only) {
        const purpose = fs1(d['Назначение земли'])
        const color = fs1(d['Land color']) ?? fs1(d['Цвет земли']) ?? fs1(d['Цвет земли вторичка'])
        const z = classifyZone(purpose, color)
        if (z !== 'pink' && z !== 'tourism' && z !== 'commercial') return false
      }

      if (filter.bedrooms_min != null || filter.bedrooms_max != null) {
        const br = num(d['Комнаты']) ?? num(d['Спальни'])
        if (br == null) return false
        if (filter.bedrooms_min != null && br < filter.bedrooms_min) return false
        if (filter.bedrooms_max != null && br > filter.bedrooms_max) return false
      }

      if (filter.price_min_usd != null || filter.price_max_usd != null) {
        const price = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена'])
        if (price == null) return false
        if (filter.price_min_usd != null && price < filter.price_min_usd) return false
        if (filter.price_max_usd != null && price > filter.price_max_usd) return false
      }

      if (filter.query) {
        const blob = [
          fs1(d['SEO:Title']) ?? '', fs1(d['ИИ Имя']) ?? '',
          fs1(d['Name']) ?? '', fs1(d['Project']) ?? '',
        ].join(' ').toLowerCase()
        if (!blob.includes(filter.query.toLowerCase())) return false
      }

      return true
    })
    .map(r => {
      const d = r.data
      const slug = fs1(d['SEO:Slug'])!
      const title = (fs1(d['SEO:Title']) ?? fs1(d['ИИ Имя']) ?? fs1(d['Name']) ?? fs1(d['Project']) ?? '')
        .replace(/\s*\|\s*Balinsky\s*$/, '').trim()
      const districtRaw = fs1(d['Location filter']) ?? fs1(d['Location 2']) ?? fs1(d['Location'])
      const district = districtRaw && /^rec[A-Za-z0-9]{14,}$/.test(districtRaw) ? null : districtRaw
      const bedrooms = num(d['Комнаты']) ?? num(d['Спальни']) ?? null
      const area = num(d['Площадь']) ?? null
      const priceUsd = num(d['price_usd']) ?? num(d['price']) ?? num(d['Цена']) ?? null
      const pricePerSqm = num(d['Цена м²']) ?? (priceUsd != null && area && area > 0 ? Math.round(priceUsd / area) : null)
      return {
        airtableId: r.airtable_id,
        kind: filter.kind,
        slug,
        title,
        district,
        bedrooms,
        area,
        priceUsd,
        pricePerSqm,
        url: `${SITE_URL}${PATH_BY_KIND[filter.kind]}${slug}`,
        photo: photoManifest[r.airtable_id]?.[0] ?? null,
        syncedAt: r.synced_at ?? null,
      } as MatchedObject
    })

  matched.sort((a, b) => (b.syncedAt ?? '').localeCompare(a.syncedAt ?? ''))
  return matched.slice(0, limit)
}

async function findRentalMatches(
  filter: SubscriptionFilter,
  excludeIds: string[],
  limit: number,
): Promise<MatchedObject[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/rental/_rental.json`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json() as { items?: Array<{ id: string; slug: string; title: string; bedrooms: number | null; location: string | null; priceMonthUsd: number; photos: string[] }> }
  const items = Array.isArray(j.items) ? j.items : []
  const exclude = new Set(excludeIds)
  return items
    .filter(it => {
      if (exclude.has(it.id)) return false
      if (filter.district && (!it.location || !it.location.toLowerCase().includes(filter.district.toLowerCase()))) return false
      if (filter.bedrooms_min != null && (it.bedrooms == null || it.bedrooms < filter.bedrooms_min)) return false
      if (filter.bedrooms_max != null && (it.bedrooms == null || it.bedrooms > filter.bedrooms_max)) return false
      if (filter.price_min_usd != null && it.priceMonthUsd < filter.price_min_usd) return false
      if (filter.price_max_usd != null && it.priceMonthUsd > filter.price_max_usd) return false
      return true
    })
    .slice(0, limit)
    .map(it => ({
      airtableId: it.id,
      kind: 'rental' as const,
      slug: it.slug,
      title: it.title,
      district: it.location,
      bedrooms: it.bedrooms,
      area: null,
      priceUsd: null,
      pricePerSqm: null,
      url: `${SITE_URL}${PATH_BY_KIND.rental}${it.slug}`,
      photo: it.photos?.[0] ?? null,
      syncedAt: null,
    }))
}

// Lazy photo manifest cache, mirrors lib/consultant.ts.
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

// === human-readable filter summary (used in bot replies) ==================

const KIND_LABEL_RU: Record<SubscriptionFilter['kind'], string> = {
  villa: 'виллы', apartment: 'апартаменты', complex: 'жилые комплексы', rental: 'помесячная аренда',
}

export function describeFilter(f: SubscriptionFilter): string {
  const parts: string[] = [KIND_LABEL_RU[f.kind] ?? f.kind]
  if (f.district) parts.push(f.district)
  if (f.bedrooms_min != null && f.bedrooms_max != null && f.bedrooms_min === f.bedrooms_max) {
    parts.push(`${f.bedrooms_min} BR`)
  } else if (f.bedrooms_min != null || f.bedrooms_max != null) {
    parts.push(`${f.bedrooms_min ?? '?'}–${f.bedrooms_max ?? '?'} BR`)
  }
  if (f.price_max_usd != null) parts.push(`до $${(f.price_max_usd / 1000).toFixed(0)}k`)
  if (f.str_only) parts.push('под аренду')
  if (f.max_distance_to_beach && f.max_distance_to_beach !== 'any') parts.push('у моря')
  return parts.join(' · ')
}

// === row → object adapter ================================================

type Row = {
  id: number
  chat_id: number | null
  pending_token: string | null
  filter: SubscriptionFilter
  name: string | null
  frequency: 'daily' | 'instant'
  is_active: boolean
  last_sent_at: string | null
  seen_object_ids: string[]
  created_at: string
}

function rowToSubscription(r: Row): Subscription {
  return {
    id: r.id,
    chatId: r.chat_id,
    pendingToken: r.pending_token,
    filter: r.filter,
    name: r.name,
    frequency: r.frequency,
    isActive: r.is_active,
    lastSentAt: r.last_sent_at,
    seenObjectIds: r.seen_object_ids ?? [],
    createdAt: r.created_at,
  }
}
