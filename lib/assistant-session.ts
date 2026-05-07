// Persist Балина (AI broker) conversations into the existing
// bot_chats / bot_messages tables so the admin inbox can surface them
// alongside Telegram chats with a single dedicated tab.
//
// Identity: every visitor gets a UUID set as a 1-year cookie on
// first /api/chat call. We hash the UUID into a 56-bit positive
// bigint to use as `chat_id`. The Telegram-controlled chat_id
// space is comfortably disjoint from this band (real bot user IDs
// are 9-10 digits, supergroups 13-digit negatives), so the merged
// table stays free of collisions.

import { cookies } from 'next/headers'
import { upsertChat, logMessage } from './bot-storage'

export const ASSISTANT_COOKIE = 'bal_assistant_sid'
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365  // 1 year

// 56-bit positive bigint from the first 14 hex chars of a UUID.
// Postgres bigint is signed 64-bit; staying inside 56 bits keeps the
// number well below 2^63 and reads cleanly as a positive integer.
export function uuidToChatId(uuid: string): number {
  const hex = uuid.replace(/-/g, '').slice(0, 14)
  return Number.parseInt(hex, 16)
}

function newUuid(): string {
  // Web Crypto is on Node 18+, no extra dep needed.
  return globalThis.crypto.randomUUID()
}

// Reads or creates the visitor's assistant session. Returns the
// stable chat_id used in bot_chats and a `setCookie` function the
// route handler must call against its response so a returning
// visitor lands on the same row.
export async function ensureAssistantSession(): Promise<{
  chatId: number
  isNew: boolean
  setCookieHeader: string | null
}> {
  const store = await cookies()
  const existing = store.get(ASSISTANT_COOKIE)?.value
  if (existing && /^[0-9a-f-]{32,36}$/i.test(existing)) {
    return { chatId: uuidToChatId(existing), isNew: false, setCookieHeader: null }
  }
  const uuid = newUuid()
  const setCookieHeader = `${ASSISTANT_COOKIE}=${uuid}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`
  return { chatId: uuidToChatId(uuid), isNew: true, setCookieHeader }
}

// Log a turn (visitor message + assistant reply) into bot_messages,
// upserting the bot_chats row so the inbox sees a fresh entry.
export async function logAssistantTurn(args: {
  chatId: number
  isNew: boolean
  userText: string
  assistantText: string
  lang: 'ru' | 'en'
}): Promise<void> {
  const { chatId, isNew, userText, assistantText, lang } = args

  if (isNew) {
    await upsertChat({
      chat_id: chatId,
      username: null,
      first_name: lang === 'en' ? 'Visitor' : 'Гость',
      last_name: null,
      language_code: lang,
      chat_type: 'assistant',
      title: lang === 'en' ? 'AI broker chat' : 'Чат с AI-брокером',
    }, userText)
  } else {
    // Existing session — touch the row so the inbox sorts by recency.
    // upsertChat handles this; re-asserting first_name is harmless.
    await upsertChat({
      chat_id: chatId,
      username: null,
      first_name: lang === 'en' ? 'Visitor' : 'Гость',
      last_name: null,
      language_code: lang,
      chat_type: 'assistant',
      title: lang === 'en' ? 'AI broker chat' : 'Чат с AI-брокером',
    }, userText)
  }

  await logMessage({
    chat_id: chatId,
    direction: 'in',
    source: 'user',
    text: userText.slice(0, 4000),
  })
  await logMessage({
    chat_id: chatId,
    direction: 'out',
    source: 'bot',
    text: assistantText.slice(0, 4000),
  })
}
