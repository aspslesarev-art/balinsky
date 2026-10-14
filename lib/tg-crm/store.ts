// Чтение личной CRM по Telegram-чатам. Только сервер и только с Мака владельца:
// переписка — личная, в облако (Supabase, Vercel) она не попадает никогда.
//
// Данные лежат в папке TG_CRM_DIR (её собирает ~/tg-crm/export_local.py):
//   contacts.json          — выжимка по каждому чату
//   chats/<chat_id>.json.gz — переписка целиком
// На проде TG_CRM_DIR не задан — раздел там просто не существует (404).
// Архив бывает на десятки тысяч сообщений, поэтому наружу он уходит
// страницами, а распакованный держим недолго в памяти: «Показать раньше»
// не должен каждый раз заново читать и распаковывать файл.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import type { CrmContact, CrmMessage } from './types'

function dataDir(): string | null {
  return process.env.TG_CRM_DIR?.trim() || null
}

export function crmEnabled(): boolean {
  return dataDir() != null
}

// Весь список одним проходом: ~3400 строк, фильтры работают в браузере.
export async function listCrmContacts(): Promise<CrmContact[]> {
  const dir = dataDir()
  if (!dir) return []
  const rows = JSON.parse(await readFile(path.join(dir, 'contacts.json'), 'utf8')) as CrmContact[]
  for (const r of rows) {
    r.my_promises = Array.isArray(r.my_promises) ? r.my_promises : []
    r.their_promises = Array.isArray(r.their_promises) ? r.their_promises : []
    r.money = Array.isArray(r.money) ? r.money : []
    r.chat_id = Number(r.chat_id)
  }
  return rows.sort((a, b) => (b.last_at ?? '').localeCompare(a.last_at ?? '') || a.chat_id - b.chat_id)
}

const CACHE_TTL_MS = 5 * 60_000
const CACHE_MAX = 4
const cache = new Map<number, { at: number; messages: CrmMessage[] }>()

// null — архива для этого чата нет (чат пустой или ещё не выгружен).
export async function loadTranscript(chatId: number): Promise<CrmMessage[] | null> {
  const dir = dataDir()
  if (!dir) return null
  const hit = cache.get(chatId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.messages

  let buf: Buffer
  try {
    buf = await readFile(path.join(dir, 'chats', `${chatId}.json.gz`))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  const parsed: unknown = JSON.parse(gunzipSync(buf).toString('utf8'))
  const messages = Array.isArray(parsed) ? (parsed as CrmMessage[]) : []

  cache.delete(chatId)
  cache.set(chatId, { at: Date.now(), messages })
  // Самый старый вылетает первым: Map помнит порядок вставки
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as number)
  return messages
}
