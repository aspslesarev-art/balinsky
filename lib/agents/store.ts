// Чтение и запись CRM по агентам. Только сервер: ходит service-ключом.
//
// Главная идея: карточка агента ничего не копирует из переписки. Чат,
// сообщения и встречи живут в tg_messages / tg_meetings (их пишет
// бот-наблюдатель), а карточка хранит только tg_chat_id и подтягивает
// остальное на лету. Поэтому «последний контакт» не устаревает, и не
// бывает расхождения между разделом «Переписка Андрея» и карточкой.

import { createClient } from '@supabase/supabase-js'
import {
  type Agent, type AgentCard, type AgentNote, type AgentStatus, type UnlinkedChat,
  normalizeTelegram, splitContact, STATUS_LABEL,
} from './types'

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
  // Переписка — приятное дополнение, а не условие работы раздела: если
  // бот-наблюдатель отвалился, доска обязана открыться без него.
  if (error) { console.error('[agents] tg_chat_list:', error.message); return new Map() }
  return new Map((data as ChatRow[] ?? []).map(c => [c.chat_id, c]))
}

// Ближайшая будущая встреча по каждому чату — подпись на карточке доски
// («Встреча 11 сентября, 12-00. Чангу» в Notion писалась руками).
async function nextMeetings(): Promise<Map<number, { starts_at: string; place: string | null }>> {
  const { data, error } = await sb
    .from('tg_meetings')
    .select('chat_id,starts_at,place,status')
    .in('status', ['agreed', 'scheduled'])
    .gte('starts_at', new Date(Date.now() - 6 * 3600_000).toISOString())
    .order('starts_at', { ascending: true })
  if (error) { console.error('[agents] tg_meetings:', error.message); return new Map() }
  const out = new Map<number, { starts_at: string; place: string | null }>()
  for (const m of data ?? []) {
    if (m.starts_at && !out.has(m.chat_id)) out.set(m.chat_id, { starts_at: m.starts_at, place: m.place })
  }
  return out
}

function toCard(a: Agent, chats: Map<number, ChatRow>, meetings: Map<number, { starts_at: string; place: string | null }>): AgentCard {
  const chat = a.tg_chat_id != null ? chats.get(a.tg_chat_id) : undefined
  const meeting = a.tg_chat_id != null ? meetings.get(a.tg_chat_id) : undefined
  return {
    ...a,
    data: a.data ?? {},
    chat_last_ts: chat?.last_ts ?? null,
    chat_last_text: chat?.last_text ?? null,
    chat_message_count: chat?.message_count ?? 0,
    chat_meeting_count: chat?.meeting_count ?? 0,
    next_meeting_at: meeting?.starts_at ?? null,
    next_meeting_place: meeting?.place ?? null,
  }
}

export async function listAgents(includeArchived = false): Promise<AgentCard[]> {
  let q = sb.from('agents').select('*').order('sort', { ascending: true }).order('name', { ascending: true })
  if (!includeArchived) q = q.eq('archived', false)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  const [chats, meetings] = await Promise.all([chatIndex(), nextMeetings()])
  return (data as Agent[] ?? []).map(a => toCard(a, chats, meetings))
}

export async function getAgent(id: string): Promise<AgentCard | null> {
  const { data, error } = await sb.from('agents').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const [chats, meetings] = await Promise.all([chatIndex(), nextMeetings()])
  return toCard(data as Agent, chats, meetings)
}

export async function listNotes(agentId: string): Promise<AgentNote[]> {
  const { data, error } = await sb
    .from('agent_notes')
    .select('id,body,kind,author,created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as AgentNote[]
}

export async function addNote(agentId: string, body: string, author: string | null, kind: 'note' | 'system' = 'note'): Promise<AgentNote> {
  const { data, error } = await sb
    .from('agent_notes')
    .insert({ agent_id: agentId, body, author, kind })
    .select('id,body,kind,author,created_at')
    .single()
  if (error) throw new Error(error.message)
  return data as AgentNote
}

// Поля, которые админка имеет право писать. Whitelist, а не «всё, что
// пришло»: PATCH приходит из браузера, и без него можно было бы
// переписать id, source или чужой tg_chat_id.
const WRITABLE = new Set([
  'name', 'agency', 'status', 'manager', 'position', 'location',
  'telegram', 'whatsapp', 'phone', 'email',
  'deals_count', 'deals_volume_usd',
  'last_contact', 'next_contact', 'next_step', 'notes',
  'data', 'sort', 'archived',
])

export async function updateAgent(id: string, patch: Record<string, unknown>, author?: string | null): Promise<Agent> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) if (WRITABLE.has(k)) clean[k] = v === '' ? null : v
  if (typeof clean.telegram === 'string') clean.telegram = normalizeTelegram(clean.telegram)
  if (!Object.keys(clean).length) throw new Error('nothing_to_update')
  clean.updated_at = new Date().toISOString()

  // Смена статуса — событие воронки, и через месяц важно помнить, когда
  // агент проехал по ней. Пишем в ленту до апдейта, чтобы знать прежнее значение.
  if (typeof clean.status === 'string') {
    const { data: before } = await sb.from('agents').select('status').eq('id', id).maybeSingle()
    const from = before?.status as AgentStatus | undefined
    if (from && from !== clean.status) {
      await addNote(id, `Статус: ${STATUS_LABEL[from]} → ${STATUS_LABEL[clean.status as AgentStatus]}`, author ?? null, 'system')
    }
  }

  const { data, error } = await sb.from('agents').update(clean).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)
  const saved = data as Agent

  // Вписали ник — сами находим по нему переписку. Иначе владельцу
  // пришлось бы после каждой правки ника лезть в список чатов и искать
  // руками то, что однозначно определяется ником.
  if (typeof clean.telegram === 'string' && clean.telegram && saved.tg_chat_id == null) {
    const chatId = await findChatByNick(clean.telegram)
    if (chatId != null) {
      const { data: taken } = await sb.from('agents').select('id').eq('tg_chat_id', chatId).maybeSingle()
      // Чат занят другой карточкой (обычно это дубль того же человека) —
      // молча перевешивать его нельзя, пусть владелец решает сам.
      if (!taken) return await linkChat(id, chatId, author)
    }
  }
  return saved
}

// Чат бота по нику собеседника. Ник в `tg_messages.contact` записан как
// «Имя (@nick)», поэтому сравниваем нормализованные значения.
async function findChatByNick(nick: string): Promise<number | null> {
  const chats = await chatIndex()
  for (const c of chats.values()) {
    const { username } = splitContact(c.contact)
    if (username && normalizeTelegram(username) === nick) return c.chat_id
  }
  return null
}

export async function createAgent(input: {
  name: string
  agency?: string | null
  status?: AgentStatus
  telegram?: string | null
  tg_chat_id?: number | null
  source?: string
  data?: Record<string, string>
}): Promise<Agent> {
  const { data, error } = await sb
    .from('agents')
    .insert({
      name: input.name.trim(),
      agency: input.agency ?? null,
      status: input.status ?? 'new',
      telegram: normalizeTelegram(input.telegram),
      tg_chat_id: input.tg_chat_id ?? null,
      source: input.source ?? 'manual',
      data: input.data ?? {},
      // Новая карточка встаёт первой в своей колонке.
      sort: -Date.now(),
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Agent
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await sb.from('agents').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// Привязать/отвязать чат бота. Чат занят другой карточкой → говорим об
// этом вместо молчаливой ошибки уникальности из Postgres.
export async function linkChat(agentId: string, chatId: number | null, author?: string | null): Promise<Agent> {
  if (chatId != null) {
    const { data: taken } = await sb.from('agents').select('id,name').eq('tg_chat_id', chatId).maybeSingle()
    if (taken && taken.id !== agentId) throw new Error(`chat_taken:${taken.name}`)
  }
  const { data, error } = await sb
    .from('agents')
    .update({ tg_chat_id: chatId, updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  await addNote(agentId, chatId == null ? 'Переписка отвязана' : 'Переписка привязана', author ?? null, 'system')
  return data as Agent
}

// Чаты бота, для которых карточки ещё нет. Это и есть «входящие»: бот
// видит 154 диалога, в базе агентов их заметно меньше.
export async function listUnlinkedChats(): Promise<UnlinkedChat[]> {
  const [chats, { data: agents, error }] = await Promise.all([
    chatIndex(),
    sb.from('agents').select('tg_chat_id,telegram'),
  ])
  if (error) throw new Error(error.message)
  const takenChat = new Set((agents ?? []).map(a => a.tg_chat_id).filter((v): v is number => v != null))
  const takenNick = new Set((agents ?? []).map(a => a.telegram).filter((v): v is string => !!v))
  const out: UnlinkedChat[] = []
  for (const c of chats.values()) {
    if (takenChat.has(c.chat_id)) continue
    const { name, username } = splitContact(c.contact)
    // Ник уже есть в базе, но чат не привязан — это не «новый контакт», а
    // та же карточка: её подсветит поиск в самой карточке, а не входящие.
    if (username && takenNick.has(username.toLowerCase())) continue
    out.push({
      chat_id: c.chat_id, contact: c.contact, name: name || `Чат ${c.chat_id}`, username,
      last_ts: c.last_ts, last_text: c.last_text,
      message_count: c.message_count, meeting_count: c.meeting_count,
    })
  }
  return out.sort((a, b) => b.last_ts.localeCompare(a.last_ts))
}

// Все чаты бота для выпадашки «привязать переписку» в карточке: с
// пометкой, кем чат уже занят.
export async function listAllChats(): Promise<Array<UnlinkedChat & { taken_by: string | null }>> {
  const [chats, { data: agents }] = await Promise.all([
    chatIndex(),
    sb.from('agents').select('id,name,tg_chat_id'),
  ])
  const owner = new Map((agents ?? []).filter(a => a.tg_chat_id != null).map(a => [a.tg_chat_id as number, a.name as string]))
  return [...chats.values()]
    .map(c => {
      const { name, username } = splitContact(c.contact)
      return {
        chat_id: c.chat_id, contact: c.contact, name: name || `Чат ${c.chat_id}`, username,
        last_ts: c.last_ts, last_text: c.last_text,
        message_count: c.message_count, meeting_count: c.meeting_count,
        taken_by: owner.get(c.chat_id) ?? null,
      }
    })
    .sort((a, b) => b.last_ts.localeCompare(a.last_ts))
}

export type ChatMessage = {
  id: number
  direction: 'in' | 'out'
  text: string | null
  is_voice: boolean
  media_type: string | null
  ts: string
}

export type ChatMeeting = {
  id: number
  status: 'agreed' | 'scheduled' | 'cancelled'
  topic: string | null
  starts_at: string | null
  when_text: string | null
  place: string | null
}

// Хвост переписки для карточки. Полная история и ответ — в
// /admin/perepiska, сюда тянем последние сообщения для контекста.
export async function chatTail(chatId: number, limit = 30): Promise<ChatMessage[]> {
  const { data, error } = await sb
    .from('tg_messages')
    .select('id,direction,text,voice_transcript,is_voice,media_type,ts')
    .eq('chat_id', chatId)
    .order('ts', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).reverse().map(m => ({
    id: m.id,
    direction: m.direction,
    // Голосовое без расшифровки — пустой пузырь; подставляем текст расшифровки.
    text: m.text || m.voice_transcript || null,
    is_voice: m.is_voice,
    media_type: m.media_type,
    ts: m.ts,
  })) as ChatMessage[]
}

export async function chatMeetings(chatId: number): Promise<ChatMeeting[]> {
  const { data, error } = await sb
    .from('tg_meetings')
    .select('id,status,topic,starts_at,when_text,place')
    .eq('chat_id', chatId)
    .order('starts_at', { ascending: false, nullsFirst: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as ChatMeeting[]
}
