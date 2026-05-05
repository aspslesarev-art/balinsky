import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type ChatType = 'private' | 'group' | 'supergroup' | 'channel'

export type ChatMeta = {
  chat_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  language_code: string | null
  // Group/supergroup/channel only — private chats stay null.
  chat_type?: ChatType
  title?: string | null
}

export async function upsertChat(meta: ChatMeta, lastMessageText: string | null): Promise<void> {
  const now = new Date().toISOString()
  await sb.from('bot_chats').upsert({
    chat_id: meta.chat_id,
    username: meta.username,
    first_name: meta.first_name,
    last_name: meta.last_name,
    language_code: meta.language_code,
    chat_type: meta.chat_type ?? 'private',
    title: meta.title ?? null,
    last_message_at: now,
    last_message_text: lastMessageText?.slice(0, 200) ?? null,
    last_inbound_at: now,
  }).select()
  // Bump unread counter (separate call so we don't smash the value when
  // upsert runs for the first time).
  await sb.rpc('increment_bot_chat_unread', { p_chat_id: meta.chat_id }).then(
    () => undefined,
    () => undefined, // RPC is optional; if it doesn't exist we skip silently.
  )
}

export type LogMessageInput = {
  chat_id: number
  direction: 'in' | 'out'
  source: 'user' | 'bot' | 'manager'
  text: string | null
  start_payload?: string | null
  tg_message_id?: number | null
  media_type?: string | null
  media_url?: string | null
  media_filename?: string | null
  media_mime?: string | null
  media_duration?: number | null
  media_size?: number | null
  // Group chats: who actually said it. Null for private DMs and for
  // outbound bot/manager messages.
  sender_id?: number | null
  sender_name?: string | null
}

// Plain-text preview used in the chat list for messages whose body is
// just a media attachment ("🎙️ Голосовое 0:12", "📎 contract.pdf").
function previewFor(m: LogMessageInput): string | null {
  if (m.text && m.text.trim()) return m.text
  switch (m.media_type) {
    case 'voice': return m.media_duration != null
      ? `🎙️ Голосовое ${Math.floor(m.media_duration / 60)}:${String(m.media_duration % 60).padStart(2, '0')}`
      : '🎙️ Голосовое сообщение'
    case 'audio':       return '🎵 Аудио'
    case 'photo':       return '🖼️ Фото'
    case 'video':       return '🎬 Видео'
    case 'video_note':  return '🎬 Кружок'
    case 'sticker':     return '🤩 Стикер'
    case 'document':    return `📎 ${m.media_filename ?? 'файл'}`
    default:            return null
  }
}

export async function logMessage(m: LogMessageInput): Promise<void> {
  await sb.from('bot_messages').insert({
    chat_id: m.chat_id,
    direction: m.direction,
    source: m.source,
    text: m.text,
    start_payload: m.start_payload ?? null,
    tg_message_id: m.tg_message_id ?? null,
    media_type: m.media_type ?? null,
    media_url: m.media_url ?? null,
    media_filename: m.media_filename ?? null,
    media_mime: m.media_mime ?? null,
    media_duration: m.media_duration ?? null,
    media_size: m.media_size ?? null,
    sender_id: m.sender_id ?? null,
    sender_name: m.sender_name ?? null,
  })
  if (m.direction === 'out') {
    const now = new Date().toISOString()
    const patch: Record<string, unknown> = {
      last_message_at: now,
      last_message_text: previewFor(m)?.slice(0, 200) ?? null,
      unread_count: 0,
    }
    // Manager-typed message resets the handover clock so the bot stays
    // silent for the next 10 minutes.
    if (m.source === 'manager') patch.last_manager_at = now
    await sb.from('bot_chats').update(patch).eq('chat_id', m.chat_id)
  }
}

export type ChatRow = {
  chat_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  last_message_at: string
  last_message_text: string | null
  last_inbound_at: string | null
  unread_count: number
  last_manager_at: string | null
  bot_disabled: boolean
  tags: string[]
  avatar_url: string | null
  chat_type: ChatType
  title: string | null
}

// Merge new tags into the chat's tag set (no-op if all already present).
// Read-modify-write is fine here — bot updates for one chat are serialised
// behind Telegram's per-chat update ordering, no concurrent writers.
export async function addChatTags(chatId: number, tags: string[]): Promise<void> {
  if (!tags.length) return
  const { data } = await sb.from('bot_chats').select('tags').eq('chat_id', chatId).maybeSingle()
  const existing = (data?.tags as string[] | null) ?? []
  const merged = Array.from(new Set([...existing, ...tags]))
  if (merged.length === existing.length) return
  await sb.from('bot_chats').update({ tags: merged }).eq('chat_id', chatId)
}

export async function listChatsByTag(tag: string): Promise<ChatRow[]> {
  const { data, error } = await sb
    .from('bot_chats')
    .select('*')
    .contains('tags', [tag])
    .order('last_message_at', { ascending: false })
  if (error) { console.error('[bot-storage] listChatsByTag:', error.message); return [] }
  return (data ?? []) as ChatRow[]
}

export async function listAllTags(): Promise<{ tag: string; count: number }[]> {
  const { data, error } = await sb.from('bot_chats').select('tags')
  if (error) { console.error('[bot-storage] listAllTags:', error.message); return [] }
  const counts = new Map<string, number>()
  for (const row of (data ?? []) as { tags: string[] | null }[]) {
    for (const t of row.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

// Soft-handover window: while the manager has replied within the last
// HANDOVER_MS, the bot's auto-reply stays silent so two voices don't talk
// over each other in the same chat.
export const HANDOVER_MS = 10 * 60 * 1000

export function shouldBotAutoReply(chat: ChatRow | null): boolean {
  if (!chat) return true
  if (chat.bot_disabled) return false
  if (!chat.last_manager_at) return true
  const elapsed = Date.now() - new Date(chat.last_manager_at).getTime()
  return elapsed >= HANDOVER_MS
}

export async function setBotDisabled(chatId: number, disabled: boolean): Promise<void> {
  await sb.from('bot_chats').update({ bot_disabled: disabled }).eq('chat_id', chatId)
}

export async function listChats(limit = 200): Promise<ChatRow[]> {
  const { data, error } = await sb
    .from('bot_chats')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('[bot-storage] listChats:', error.message); return [] }
  return (data ?? []) as ChatRow[]
}

export type MessageRow = {
  id: number
  chat_id: number
  direction: 'in' | 'out'
  source: 'user' | 'bot' | 'manager'
  text: string | null
  start_payload: string | null
  created_at: string
  media_type: string | null
  media_url: string | null
  media_filename: string | null
  media_mime: string | null
  media_duration: number | null
  media_size: number | null
  sender_id: number | null
  sender_name: string | null
}

export async function listMessages(chatId: number, limit = 500): Promise<MessageRow[]> {
  const { data, error } = await sb
    .from('bot_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) { console.error('[bot-storage] listMessages:', error.message); return [] }
  return (data ?? []) as MessageRow[]
}

export async function getChat(chatId: number): Promise<ChatRow | null> {
  const { data, error } = await sb.from('bot_chats').select('*').eq('chat_id', chatId).maybeSingle()
  if (error || !data) return null
  return data as ChatRow
}

export async function markChatRead(chatId: number): Promise<void> {
  await sb.from('bot_chats').update({ unread_count: 0 }).eq('chat_id', chatId)
}
