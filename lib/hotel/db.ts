// Данные сервиса «QR в номере»: отели, номера, смены гостей, заказы, чат.
//
// Server-only: всё ходит под service_role (таблицы закрыты RLS без политик,
// см. migrations/079_hotel_qr.sql), поэтому импортировать из клиентских
// компонентов нельзя — только из route handlers и серверных страниц.

import { adminSb, isMissingTableError } from '@/lib/admin/sb'
import type { PortalLang } from './i18n'

export type RequestStatus = 'new' | 'in_progress' | 'done' | 'declined'
export type MessageAuthor = 'guest' | 'staff'

export type Hotel = {
  id: number
  slug: string
  name: string
  address: string | null
  /** Язык, на котором портал открывается, пока гость не выбрал свой. */
  lang: PortalLang
  /** Языки, включённые у этого отеля (подмножество портальных). */
  langs: PortalLang[]
  /** Кнопки «продолжить в мессенджере» под лентой чата. */
  whatsapp: string | null
  telegram_username: string | null
  /** Нет ресторана — раздел «В отеле» не показываем (ТЗ 14.5). */
  has_restaurant: boolean
  active: boolean
}

export type Room = {
  id: number
  hotel_id: number
  label: string
  token: string
  active: boolean
}

/** Раздел главного экрана. Порядок — по марже, а не по алфавиту (ТЗ 14.1). */
export type CatalogSection = 'hotel' | 'bali' | 'room' | 'every'
export const SECTION_ORDER: CatalogSection[] = ['hotel', 'bali', 'room', 'every']

/** Переводы каталога: {"en": "...", "ru": "..."} — читать через pick() из i18n. */
export type I18nField = Record<string, string>

export type Category = {
  id: number
  hotel_id: number
  code: string
  section: CatalogSection
  title: I18nField
  caption: I18nField | null
  icon: string | null
  photo_url: string | null
  sort: number
  active: boolean
}

export type Item = {
  id: number
  hotel_id: number
  category_id: number
  code: string
  title: I18nField
  descr: I18nField | null
  price_usd: number | null
  unit: 'once' | 'day' | 'hour' | 'kg' | null
  photo_url: string | null
  sort: number
  active: boolean
}

export type CatalogCategory = Category & { items: Item[] }

export type Stay = {
  id: number
  hotel_id: number
  room_id: number
  guest_name: string | null
  opened_at: string
  closed_at: string | null
}

export type HotelRequest = {
  id: number
  hotel_id: number
  room_id: number
  stay_id: number
  item_id: number | null
  service_code: string | null
  title: string
  note: string | null
  contact_whatsapp: string | null
  preferred_time: string | null
  price_usd: number | null
  lang: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
  closed_at: string | null
}

export type HotelMessage = {
  id: number
  stay_id: number
  room_id: number
  author: MessageAuthor
  staff_name: string | null
  body: string
  lang: string | null
  created_at: string
  read_by_staff_at: string | null
  read_by_guest_at: string | null
}

export type HotelEvent = {
  id: number
  hotel_id: number
  room_id: number | null
  stay_id: number | null
  lang: string | null
  type: string
  ctx: Record<string, unknown>
  created_at: string
}

const HOTEL_COLS =
  'id, slug, name, address, lang, langs, whatsapp, telegram_username, has_restaurant, active'
const ROOM_COLS = 'id, hotel_id, label, token, active'
const CATEGORY_COLS = 'id, hotel_id, code, section, title, caption, icon, photo_url, sort, active'
const ITEM_COLS =
  'id, hotel_id, category_id, code, title, descr, price_usd, unit, photo_url, sort, active'
const STAY_COLS = 'id, hotel_id, room_id, guest_name, opened_at, closed_at'
// Одной строкой: supabase-js разбирает литерал select и по нему выводит типы —
// склейка через `+` превращает результат в GenericStringError.
const REQUEST_COLS = 'id, hotel_id, room_id, stay_id, item_id, service_code, title, note, contact_whatsapp, preferred_time, price_usd, lang, status, created_at, updated_at, closed_at'
const MESSAGE_COLS =
  'id, stay_id, room_id, author, staff_name, body, lang, created_at, read_by_staff_at, read_by_guest_at'

// Пока миграция 079 не применена, сервис должен вести себя как «отелей нет»,
// а не падать пятисоткой на каждой странице админки.
function emptyIfMissing<T>(error: { code?: string; message?: string } | null, fallback: T, ctx: string): T {
  if (error && !isMissingTableError(error)) throw new Error(`${ctx}: ${error.message ?? 'unknown error'}`)
  return fallback
}

// ─────────────────────────── гость ───────────────────────────

/** Номер по токену из QR. null — если токена нет, отель или номер выключены. */
export async function resolveRoomByToken(token: string): Promise<{ hotel: Hotel; room: Room } | null> {
  const clean = token.trim()
  if (!clean) return null
  const { data, error } = await adminSb()
    .from('hotel_rooms')
    .select(`${ROOM_COLS}, hotel:hotel_properties!inner(${HOTEL_COLS})`)
    .eq('token', clean)
    .eq('active', true)
    .maybeSingle()
  if (error || !data) return emptyIfMissing(error, null, 'resolveRoomByToken')

  const row = data as unknown as Room & { hotel: Hotel | Hotel[] }
  const hotel = Array.isArray(row.hotel) ? row.hotel[0] : row.hotel
  if (!hotel?.active) return null
  const { hotel: _drop, ...room } = row
  return { hotel, room: room as Room }
}

/** Открытая смена номера — или null, если гость ещё ничего не писал / выехал. */
export async function findOpenStay(roomId: number): Promise<Stay | null> {
  const { data, error } = await adminSb()
    .from('hotel_stays')
    .select(STAY_COLS)
    .eq('room_id', roomId)
    .is('closed_at', null)
    .maybeSingle()
  if (error) return emptyIfMissing(error, null, 'findOpenStay')
  return (data as Stay) ?? null
}

/**
 * Смена, в которую пишется обращение гостя. Заводится лениво — первым
 * сообщением или заказом, чтобы простое открытие страницы (гость сканирует
 * QR из любопытства) не считалось заездом.
 *
 * Гонка двух вкладок ловится частичным уникальным индексом hotel_stays_open_room:
 * проигравший insert получает 23505 и перечитывает уже открытую смену.
 */
export async function ensureOpenStay(room: Room): Promise<Stay> {
  const existing = await findOpenStay(room.id)
  if (existing) return existing

  const { data, error } = await adminSb()
    .from('hotel_stays')
    .insert({ hotel_id: room.hotel_id, room_id: room.id })
    .select(STAY_COLS)
    .single()
  if (!error && data) return data as Stay

  if (error?.code === '23505') {
    const raced = await findOpenStay(room.id)
    if (raced) return raced
  }
  throw new Error(`ensureOpenStay: ${error?.message ?? 'insert returned no row'}`)
}

/**
 * Каталог отеля: категории с позициями внутри, уже в порядке показа.
 *
 * Два запроса на весь портал, а не запрос на категорию: главный экран
 * открывается на мобильном интернете, и каждый лишний round-trip виден
 * гостю секундой ожидания (ТЗ 7 — первый экран ≤3 с).
 */
export async function loadCatalog(hotelId: number, onlyActive = true): Promise<CatalogCategory[]> {
  const sb = adminSb()

  let catQ = sb.from('hotel_categories').select(CATEGORY_COLS).eq('hotel_id', hotelId)
  if (onlyActive) catQ = catQ.eq('active', true)
  const { data: catRows, error: catErr } = await catQ.order('sort').order('id')
  if (catErr) return emptyIfMissing(catErr, [], 'loadCatalog')
  const categories = (catRows ?? []) as Category[]
  if (categories.length === 0) return []

  let itemQ = sb.from('hotel_items').select(ITEM_COLS).eq('hotel_id', hotelId)
  if (onlyActive) itemQ = itemQ.eq('active', true)
  const { data: itemRows } = await itemQ.order('sort').order('id')

  const byCategory = new Map<number, Item[]>()
  for (const item of ((itemRows ?? []) as Item[])) {
    const list = byCategory.get(item.category_id)
    if (list) list.push(item)
    else byCategory.set(item.category_id, [item])
  }

  // Категория без позиций на главном не показывается (ТЗ 4.5).
  return categories
    .map(c => ({ ...c, items: byCategory.get(c.id) ?? [] }))
    .filter(c => !onlyActive || c.items.length > 0)
}

export async function itemById(hotelId: number, itemId: number): Promise<Item | null> {
  const { data, error } = await adminSb()
    .from('hotel_items')
    .select(ITEM_COLS)
    .eq('id', itemId)
    .eq('hotel_id', hotelId)
    .maybeSingle()
  if (error) return emptyIfMissing(error, null, 'itemById')
  return (data as Item) ?? null
}

export async function listMessages(stayId: number): Promise<HotelMessage[]> {
  const { data, error } = await adminSb()
    .from('hotel_messages')
    .select(MESSAGE_COLS)
    .eq('stay_id', stayId)
    .order('created_at')
  if (error) return emptyIfMissing(error, [], 'listMessages')
  return (data ?? []) as HotelMessage[]
}

export async function listStayRequests(stayId: number): Promise<HotelRequest[]> {
  const { data, error } = await adminSb()
    .from('hotel_requests')
    .select(REQUEST_COLS)
    .eq('stay_id', stayId)
    .order('created_at', { ascending: false })
  if (error) return emptyIfMissing(error, [], 'listStayRequests')
  return (data ?? []) as HotelRequest[]
}

export async function addMessage(input: {
  stay: Stay
  author: MessageAuthor
  body: string
  staffName?: string | null
  lang?: string | null
}): Promise<HotelMessage> {
  const now = new Date().toISOString()
  const { data, error } = await adminSb()
    .from('hotel_messages')
    .insert({
      hotel_id: input.stay.hotel_id,
      room_id: input.stay.room_id,
      stay_id: input.stay.id,
      author: input.author,
      staff_name: input.author === 'staff' ? (input.staffName ?? null) : null,
      body: input.body,
      lang: input.lang ?? null,
      // Своё сообщение автор, очевидно, уже прочитал — иначе оно висело бы
      // непрочитанным у него же самого.
      read_by_guest_at: input.author === 'guest' ? now : null,
      read_by_staff_at: input.author === 'staff' ? now : null,
    })
    .select(MESSAGE_COLS)
    .single()
  if (error || !data) throw new Error(`addMessage: ${error?.message ?? 'insert returned no row'}`)
  return data as HotelMessage
}

export async function addRequest(input: {
  stay: Stay
  title: string
  note?: string | null
  itemId?: number | null
  whatsapp?: string | null
  preferredTime?: string | null
  priceUsd?: number | null
  lang?: string | null
}): Promise<HotelRequest> {
  const { data, error } = await adminSb()
    .from('hotel_requests')
    .insert({
      hotel_id: input.stay.hotel_id,
      room_id: input.stay.room_id,
      stay_id: input.stay.id,
      item_id: input.itemId ?? null,
      title: input.title,
      note: input.note ?? null,
      contact_whatsapp: input.whatsapp ?? null,
      preferred_time: input.preferredTime ?? null,
      price_usd: input.priceUsd ?? null,
      lang: input.lang ?? null,
    })
    .select(REQUEST_COLS)
    .single()
  if (error || !data) throw new Error(`addRequest: ${error?.message ?? 'insert returned no row'}`)
  return data as HotelRequest
}

/** Сколько заказов гость уже создал в этой смене — защита от «залипшей» кнопки. */
export async function countOpenRequests(stayId: number): Promise<number> {
  const { count, error } = await adminSb()
    .from('hotel_requests')
    .select('id', { count: 'exact', head: true })
    .eq('stay_id', stayId)
    .in('status', ['new', 'in_progress'])
  if (error) return emptyIfMissing(error, 0, 'countOpenRequests')
  return count ?? 0
}

export async function markRead(stayId: number, side: MessageAuthor): Promise<void> {
  // Гость открыл страницу → прочитаны сообщения персонала, и наоборот.
  const column = side === 'guest' ? 'read_by_guest_at' : 'read_by_staff_at'
  const otherSide: MessageAuthor = side === 'guest' ? 'staff' : 'guest'
  const { error } = await adminSb()
    .from('hotel_messages')
    .update({ [column]: new Date().toISOString() })
    .eq('stay_id', stayId)
    .eq('author', otherSide)
    .is(column, null)
  if (error) emptyIfMissing(error, null, 'markRead')
}

/**
 * Действие гостя в журнал (ТЗ 4.10). Пишем «в фоне»: аналитика не должна
 * ронять ответ гостю, поэтому ошибки только логируем.
 */
export async function logEvent(input: {
  hotelId: number
  roomId?: number | null
  stayId?: number | null
  lang?: string | null
  type: string
  ctx?: Record<string, unknown>
}): Promise<void> {
  const { error } = await adminSb().from('hotel_events').insert({
    hotel_id: input.hotelId,
    room_id: input.roomId ?? null,
    stay_id: input.stayId ?? null,
    lang: input.lang ?? null,
    type: input.type,
    ctx: input.ctx ?? {},
  })
  if (error && !isMissingTableError(error)) console.error('[hotel] logEvent:', error.message)
}

/** Журнал за период — для выгрузки CSV в админке. */
export async function listEvents(hotelId: number, sinceIso: string, limit = 5000): Promise<HotelEvent[]> {
  const { data, error } = await adminSb()
    .from('hotel_events')
    .select('id, hotel_id, room_id, stay_id, lang, type, ctx, created_at')
    .eq('hotel_id', hotelId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return emptyIfMissing(error, [], 'listEvents')
  return (data ?? []) as HotelEvent[]
}

// ─────────────────────────── стойка ───────────────────────────

export type DeskRoom = {
  room: Room
  stay: Stay | null
  unread: number          // сообщений гостя, которых стойка ещё не видела
  openRequests: number
  lastMessageAt: string | null
  lastMessage: string | null
}

/**
 * Экран стойки целиком: все номера отеля + что в них происходит.
 * Три запроса на отель вместо запроса на номер — панель опрашивается
 * каждые несколько секунд, и N+1 тут вылезал бы в счёт за egress.
 */
export async function loadDeskRooms(hotelId: number): Promise<DeskRoom[]> {
  const sb = adminSb()

  const { data: roomRows, error: roomErr } = await sb
    .from('hotel_rooms')
    .select(ROOM_COLS)
    .eq('hotel_id', hotelId)
    .order('label')
  if (roomErr) return emptyIfMissing(roomErr, [], 'loadDeskRooms')
  const rooms = (roomRows ?? []) as Room[]
  if (rooms.length === 0) return []

  const { data: stayRows } = await sb
    .from('hotel_stays')
    .select(STAY_COLS)
    .eq('hotel_id', hotelId)
    .is('closed_at', null)
  const stayByRoom = new Map<number, Stay>()
  for (const s of (stayRows ?? []) as Stay[]) stayByRoom.set(s.room_id, s)

  const stayIds = [...stayByRoom.values()].map(s => s.id)
  const unread = new Map<number, number>()
  const lastMsg = new Map<number, HotelMessage>()
  if (stayIds.length > 0) {
    const { data: msgRows } = await sb
      .from('hotel_messages')
      .select(MESSAGE_COLS)
      .in('stay_id', stayIds)
      .order('created_at')
    for (const m of (msgRows ?? []) as HotelMessage[]) {
      lastMsg.set(m.stay_id, m)
      if (m.author === 'guest' && !m.read_by_staff_at) unread.set(m.stay_id, (unread.get(m.stay_id) ?? 0) + 1)
    }
  }

  const openReq = new Map<number, number>()
  const { data: reqRows } = await sb
    .from('hotel_requests')
    .select('room_id, status')
    .eq('hotel_id', hotelId)
    .in('status', ['new', 'in_progress'])
  for (const r of (reqRows ?? []) as { room_id: number }[]) {
    openReq.set(r.room_id, (openReq.get(r.room_id) ?? 0) + 1)
  }

  return rooms.map(room => {
    const stay = stayByRoom.get(room.id) ?? null
    const last = stay ? lastMsg.get(stay.id) ?? null : null
    return {
      room,
      stay,
      unread: stay ? unread.get(stay.id) ?? 0 : 0,
      openRequests: openReq.get(room.id) ?? 0,
      lastMessageAt: last?.created_at ?? null,
      lastMessage: last?.body ?? null,
    }
  })
}

export type DeskRequest = HotelRequest & { room_label: string }

export async function loadDeskRequests(hotelId: number, limit = 100): Promise<DeskRequest[]> {
  const { data, error } = await adminSb()
    .from('hotel_requests')
    .select(`${REQUEST_COLS}, room:hotel_rooms!inner(label)`)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return emptyIfMissing(error, [], 'loadDeskRequests')

  return ((data ?? []) as unknown as (HotelRequest & { room: { label: string } | { label: string }[] })[]).map(r => {
    const room = Array.isArray(r.room) ? r.room[0] : r.room
    const { room: _drop, ...rest } = r
    return { ...(rest as HotelRequest), room_label: room?.label ?? '' }
  })
}

export async function setRequestStatus(
  hotelId: number, requestId: number, status: RequestStatus,
): Promise<HotelRequest | null> {
  const done = status === 'done' || status === 'declined'
  const { data, error } = await adminSb()
    .from('hotel_requests')
    .update({
      status,
      updated_at: new Date().toISOString(),
      closed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', requestId)
    .eq('hotel_id', hotelId)   // чужой отель чужие заказы не двигает
    .select(REQUEST_COLS)
    .maybeSingle()
  if (error) return emptyIfMissing(error, null, 'setRequestStatus')
  return (data as HotelRequest) ?? null
}

export async function roomById(hotelId: number, roomId: number): Promise<Room | null> {
  const { data, error } = await adminSb()
    .from('hotel_rooms')
    .select(ROOM_COLS)
    .eq('id', roomId)
    .eq('hotel_id', hotelId)
    .maybeSingle()
  if (error) return emptyIfMissing(error, null, 'roomById')
  return (data as Room) ?? null
}

export async function stayById(hotelId: number, stayId: number): Promise<Stay | null> {
  const { data, error } = await adminSb()
    .from('hotel_stays')
    .select(STAY_COLS)
    .eq('id', stayId)
    .eq('hotel_id', hotelId)
    .maybeSingle()
  if (error) return emptyIfMissing(error, null, 'stayById')
  return (data as Stay) ?? null
}

/**
 * Выезд: закрывает смену и всё, что по ней висело незакрытым. Следующий
 * гость этого номера начнёт с чистой переписки.
 */
export async function closeStay(hotelId: number, stayId: number): Promise<void> {
  const now = new Date().toISOString()
  const sb = adminSb()
  const { error } = await sb
    .from('hotel_stays')
    .update({ closed_at: now })
    .eq('id', stayId)
    .eq('hotel_id', hotelId)
    .is('closed_at', null)
  if (error) { emptyIfMissing(error, null, 'closeStay'); return }
  await sb
    .from('hotel_requests')
    .update({ status: 'done', updated_at: now, closed_at: now })
    .eq('stay_id', stayId)
    .in('status', ['new', 'in_progress'])
}

export async function setGuestName(hotelId: number, stayId: number, name: string | null): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_stays')
    .update({ guest_name: name })
    .eq('id', stayId)
    .eq('hotel_id', hotelId)
  if (error) emptyIfMissing(error, null, 'setGuestName')
}

// ─────────────────────────── админка ───────────────────────────

export async function listHotels(): Promise<Hotel[]> {
  const { data, error } = await adminSb()
    .from('hotel_properties')
    .select(HOTEL_COLS)
    .order('name')
  if (error) return emptyIfMissing(error, [], 'listHotels')
  return (data ?? []) as Hotel[]
}

export async function hotelBySlug(slug: string): Promise<Hotel | null> {
  const { data, error } = await adminSb()
    .from('hotel_properties')
    .select(HOTEL_COLS)
    .eq('slug', slug)
    .maybeSingle()
  if (error) return emptyIfMissing(error, null, 'hotelBySlug')
  return (data as Hotel) ?? null
}

/** Код входа в панель стойки — отдельным запросом, чтобы не таскать его в списках. */
export async function hotelStaffCode(hotelId: number): Promise<string | null> {
  const { data, error } = await adminSb()
    .from('hotel_properties')
    .select('staff_code')
    .eq('id', hotelId)
    .maybeSingle()
  if (error) return emptyIfMissing(error, null, 'hotelStaffCode')
  return (data as { staff_code: string } | null)?.staff_code ?? null
}

export async function createHotel(input: {
  slug: string; name: string; address?: string | null; lang?: PortalLang; staffCode: string
}): Promise<Hotel> {
  const { data, error } = await adminSb()
    .from('hotel_properties')
    .insert({
      slug: input.slug,
      name: input.name,
      address: input.address ?? null,
      lang: input.lang ?? 'en',
      staff_code: input.staffCode,
    })
    .select(HOTEL_COLS)
    .single()
  if (error || !data) throw new Error(`createHotel: ${error?.message ?? 'insert returned no row'}`)
  return data as Hotel
}

export async function updateHotel(id: number, patch: Partial<{
  name: string; address: string | null; lang: PortalLang; langs: PortalLang[]
  whatsapp: string | null; telegram_username: string | null; telegram_chat_id: string | null
  has_restaurant: boolean; staff_code: string; active: boolean
}>): Promise<void> {
  const { error } = await adminSb().from('hotel_properties').update(patch).eq('id', id)
  if (error) throw new Error(`updateHotel: ${error.message}`)
}

export async function listRooms(hotelId: number): Promise<Room[]> {
  const { data, error } = await adminSb()
    .from('hotel_rooms')
    .select(ROOM_COLS)
    .eq('hotel_id', hotelId)
    .order('label')
  if (error) return emptyIfMissing(error, [], 'listRooms')
  return (data ?? []) as Room[]
}

/** Заводит номера пачкой; уже существующие метки пропускает молча. */
export async function createRooms(
  hotelId: number, labels: string[], makeToken: () => string,
): Promise<Room[]> {
  const existing = new Set((await listRooms(hotelId)).map(r => r.label))
  const rows = labels
    .map(l => l.trim())
    .filter(l => l && !existing.has(l))
    .map(label => ({ hotel_id: hotelId, label, token: makeToken() }))
  if (rows.length === 0) return []
  const { data, error } = await adminSb().from('hotel_rooms').insert(rows).select(ROOM_COLS)
  if (error) throw new Error(`createRooms: ${error.message}`)
  return (data ?? []) as Room[]
}

export async function setRoomActive(hotelId: number, roomId: number, active: boolean): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_rooms')
    .update({ active })
    .eq('id', roomId)
    .eq('hotel_id', hotelId)
  if (error) throw new Error(`setRoomActive: ${error.message}`)
}

/** Новый токен = старая наклейка перестаёт работать. Нужен, если QR утёк. */
export async function rotateRoomToken(hotelId: number, roomId: number, token: string): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_rooms')
    .update({ token })
    .eq('id', roomId)
    .eq('hotel_id', hotelId)
  if (error) throw new Error(`rotateRoomToken: ${error.message}`)
}

export async function upsertCategory(hotelId: number, input: {
  code: string; section: CatalogSection; title: I18nField; caption?: I18nField | null
  icon?: string | null; photo_url?: string | null; sort?: number; active?: boolean
}): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_categories')
    .upsert({
      hotel_id: hotelId,
      code: input.code,
      section: input.section,
      title: input.title,
      caption: input.caption ?? null,
      icon: input.icon ?? null,
      photo_url: input.photo_url ?? null,
      sort: input.sort ?? 100,
      active: input.active ?? true,
    }, { onConflict: 'hotel_id,code' })
  if (error) throw new Error(`upsertCategory: ${error.message}`)
}

export async function upsertItem(hotelId: number, categoryId: number, input: {
  code: string; title: I18nField; descr?: I18nField | null
  price_usd?: number | null; unit?: Item['unit']; photo_url?: string | null
  sort?: number; active?: boolean
}): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_items')
    .upsert({
      hotel_id: hotelId,
      category_id: categoryId,
      code: input.code,
      title: input.title,
      descr: input.descr ?? null,
      price_usd: input.price_usd ?? null,
      unit: input.unit ?? null,
      photo_url: input.photo_url ?? null,
      sort: input.sort ?? 100,
      active: input.active ?? true,
    }, { onConflict: 'category_id,code' })
  if (error) throw new Error(`upsertItem: ${error.message}`)
}

export async function setCategoryActive(hotelId: number, id: number, active: boolean): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_categories').update({ active }).eq('id', id).eq('hotel_id', hotelId)
  if (error) throw new Error(`setCategoryActive: ${error.message}`)
}

export async function setItemActive(hotelId: number, id: number, active: boolean): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_items').update({ active }).eq('id', id).eq('hotel_id', hotelId)
  if (error) throw new Error(`setItemActive: ${error.message}`)
}

export async function deleteItem(hotelId: number, id: number): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_items').delete().eq('id', id).eq('hotel_id', hotelId)
  if (error) throw new Error(`deleteItem: ${error.message}`)
}

/** Chat id ресепшн — server-only, наружу не отдаём. */
export async function hotelTelegramChat(hotelId: number): Promise<string | null> {
  const { data, error } = await adminSb()
    .from('hotel_properties').select('telegram_chat_id').eq('id', hotelId).maybeSingle()
  if (error) return emptyIfMissing(error, null, 'hotelTelegramChat')
  return (data as { telegram_chat_id: string | null } | null)?.telegram_chat_id ?? null
}
