import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export type ChatMeta = {
  chat_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  language_code: string | null
}

export async function upsertChat(meta: ChatMeta, lastMessageText: string | null): Promise<void> {
  const now = new Date().toISOString()
  await sb.from('bot_chats').upsert({
    chat_id: meta.chat_id,
    username: meta.username,
    first_name: meta.first_name,
    last_name: meta.last_name,
    language_code: meta.language_code,
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
}

export async function logMessage(m: LogMessageInput): Promise<void> {
  await sb.from('bot_messages').insert({
    chat_id: m.chat_id,
    direction: m.direction,
    source: m.source,
    text: m.text,
    start_payload: m.start_payload ?? null,
    tg_message_id: m.tg_message_id ?? null,
  })
  if (m.direction === 'out') {
    // Outbound update lifts last_message and resets unread (manager has acked).
    await sb.from('bot_chats').update({
      last_message_at: new Date().toISOString(),
      last_message_text: m.text?.slice(0, 200) ?? null,
      unread_count: 0,
    }).eq('chat_id', m.chat_id)
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
