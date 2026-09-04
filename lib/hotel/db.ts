// Данные сервиса «QR в номере»: отели, номера, смены гостей, заказы, чат.
//
// Server-only: всё ходит под service_role (таблицы закрыты RLS без политик,
// см. migrations/079_hotel_qr.sql), поэтому импортировать из клиентских
// компонентов нельзя — только из route handlers и серверных страниц.

import { adminSb, isMissingTableError } from '@/lib/admin/sb'

export type HotelLang = 'en' | 'ru'
export type RequestStatus = 'new' | 'in_progress' | 'done' | 'declined'
export type MessageAuthor = 'guest' | 'staff'

export type Hotel = {
  id: number
  slug: string
  name: string
  address: string | null
  lang: HotelLang
  active: boolean
}

export type Room = {
  id: number
  hotel_id: number
  label: string
  token: string
  active: boolean
}

export type HotelService = {
  id: number
  hotel_id: number
  code: string
  title: string
  title_en: string | null
  note: string | null
  price_usd: number | null
  sort: number
  active: boolean
}

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
  service_code: string | null
  title: string
  note: string | null
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
  created_at: string
  read_by_staff_at: string | null
  read_by_guest_at: string | null
}

const HOTEL_COLS = 'id, slug, name, address, lang, active'
const ROOM_COLS = 'id, hotel_id, label, token, active'
const SERVICE_COLS = 'id, hotel_id, code, title, title_en, note, price_usd, sort, active'
const STAY_COLS = 'id, hotel_id, room_id, guest_name, opened_at, closed_at'
const REQUEST_COLS =
  'id, hotel_id, room_id, stay_id, service_code, title, note, status, created_at, updated_at, closed_at'
const MESSAGE_COLS =
  'id, stay_id, room_id, author, staff_name, body, created_at, read_by_staff_at, read_by_guest_at'

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

export async function listServices(hotelId: number, onlyActive = true): Promise<HotelService[]> {
  let q = adminSb().from('hotel_services').select(SERVICE_COLS).eq('hotel_id', hotelId)
  if (onlyActive) q = q.eq('active', true)
  const { data, error } = await q.order('sort').order('id')
  if (error) return emptyIfMissing(error, [], 'listServices')
  return (data ?? []) as HotelService[]
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
  serviceCode?: string | null
}): Promise<HotelRequest> {
  const { data, error } = await adminSb()
    .from('hotel_requests')
    .insert({
      hotel_id: input.stay.hotel_id,
      room_id: input.stay.room_id,
      stay_id: input.stay.id,
      service_code: input.serviceCode ?? null,
      title: input.title,
      note: input.note ?? null,
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
  slug: string; name: string; address?: string | null; lang?: HotelLang; staffCode: string
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
  name: string; address: string | null; lang: HotelLang; staff_code: string; active: boolean
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

export async function upsertService(hotelId: number, input: {
  code: string; title: string; title_en?: string | null; note?: string | null
  price_usd?: number | null; sort?: number; active?: boolean
}): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_services')
    .upsert({
      hotel_id: hotelId,
      code: input.code,
      title: input.title,
      title_en: input.title_en ?? null,
      note: input.note ?? null,
      price_usd: input.price_usd ?? null,
      sort: input.sort ?? 100,
      active: input.active ?? true,
    }, { onConflict: 'hotel_id,code' })
  if (error) throw new Error(`upsertService: ${error.message}`)
}

export async function setServiceActive(hotelId: number, serviceId: number, active: boolean): Promise<void> {
  const { error } = await adminSb()
    .from('hotel_services')
    .update({ active })
    .eq('id', serviceId)
    .eq('hotel_id', hotelId)
  if (error) throw new Error(`setServiceActive: ${error.message}`)
}
