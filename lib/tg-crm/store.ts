// Чтение личной CRM по Telegram-чатам. Только сервер: ходит service-ключом,
// а и таблица, и бакет закрыты для всех, кроме service_role.
//
// Выжимка по каждому чату — в tg_crm_contacts, сама переписка — gzip-архивом
// в приватном бакете tg-crm. Архив бывает на десятки тысяч сообщений, поэтому
// наружу он уходит страницами, а распакованный держим недолго в памяти:
// «Показать раньше» не должен каждый раз заново качать и распаковывать файл.

import { gunzipSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'
import type { CrmContact, CrmMessage } from './types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const BUCKET = 'tg-crm'
const PAGE = 1000 // PostgREST больше тысячи строк за раз не отдаёт

const COLUMNS = [
  'chat_id', 'name', 'username', 'kind', 'members', 'msg_count', 'my_msg_count',
  'first_at', 'last_at', 'last_from_me', 'analyzed', 'who', 'category',
  'relationship', 'relationship_why', 'summary', 'status', 'awaiting_reply',
  'awaiting_what', 'my_promises', 'their_promises', 'money', 'next_action',
].join(',')

// Весь список одним проходом: ~3600 строк, фильтры работают в браузере.
export async function listCrmContacts(): Promise<CrmContact[]> {
  const out: CrmContact[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('tg_crm_contacts')
      .select(COLUMNS)
      .order('last_at', { ascending: false, nullsFirst: false })
      .order('chat_id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`tg_crm_contacts: ${error.message}`)
    const rows = (data ?? []) as unknown as CrmContact[]
    for (const r of rows) {
      // jsonb может прийти null у старых строк — дальше код рассчитывает на массивы
      r.my_promises = Array.isArray(r.my_promises) ? r.my_promises : []
      r.their_promises = Array.isArray(r.their_promises) ? r.their_promises : []
      r.money = Array.isArray(r.money) ? r.money : []
      r.chat_id = Number(r.chat_id)
      out.push(r)
    }
    if (rows.length < PAGE) break
  }
  return out
}

const CACHE_TTL_MS = 5 * 60_000
const CACHE_MAX = 4
const cache = new Map<number, { at: number; messages: CrmMessage[] }>()

// null — архива для этого чата нет (ещё не выгружен или чат пустой).
export async function loadTranscript(chatId: number): Promise<CrmMessage[] | null> {
  const hit = cache.get(chatId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.messages

  const { data, error } = await sb.storage.from(BUCKET).download(`${chatId}.json.gz`)
  if (error || !data) {
    // У supabase-js «нет файла» приходит ошибкой со статусом 400/404 — это не сбой
    const status = (error as { status?: number; statusCode?: string } | null)
    const msg = error?.message ?? ''
    if (status?.status === 404 || status?.status === 400 || status?.statusCode === '404' || /not.?found/i.test(msg)) return null
    throw new Error(`tg-crm download ${chatId}: ${msg || 'empty'}`)
  }
  const raw = gunzipSync(Buffer.from(await data.arrayBuffer())).toString('utf8')
  const parsed: unknown = JSON.parse(raw)
  const messages = Array.isArray(parsed) ? (parsed as CrmMessage[]) : []

  cache.delete(chatId)
  cache.set(chatId, { at: Date.now(), messages })
  // Самый старый вылетает первым: Map помнит порядок вставки
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as number)
  return messages
}
