// Подборки агента для клиента (владелец 29.10.2026, макет
// https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K). Pro-агент собирает
// виллы и апартаменты, клиент открывает /p/<token> без входа, агент видит
// историю открытий. Таблицы — migrations/135_agent_collections.sql.

import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getProStatus, getSessionTelegramId } from '@/lib/site-auth'
import { translit } from '@/lib/translit'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false },
})

export type CollectionKind = 'villa' | 'apartment'

/** Карточка объекта на момент добавления — из того же снимка, что «Избранное». */
export type ItemSnapshot = {
  title: string
  photo: string | null
  priceUsd: number | null
  district: string | null
  bedrooms: number | null
  area: number | null
  leaseYears: number | null
  status: string | null
  /** Для сравнения у клиента; в старых снимках их нет. id — запись в базе, клиенту не отдаём. */
  id?: string | null
  land?: number | null
  pricePerSqmUsd?: number | null
  permit?: string | null
}

export type CollectionItem = { kind: CollectionKind; slug: string; position: number; note: string | null; snapshot: ItemSnapshot }

export type CollectionVisit = {
  id: number
  startedAt: string
  lastSeenAt: string
  device: string | null
  browser: string | null
  country: string | null
  city: string | null
  preview: boolean
  viewed: string[]
  visitor: string
}

export type Collection = {
  id: string
  title: string
  intro: string | null
  token: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CollectionSummary = Collection & {
  count: number
  photos: string[]
  visits: number
  lastVisitAt: string | null
}

/** Снимок из запроса — только известные поля нужного типа. */
export function cleanSnapshot(raw: unknown): ItemSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const title = str(r.title, 200)
  if (!title) return null
  const photo = str(r.photo, 600)
  const out: ItemSnapshot = {
    title,
    photo: photo && /^https:\/\//.test(photo) ? photo : null,
    priceUsd: num(r.priceUsd),
    district: str(r.district, 80),
    bedrooms: num(r.bedrooms),
    area: num(r.area),
    leaseYears: num(r.leaseYears),
    status: str(r.status, 80),
    id: typeof r.id === 'string' && /^rec[A-Za-z0-9]{10,20}$/.test(r.id) ? r.id : null,
    land: num(r.land),
    pricePerSqmUsd: num(r.pricePerSqmUsd),
    permit: str(r.permit, 80),
  }
  return out
}

/** Вошедший с Pro — его telegram id, иначе null. Подборки — инструмент Pro. */
export async function proOwner(): Promise<number | null> {
  const id = await getSessionTelegramId()
  if (id == null) return null
  if (process.env.NODE_ENV === 'development') return id
  return (await getProStatus(id)) === 'granted' ? id : null
}

function row(r: Record<string, unknown>): Collection {
  return {
    id: String(r.id),
    title: String(r.title),
    intro: (r.intro as string | null) ?? null,
    token: String(r.token),
    active: r.active === true,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }
}

function newToken(title: string): string {
  // Имя клиента в ссылке читается («ivan-k7m2»), хвост — чтобы ссылку нельзя было угадать.
  const base = translit(title.toLowerCase()).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 2).join('-').slice(0, 24)
  const tail = randomBytes(6).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6).padEnd(6, '0')
  return base ? `${base}-${tail}` : `p-${tail}`
}

export async function listCollections(owner: number): Promise<CollectionSummary[]> {
  const { data, error } = await sb.from('agent_collections')
    .select('id, title, intro, token, active, created_at, updated_at')
    .eq('owner_telegram_id', owner).order('updated_at', { ascending: false }).limit(200)
  if (error) throw new Error(`collections: ${error.message}`)
  const list = (data ?? []).map(row)
  if (!list.length) return []
  const ids = list.map(c => c.id)
  const [items, visits] = await Promise.all([
    sb.from('agent_collection_items').select('collection_id, position, snapshot').in('collection_id', ids).order('position'),
    sb.from('agent_collection_visits').select('collection_id, started_at').in('collection_id', ids).eq('preview', false).order('started_at', { ascending: false }),
  ])
  if (items.error) throw new Error(`collection items: ${items.error.message}`)
  if (visits.error) throw new Error(`collection visits: ${visits.error.message}`)
  return list.map(c => {
    const its = (items.data ?? []).filter(i => i.collection_id === c.id)
    const vs = (visits.data ?? []).filter(v => v.collection_id === c.id)
    return {
      ...c,
      count: its.length,
      photos: its.map(i => (i.snapshot as ItemSnapshot)?.photo).filter((p): p is string => !!p).slice(0, 3),
      visits: vs.length,
      lastVisitAt: vs[0]?.started_at ?? null,
    }
  })
}

/** В каких подборках агента уже лежит объект — для меню «В подборку». */
export async function membership(owner: number, kind: CollectionKind, slug: string): Promise<{ id: string; title: string; count: number; has: boolean }[]> {
  const { data, error } = await sb.from('agent_collections').select('id, title')
    .eq('owner_telegram_id', owner).order('updated_at', { ascending: false }).limit(200)
  if (error) throw new Error(`collections: ${error.message}`)
  const ids = (data ?? []).map(c => String(c.id))
  if (!ids.length) return []
  const { data: items, error: e2 } = await sb.from('agent_collection_items').select('collection_id, kind, slug').in('collection_id', ids)
  if (e2) throw new Error(`collection items: ${e2.message}`)
  return (data ?? []).map(c => {
    const its = (items ?? []).filter(i => i.collection_id === c.id)
    return { id: String(c.id), title: String(c.title), count: its.length, has: its.some(i => i.kind === kind && i.slug === slug) }
  })
}

export async function createCollection(owner: number, title: string): Promise<Collection> {
  for (let i = 0; i < 3; i++) {
    const { data, error } = await sb.from('agent_collections')
      .insert({ owner_telegram_id: owner, title, token: newToken(title) })
      .select('id, title, intro, token, active, created_at, updated_at').single()
    if (!error && data) return row(data)
    if (error && error.code !== '23505') throw new Error(`create collection: ${error.message}`)
  }
  throw new Error('create collection: token collision')
}

/** Подборка агента или null, если она чужая или её нет. */
export async function getOwned(owner: number, id: string): Promise<Collection | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const { data, error } = await sb.from('agent_collections')
    .select('id, title, intro, token, active, created_at, updated_at')
    .eq('id', id).eq('owner_telegram_id', owner).maybeSingle()
  if (error) throw new Error(`collection: ${error.message}`)
  return data ? row(data) : null
}

export async function updateCollection(id: string, patch: { title?: string; intro?: string | null; active?: boolean }): Promise<void> {
  const { error } = await sb.from('agent_collections').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`update collection: ${error.message}`)
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await sb.from('agent_collections').delete().eq('id', id)
  if (error) throw new Error(`delete collection: ${error.message}`)
}

async function touch(id: string) {
  await sb.from('agent_collections').update({ updated_at: new Date().toISOString() }).eq('id', id)
}

export async function listItems(id: string): Promise<CollectionItem[]> {
  const { data, error } = await sb.from('agent_collection_items')
    .select('kind, slug, position, note, snapshot').eq('collection_id', id)
    .order('position').order('added_at')
  if (error) throw new Error(`collection items: ${error.message}`)
  return (data ?? []).map(i => ({ kind: i.kind as CollectionKind, slug: String(i.slug), position: Number(i.position), note: i.note ?? null, snapshot: i.snapshot as ItemSnapshot }))
}

/** Добавить объект в конец; уже лежит — освежить снимок (цена могла поменяться). */
export async function addItem(id: string, kind: CollectionKind, slug: string, snapshot: ItemSnapshot): Promise<void> {
  const { data: existing } = await sb.from('agent_collection_items').select('position')
    .eq('collection_id', id).eq('kind', kind).eq('slug', slug).maybeSingle()
  if (existing) {
    const { error } = await sb.from('agent_collection_items').update({ snapshot }).eq('collection_id', id).eq('kind', kind).eq('slug', slug)
    if (error) throw new Error(`update item: ${error.message}`)
  } else {
    const { data: last } = await sb.from('agent_collection_items').select('position').eq('collection_id', id).order('position', { ascending: false }).limit(1).maybeSingle()
    const { error } = await sb.from('agent_collection_items').insert({ collection_id: id, kind, slug, snapshot, position: (last ? Number(last.position) : -1) + 1 })
    if (error) throw new Error(`add item: ${error.message}`)
  }
  await touch(id)
}

export async function removeItem(id: string, kind: CollectionKind, slug: string): Promise<void> {
  const { error } = await sb.from('agent_collection_items').delete().eq('collection_id', id).eq('kind', kind).eq('slug', slug)
  if (error) throw new Error(`remove item: ${error.message}`)
  await touch(id)
}

export async function setNote(id: string, kind: CollectionKind, slug: string, note: string | null): Promise<void> {
  const { error } = await sb.from('agent_collection_items').update({ note }).eq('collection_id', id).eq('kind', kind).eq('slug', slug)
  if (error) throw new Error(`note: ${error.message}`)
  await touch(id)
}

/** Новый порядок: ключи `kind:slug` сверху вниз. */
export async function reorder(id: string, keys: string[]): Promise<void> {
  const res = await Promise.all(keys.map((k, position) => {
    const [kind, slug] = k.split(':')
    return sb.from('agent_collection_items').update({ position }).eq('collection_id', id).eq('kind', kind).eq('slug', slug)
  }))
  const bad = res.find(r => r.error)
  if (bad?.error) throw new Error(`reorder: ${bad.error.message}`)
  await touch(id)
}

export async function listVisits(id: string): Promise<CollectionVisit[]> {
  const { data, error } = await sb.from('agent_collection_visits')
    .select('id, visitor, started_at, last_seen_at, device, browser, country, city, preview, viewed')
    .eq('collection_id', id).order('started_at', { ascending: false }).limit(100)
  if (error) throw new Error(`visits: ${error.message}`)
  return (data ?? []).map(v => ({
    id: Number(v.id), visitor: String(v.visitor), startedAt: String(v.started_at), lastSeenAt: String(v.last_seen_at),
    device: v.device ?? null, browser: v.browser ?? null, country: v.country ?? null, city: v.city ?? null,
    preview: v.preview === true, viewed: (v.viewed as string[]) ?? [],
  }))
}

// ------------------------------------------------------------ для клиента

export type PublicAgent = { name: string; username: string | null; phone: string | null; agency: string | null }

export async function getByToken(token: string): Promise<{ collection: Collection; owner: number } | null> {
  if (!/^[a-z0-9-]{6,80}$/.test(token)) return null
  const { data, error } = await sb.from('agent_collections')
    .select('id, title, intro, token, active, created_at, updated_at, owner_telegram_id').eq('token', token).maybeSingle()
  if (error) throw new Error(`collection by token: ${error.message}`)
  return data ? { collection: row(data), owner: Number(data.owner_telegram_id) } : null
}

export async function publicAgent(owner: number): Promise<PublicAgent> {
  const { data } = await sb.from('site_users').select('username, first_name, last_name, phone, agency').eq('telegram_id', owner).maybeSingle()
  const name = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim()
  return {
    name: name || (data?.username ? `@${data.username}` : 'Ваш агент'),
    username: data?.username ?? null,
    phone: data?.phone ?? null,
    agency: data?.agency ?? null,
  }
}

// ------------------------------------------------------------ история открытий

const PREVIEW_UA = /TelegramBot|WhatsApp|facebookexternalhit|Slackbot|Twitterbot|Discordbot|vkShare|SkypeUriPreview|Viber|LinkedInBot|Googlebot|bingbot|YandexBot/i

/** Устройство и браузер из User-Agent — грубо, но понятно агенту. */
export function parseUa(ua: string): { device: string; browser: string; preview: boolean } {
  const preview = PREVIEW_UA.test(ua)
  if (preview) {
    const m = ua.match(PREVIEW_UA)?.[0] ?? 'бот'
    const app = /Telegram/i.test(m) ? 'Telegram' : /WhatsApp/i.test(m) ? 'WhatsApp' : /facebook/i.test(m) ? 'Facebook' : /Viber/i.test(m) ? 'Viber' : m
    return { device: app, browser: 'предпросмотр ссылки', preview }
  }
  const device = /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Android-планшет')
    : /Macintosh|Mac OS X/.test(ua) ? 'Mac'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux' : 'Устройство'
  const browser = /YaBrowser/.test(ua) ? 'Яндекс Браузер'
    : /Telegram/i.test(ua) ? 'Telegram'
    : /Instagram/.test(ua) ? 'Instagram'
    : /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox|FxiOS/.test(ua) ? 'Firefox'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome'
    : /Safari/.test(ua) ? 'Safari' : 'браузер'
  return { device, browser, preview }
}

const REGION = new Intl.DisplayNames(['ru'], { type: 'region' })

/** Страна и город из заголовков Vercel (по IP). Локально их нет. */
export function geoFromHeaders(h: Headers): { country: string | null; city: string | null } {
  const code = h.get('x-vercel-ip-country')
  let country: string | null = null
  if (code && /^[A-Z]{2}$/.test(code)) {
    try { country = REGION.of(code) ?? code } catch { country = code }
  }
  const rawCity = h.get('x-vercel-ip-city')
  let city: string | null = null
  if (rawCity) { try { city = decodeURIComponent(rawCity).slice(0, 80) } catch { city = rawCity.slice(0, 80) } }
  return { country, city }
}

/** Новый заход клиента. Возвращает id визита для отметок «что смотрел». */
export async function startVisit(collectionId: string, visitor: string, info: { device: string; browser: string; preview: boolean; country: string | null; city: string | null }): Promise<number> {
  const { data, error } = await sb.from('agent_collection_visits')
    .insert({ collection_id: collectionId, visitor, ...info }).select('id').single()
  if (error) throw new Error(`visit: ${error.message}`)
  return Number(data.id)
}

/** Клиент ещё на странице или открыл объект. */
export async function pingVisit(collectionId: string, visitId: number, viewed: string | null): Promise<void> {
  const { data, error } = await sb.from('agent_collection_visits').select('viewed')
    .eq('id', visitId).eq('collection_id', collectionId).maybeSingle()
  if (error || !data) return
  const list = (data.viewed as string[]) ?? []
  const next = viewed && !list.includes(viewed) && list.length < 50 ? [...list, viewed] : list
  await sb.from('agent_collection_visits').update({ last_seen_at: new Date().toISOString(), viewed: next }).eq('id', visitId).eq('collection_id', collectionId)
}

/** Первый за 30 минут заход этого браузера — повод написать агенту. */
export async function isFreshVisit(collectionId: string, visitor: string): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { count } = await sb.from('agent_collection_visits').select('id', { count: 'exact', head: true })
    .eq('collection_id', collectionId).eq('visitor', visitor).gte('last_seen_at', since)
  return (count ?? 0) === 0
}

export async function notifyAgent(owner: number, text: string): Promise<void> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
  // Локальная копия ходит в ту же базу — живым агентам с неё не пишем.
  if (!token || process.env.NODE_ENV === 'development') { console.log('[collections] notify', owner, text); return }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: owner, text, disable_web_page_preview: true }),
    })
  } catch (e) {
    console.error('[collections] notify failed', e instanceof Error ? e.message : e)
  }
}
