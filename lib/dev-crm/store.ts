// Чтение и запись CRM по застройщикам. Только сервер: ходит service-ключом.
//
// Две идеи, на которых всё держится.
//
// 1. Ничего не копируем. Переписка живёт в tg_messages/tg_meetings (их
//    пишет бот-наблюдатель), данные самой компании — в raw_developers
//    (синхронизируется из Airtable). Карточка хранит только ключи связи
//    и подтягивает остальное на лету, поэтому расхождений не бывает.
//
// 2. Воронка на компании, чаты на людях. У застройщика несколько
//    контактов, и «последний контакт с компанией» — максимум по её людям.

import { createClient } from '@supabase/supabase-js'
// Читатели переписки бота общие с CRM агентов: это чтение tg_messages,
// а не что-то про агентов. Держать вторую копию тех же 30 строк значит
// завести два расходящихся способа прочитать один и тот же чат.
import { chatMeetings, chatTail, type ChatMeeting, type ChatMessage } from '@/lib/agents/store'
import {
  type DevNote, type DevPartner, type DevPartnerCard, type DevPerson, type DevPersonCard,
  type DevStatus, type MergePair, type PersonRole, type Prospect,
  nameKey, normalizeTelegram, splitContact, STATUS_LABEL,
} from './types'

export type { ChatMeeting, ChatMessage }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type ChatRow = {
  chat_id: number
  contact: string | null
  last_ts: string
  last_text: string | null
  message_count: number
  meeting_count: number
}

async function chatIndex(): Promise<Map<number, ChatRow>> {
  const { data, error } = await sb.rpc('tg_chat_list')
  // Переписка — дополнение, а не условие работы раздела: если
  // бот-наблюдатель отвалился, доска обязана открыться без него.
  if (error) { console.error('[dev-crm] tg_chat_list:', error.message); return new Map() }
  return new Map((data as ChatRow[] ?? []).map(c => [c.chat_id, c]))
}

async function nextMeetings(): Promise<Map<number, { starts_at: string; place: string | null }>> {
  const { data, error } = await sb
    .from('tg_meetings')
    .select('chat_id,starts_at,place,status')
    .in('status', ['agreed', 'scheduled'])
    .gte('starts_at', new Date(Date.now() - 6 * 3600_000).toISOString())
    .order('starts_at', { ascending: true })
  if (error) { console.error('[dev-crm] tg_meetings:', error.message); return new Map() }
  const out = new Map<number, { starts_at: string; place: string | null }>()
  for (const m of data ?? []) {
    if (m.starts_at && !out.has(m.chat_id)) out.set(m.chat_id, { starts_at: m.starts_at, place: m.place })
  }
  return out
}

type Ctx = {
  chats: Map<number, ChatRow>
  meetings: Map<number, { starts_at: string; place: string | null }>
}

function toPersonCard(p: DevPerson, ctx: Ctx): DevPersonCard {
  const chat = p.tg_chat_id != null ? ctx.chats.get(p.tg_chat_id) : undefined
  const meeting = p.tg_chat_id != null ? ctx.meetings.get(p.tg_chat_id) : undefined
  return {
    ...p,
    chat_last_ts: chat?.last_ts ?? null,
    chat_last_text: chat?.last_text ?? null,
    chat_message_count: chat?.message_count ?? 0,
    chat_meeting_count: chat?.meeting_count ?? 0,
    next_meeting_at: meeting?.starts_at ?? null,
    next_meeting_place: meeting?.place ?? null,
  }
}

// Порядок людей в карточке: сначала основатели, потом сотрудники, потом
// «через него выход»; внутри роли — у кого есть живая переписка.
const ROLE_ORDER: Record<PersonRole, number> = { founder: 0, staff: 1, via: 2 }
function peopleOrder(a: DevPersonCard, b: DevPersonCard): number {
  if (ROLE_ORDER[a.role] !== ROLE_ORDER[b.role]) return ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
  if ((b.chat_message_count > 0 ? 1 : 0) !== (a.chat_message_count > 0 ? 1 : 0)) {
    return (b.chat_message_count > 0 ? 1 : 0) - (a.chat_message_count > 0 ? 1 : 0)
  }
  if (a.sort !== b.sort) return a.sort - b.sort
  return a.name.localeCompare(b.name, 'ru')
}

function toCard(p: DevPartner, people: DevPerson[], ctx: Ctx): DevPartnerCard {
  const cards = people.map(x => toPersonCard(x, ctx)).sort(peopleOrder)
  const linked = cards.filter(c => c.tg_chat_id != null)
  const withMeeting = cards.filter(c => c.next_meeting_at).sort((a, b) => a.next_meeting_at!.localeCompare(b.next_meeting_at!))
  const lastTs = linked.map(c => c.chat_last_ts).filter((v): v is string => !!v).sort().at(-1) ?? null
  return {
    ...p,
    data: p.data ?? {},
    people: cards,
    people_count: cards.length,
    linked_count: linked.length,
    chat_message_count: cards.reduce((s, c) => s + c.chat_message_count, 0),
    next_meeting_at: withMeeting[0]?.next_meeting_at ?? null,
    next_meeting_place: withMeeting[0]?.next_meeting_place ?? null,
    chat_last_ts: lastTs,
  }
}

export async function listPartners(includeArchived = false): Promise<DevPartnerCard[]> {
  let q = sb.from('dev_partners').select('*').order('sort', { ascending: true }).order('name', { ascending: true })
  if (!includeArchived) q = q.eq('archived', false)
  const [{ data: partners, error }, { data: people, error: pErr }, chats, meetings] = await Promise.all([
    q,
    sb.from('dev_people').select('*').eq('archived', false),
    chatIndex(),
    nextMeetings(),
  ])
  if (error) throw new Error(error.message)
  if (pErr) throw new Error(pErr.message)

  const byPartner = new Map<string, DevPerson[]>()
  for (const x of (people as DevPerson[] ?? [])) {
    const list = byPartner.get(x.partner_id)
    if (list) list.push(x)
    else byPartner.set(x.partner_id, [x])
  }
  const ctx: Ctx = { chats, meetings }
  return (partners as DevPartner[] ?? []).map(p => toCard(p, byPartner.get(p.id) ?? [], ctx))
}

export async function getPartner(id: string): Promise<DevPartnerCard | null> {
  const [{ data, error }, { data: people }, chats, meetings] = await Promise.all([
    sb.from('dev_partners').select('*').eq('id', id).maybeSingle(),
    sb.from('dev_people').select('*').eq('partner_id', id).eq('archived', false),
    chatIndex(),
    nextMeetings(),
  ])
  if (error) throw new Error(error.message)
  if (!data) return null
  return toCard(data as DevPartner, (people as DevPerson[]) ?? [], { chats, meetings })
}

// Данные компании со страницы сайта: проекты, рейтинг, комиссия. Читаем
// из raw_developers по ключу связи — в карточку это не копируется.
export type SiteFacts = {
  name: string | null
  slug: string | null
  rating: string | null
  commission: string | null
  published: boolean
  website: string | null
}

export async function siteFacts(keys: string[]): Promise<Map<string, SiteFacts>> {
  const out = new Map<string, SiteFacts>()
  if (!keys.length) return out
  const { data, error } = await sb.from('raw_developers').select('data')
  if (error) { console.error('[dev-crm] raw_developers:', error.message); return out }
  const want = new Set(keys)
  for (const row of data ?? []) {
    const d = (row.data ?? {}) as Record<string, unknown>
    const key = String(d['Developer_key'] ?? d['Developer'] ?? '')
    if (!key || !want.has(key)) continue
    const rating = d['Общий рейтинг'] ?? d['Rating of developer2'] ?? null
    out.set(key, {
      name: d['Developer'] ? String(d['Developer']) : null,
      slug: d['SEO:Slug'] ? String(d['SEO:Slug']) : null,
      rating: rating == null ? null : String(rating),
      commission: d['Комиссия отображение'] ? String(d['Комиссия отображение'])
        : d['Комиссия'] != null ? String(d['Комиссия']) : null,
      published: d['Публикация'] === true,
      website: d["Link on developer's website"] ? String(d["Link on developer's website"]) : null,
    })
  }
  return out
}

export async function listNotes(partnerId: string): Promise<DevNote[]> {
  const { data, error } = await sb
    .from('dev_partner_notes')
    .select('id,body,kind,author,created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as DevNote[]
}

export async function addNote(
  partnerId: string, body: string, author: string | null, kind: 'note' | 'system' = 'note',
): Promise<DevNote> {
  const { data, error } = await sb
    .from('dev_partner_notes')
    .insert({ partner_id: partnerId, body, author, kind })
    .select('id,body,kind,author,created_at')
    .single()
  if (error) throw new Error(error.message)
  return data as DevNote
}

// Поля, которые админка имеет право писать. Whitelist, а не «всё, что
// пришло»: PATCH приходит из браузера, и без него можно было бы
// переписать id или чужую связку с сайтом.
const PARTNER_WRITABLE = new Set([
  'name', 'status', 'prospect', 'in_work', 'manager', 'location',
  'website', 'email', 'phone', 'whatsapp', 'telegram', 'instagram',
  'projects', 'commission',
  'last_contact', 'next_contact', 'next_step', 'notes',
  'site_developer_key', 'site_slug', 'data', 'sort', 'archived',
])

export async function updatePartner(
  id: string, patch: Record<string, unknown>, author?: string | null,
): Promise<DevPartner> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) if (PARTNER_WRITABLE.has(k)) clean[k] = v === '' ? null : v
  if (typeof clean.telegram === 'string') clean.telegram = normalizeTelegram(clean.telegram)
  if (!Object.keys(clean).length) throw new Error('nothing_to_update')
  clean.updated_at = new Date().toISOString()

  // Смена статуса — событие воронки: через месяц важно помнить, когда
  // компания по ней проехала. Читаем прежнее значение до апдейта.
  if (typeof clean.status === 'string') {
    const { data: before } = await sb.from('dev_partners').select('status').eq('id', id).maybeSingle()
    const from = before?.status as DevStatus | undefined
    if (from && from !== clean.status) {
      await addNote(id, `Статус: ${STATUS_LABEL[from]} → ${STATUS_LABEL[clean.status as DevStatus]}`, author ?? null, 'system')
    }
  }
  // Взяли в работу из резерва — тоже событие, и по ленте видно, когда.
  if (clean.in_work === true) {
    const { data: before } = await sb.from('dev_partners').select('in_work').eq('id', id).maybeSingle()
    if (before && before.in_work === false) await addNote(id, 'Взят в работу', author ?? null, 'system')
  }

  const { data, error } = await sb.from('dev_partners').update(clean).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)
  return data as DevPartner
}

export async function createPartner(input: {
  name: string
  status?: DevStatus
  prospect?: Prospect | null
  in_work?: boolean
  site_developer_key?: string | null
  site_slug?: string | null
  source?: string
  data?: Record<string, string>
}): Promise<DevPartner> {
  const { data, error } = await sb
    .from('dev_partners')
    .insert({
      name: input.name.trim(),
      status: input.status ?? 'new',
      prospect: input.prospect ?? null,
      in_work: input.in_work ?? true,
      site_developer_key: input.site_developer_key ?? null,
      site_slug: input.site_slug ?? null,
      source: input.source ?? 'manual',
      data: input.data ?? {},
      // Новая карточка встаёт первой в своей колонке.
      sort: -Date.now(),
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as DevPartner
}

export async function deletePartner(id: string): Promise<void> {
  const { error } = await sb.from('dev_partners').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------- Люди ----------

const PERSON_WRITABLE = new Set([
  'name', 'role', 'position', 'telegram', 'tg_channel', 'instagram',
  'whatsapp', 'phone', 'email', 'access_note', 'notes', 'sort', 'archived',
])

export async function createPerson(partnerId: string, input: {
  name: string
  role?: PersonRole
  telegram?: string | null
  tg_chat_id?: number | null
  access_note?: string | null
}): Promise<DevPerson> {
  const nick = normalizeTelegram(input.telegram)
  const { data, error } = await sb
    .from('dev_people')
    .insert({
      partner_id: partnerId,
      name: input.name.trim(),
      role: input.role ?? 'staff',
      telegram: nick,
      tg_chat_id: input.tg_chat_id ?? null,
      access_note: input.access_note ?? null,
      sort: Date.now(),
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const person = data as DevPerson

  // Вписали ник — сами находим переписку, как в карточке агента.
  if (nick && person.tg_chat_id == null) {
    const chatId = await findChatByNick(nick)
    if (chatId != null && !(await chatTakenBy(chatId))) return await linkPersonChat(person.id, chatId, null)
  }
  return person
}

export async function updatePerson(
  id: string, patch: Record<string, unknown>, author?: string | null,
): Promise<DevPerson> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) if (PERSON_WRITABLE.has(k)) clean[k] = v === '' ? null : v
  if (typeof clean.telegram === 'string') clean.telegram = normalizeTelegram(clean.telegram)
  if (!Object.keys(clean).length) throw new Error('nothing_to_update')
  clean.updated_at = new Date().toISOString()

  const { data, error } = await sb.from('dev_people').update(clean).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)
  const saved = data as DevPerson

  if (typeof clean.telegram === 'string' && clean.telegram && saved.tg_chat_id == null) {
    const chatId = await findChatByNick(clean.telegram)
    if (chatId != null && !(await chatTakenBy(chatId))) return await linkPersonChat(id, chatId, author)
  }
  return saved
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await sb.from('dev_people').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

async function chatTakenBy(chatId: number, exceptPersonId?: string): Promise<string | null> {
  const { data } = await sb
    .from('dev_people')
    .select('id,name,partner_id')
    .eq('tg_chat_id', chatId)
    .maybeSingle()
  if (!data || data.id === exceptPersonId) return null
  const { data: partner } = await sb.from('dev_partners').select('name').eq('id', data.partner_id).maybeSingle()
  return partner?.name ? `${data.name} (${partner.name})` : data.name
}

// Привязать/отвязать чат бота человеку. Чат занят другим — говорим об
// этом, а не отдаём наружу ошибку уникальности из Postgres.
export async function linkPersonChat(
  personId: string, chatId: number | null, author?: string | null,
): Promise<DevPerson> {
  if (chatId != null) {
    const taken = await chatTakenBy(chatId, personId)
    if (taken) throw new Error(`chat_taken:${taken}`)
  }
  const { data, error } = await sb
    .from('dev_people')
    .update({ tg_chat_id: chatId, updated_at: new Date().toISOString() })
    .eq('id', personId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const person = data as DevPerson
  await addNote(
    person.partner_id,
    chatId == null ? `Переписка отвязана от ${person.name}` : `Переписка привязана к ${person.name}`,
    author ?? null, 'system',
  )
  return person
}

async function findChatByNick(nick: string): Promise<number | null> {
  const chats = await chatIndex()
  for (const c of chats.values()) {
    const { username } = splitContact(c.contact)
    if (username && normalizeTelegram(username) === nick) return c.chat_id
  }
  return null
}

// Привязать к людям чаты, которые бот завёл уже после их появления в
// базе. Причина отдельного прохода та же, что в CRM агентов: ник есть,
// чат есть, а связи нет — потому что в момент импорта разговора ещё не
// существовало. Проход дешёвый и идемпотентный, гоняем при каждом
// открытии раздела.
//
// Осторожность: трогаем только людей БЕЗ чата и только свободные чаты.
export async function autoLinkChatsByNick(): Promise<number> {
  const [chats, { data: people, error }] = await Promise.all([
    chatIndex(),
    sb.from('dev_people').select('id,name,partner_id,telegram,tg_chat_id')
      .eq('archived', false).order('created_at', { ascending: true }),
  ])
  if (error) { console.error('[dev-crm] autolink:', error.message); return 0 }

  const nickToChat = new Map<string, number>()
  for (const c of chats.values()) {
    const nick = normalizeTelegram(splitContact(c.contact).username)
    if (nick && !nickToChat.has(nick)) nickToChat.set(nick, c.chat_id)
  }
  const taken = new Set((people ?? []).map(p => p.tg_chat_id).filter((v): v is number => v != null))

  let linked = 0
  for (const p of people ?? []) {
    if (p.tg_chat_id != null || !p.telegram) continue
    const chatId = nickToChat.get(p.telegram)
    if (chatId == null || taken.has(chatId)) continue
    const { error: upErr } = await sb
      .from('dev_people')
      .update({ tg_chat_id: chatId, updated_at: new Date().toISOString() })
      .eq('id', p.id)
      // Гонка двух одновременных проходов: вторая запись не должна
      // перетереть первую, поэтому обновляем только пока чата нет.
      .is('tg_chat_id', null)
    if (upErr) { console.error('[dev-crm] autolink update:', p.name, upErr.message); continue }
    taken.add(chatId)
    linked++
    await addNote(p.partner_id, `Переписка привязана автоматически по нику @${p.telegram} (${p.name})`, null, 'system')
  }
  if (linked) console.log(`[dev-crm] автопривязка по нику: ${linked}`)
  return linked
}

export type ChatOption = {
  chat_id: number
  contact: string | null
  name: string
  username: string | null
  last_ts: string
  last_text: string | null
  message_count: number
  meeting_count: number
  // Кем чат уже занят: человеком застройщика или карточкой агента.
  // Второе — не запрет, а предупреждение: «это агент, а не застройщик».
  taken_by: string | null
  is_agent: string | null
}

// Все чаты бота для выпадашки «привязать переписку» с пометкой, кем
// чат занят. Карточки агентов читаем только чтобы подписать чат — CRM
// агентов от этого не зависит и ничего не теряет.
export async function listAllChats(): Promise<ChatOption[]> {
  const [chats, { data: people }, { data: agents }] = await Promise.all([
    chatIndex(),
    sb.from('dev_people').select('id,name,partner_id,tg_chat_id'),
    sb.from('agents').select('name,tg_chat_id').not('tg_chat_id', 'is', null),
  ])
  const partnerIds = [...new Set((people ?? []).map(p => p.partner_id))]
  const { data: partners } = partnerIds.length
    ? await sb.from('dev_partners').select('id,name').in('id', partnerIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const partnerName = new Map((partners ?? []).map(p => [p.id, p.name]))
  const owner = new Map<number, string>()
  for (const p of people ?? []) {
    if (p.tg_chat_id != null) owner.set(p.tg_chat_id, `${p.name} · ${partnerName.get(p.partner_id) ?? '—'}`)
  }
  const agentOf = new Map<number, string>((agents ?? []).map(a => [a.tg_chat_id as number, a.name as string]))

  return [...chats.values()]
    .map(c => {
      const { name, username } = splitContact(c.contact)
      return {
        chat_id: c.chat_id, contact: c.contact, name: name || `Чат ${c.chat_id}`, username,
        last_ts: c.last_ts, last_text: c.last_text,
        message_count: c.message_count, meeting_count: c.meeting_count,
        taken_by: owner.get(c.chat_id) ?? null,
        is_agent: agentOf.get(c.chat_id) ?? null,
      }
    })
    .sort((a, b) => b.last_ts.localeCompare(a.last_ts))
}

// ---------- Похожие карточки ----------

export async function listMergePairs(): Promise<MergePair[]> {
  const { data, error } = await sb
    .from('dev_merge_pairs')
    .select('id,reason,state,left_id,right_id')
    .eq('state', 'pending')
  if (error) throw new Error(error.message)
  if (!data?.length) return []

  const cards = new Map((await listPartners(true)).map(p => [p.id, p]))
  const out: MergePair[] = []
  for (const row of data) {
    const left = cards.get(row.left_id), right = cards.get(row.right_id)
    // Одну из карточек уже удалили руками — пара потеряла смысл.
    if (!left || !right) continue
    out.push({ id: row.id, reason: row.reason, state: row.state, left, right })
  }
  return out.sort((a, b) => a.left.name.localeCompare(b.left.name, 'ru'))
}

// keep — какая из двух карточек остаётся. Выбор обязателен: склейка
// необратима, а название у остающейся своё. Для пары «Alpha Partner
// Bali» и «ALPHA DEVELOPMENT GROUP» правильное название знает только
// владелец, и молча оставлять первую нельзя.
export async function decidePair(
  pairId: string, decision: 'merged' | 'distinct', author: string | null,
  keep: 'left' | 'right' = 'left',
): Promise<void> {
  const { data: pair, error } = await sb
    .from('dev_merge_pairs').select('left_id,right_id,state').eq('id', pairId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!pair) throw new Error('pair_not_found')
  if (pair.state !== 'pending') return

  if (decision === 'merged') {
    const [target, source] = keep === 'left'
      ? [pair.left_id, pair.right_id]
      : [pair.right_id, pair.left_id]
    await mergePartners(target, source, author)
  }

  const { error: upErr } = await sb
    .from('dev_merge_pairs')
    .update({ state: decision, decided_at: new Date().toISOString(), decided_by: author })
    .eq('id', pairId)
  if (upErr) throw new Error(upErr.message)
}

// Склеить две карточки: людей, заметки и непустые поля переносим в
// целевую, источник удаляем.
//
// Правило заполнения: НЕ перетираем то, что в целевой уже заполнено.
// Склейка — операция без отмены, и молча заменить проверенный контакт
// на пришедший из выгрузки хуже, чем оставить как есть.
export async function mergePartners(targetId: string, sourceId: string, author: string | null): Promise<void> {
  if (targetId === sourceId) throw new Error('same_partner')
  const [{ data: target }, { data: source }] = await Promise.all([
    sb.from('dev_partners').select('*').eq('id', targetId).maybeSingle(),
    sb.from('dev_partners').select('*').eq('id', sourceId).maybeSingle(),
  ])
  if (!target || !source) throw new Error('partner_not_found')
  const t = target as DevPartner, s = source as DevPartner

  const FILLABLE = [
    'site_developer_key', 'site_slug', 'prospect', 'manager', 'location',
    'website', 'email', 'phone', 'whatsapp', 'telegram', 'instagram',
    'projects', 'commission', 'last_contact', 'next_contact', 'next_step',
  ] as const
  const patch: Record<string, unknown> = {}
  for (const f of FILLABLE) {
    if ((t as Record<string, unknown>)[f] == null && (s as Record<string, unknown>)[f] != null) {
      patch[f] = (s as Record<string, unknown>)[f]
    }
  }
  // Свободные заметки не теряем: у обеих карточек они могут быть.
  if (s.notes && s.notes !== t.notes) patch.notes = [t.notes, s.notes].filter(Boolean).join('\n\n')
  // Анкета: поля источника только там, где у целевой пусто.
  patch.data = { ...(s.data ?? {}), ...(t.data ?? {}) }
  if (s.in_work && !t.in_work) patch.in_work = true
  patch.updated_at = new Date().toISOString()

  const { error: upErr } = await sb.from('dev_partners').update(patch).eq('id', targetId)
  if (upErr) throw new Error(upErr.message)

  // Людей переносим по одному: у тёзок с одним и тем же ником
  // переносить второго незачем, а чат у него уникальный на всю таблицу.
  const [{ data: theirs }, { data: ours }] = await Promise.all([
    sb.from('dev_people').select('*').eq('partner_id', sourceId),
    sb.from('dev_people').select('id,name,telegram,tg_chat_id').eq('partner_id', targetId),
  ])
  const haveNick = new Set((ours ?? []).map(p => p.telegram).filter((v): v is string => !!v))
  const haveName = new Set((ours ?? []).map(p => p.name.toLowerCase()))
  let moved = 0, dropped = 0
  for (const p of (theirs as DevPerson[] ?? [])) {
    const dup = (p.telegram && haveNick.has(p.telegram)) || (!p.telegram && haveName.has(p.name.toLowerCase()))
    if (dup) { await sb.from('dev_people').delete().eq('id', p.id); dropped++; continue }
    const { error } = await sb.from('dev_people').update({ partner_id: targetId }).eq('id', p.id)
    if (error) { console.error('[dev-crm] merge person:', p.name, error.message); continue }
    if (p.telegram) haveNick.add(p.telegram)
    haveName.add(p.name.toLowerCase())
    moved++
  }

  await sb.from('dev_partner_notes').update({ partner_id: targetId }).eq('partner_id', sourceId)
  await addNote(
    targetId,
    `Склеено с карточкой «${s.name}»: людей перенесено ${moved}` + (dropped ? `, дублей убрано ${dropped}` : ''),
    author, 'system',
  )
  // Пары, где источник был второй стороной, уезжают вместе с ним
  // (on delete cascade) — отдельной чистки не нужно.
  const { error: delErr } = await sb.from('dev_partners').delete().eq('id', sourceId)
  if (delErr) throw new Error(delErr.message)
}

// Ручная склейка из карточки: владелец сам выбрал, с кем свести.
export async function listPartnerNames(): Promise<Array<{ id: string; name: string; key: string }>> {
  const { data, error } = await sb.from('dev_partners').select('id,name').eq('archived', false)
  if (error) throw new Error(error.message)
  return (data ?? []).map(p => ({ id: p.id, name: p.name, key: nameKey(p.name) }))
}

export { chatMeetings, chatTail }
