// Общие типы личной CRM по Telegram-чатам. Лежат отдельно от store.ts:
// их импортирует клиентский компонент, а store тянет service-key клиент
// Supabase, которому в браузере делать нечего.

export type CrmPromise = { text: string; date: string | null; done: boolean | null }
export type MoneyItem = { who_owes: 'я' | 'мне'; what: string; amount: string | number | null; date: string | null; settled: boolean }

export type CrmContact = {
  chat_id: number
  name: string
  username: string | null
  kind: 'user' | 'group'
  members: number | null
  msg_count: number
  my_msg_count: number
  first_at: string | null
  last_at: string | null
  last_from_me: boolean | null
  analyzed: boolean
  who: string | null
  category: string | null
  relationship: number | null
  relationship_why: string | null
  summary: string | null
  status: string | null
  awaiting_reply: boolean
  awaiting_what: string | null
  my_promises: CrmPromise[]
  their_promises: CrmPromise[]
  money: MoneyItem[]
  next_action: string | null
}

// Одно сообщение из архива переписки (<chat_id>.json.gz в бакете tg-crm).
// Короткие ключи — чтобы архив на 30 тыс. сообщений весил меньше.
export type CrmMessage = {
  d: string          // дата ISO
  o: 0 | 1           // 1 — написал Андрей
  s: string | null   // имя отправителя
  t: string | null   // текст
  m: string | null   // тип вложения: voice, photo, video, video_note, document, sticker, poll…
  f: string | null   // имя файла
}

export type TranscriptPage = {
  ok: true
  total: number
  start: number      // индекс первого сообщения страницы в полной переписке
  messages: CrmMessage[]
}

export const CATEGORIES = [
  'клиент', 'застройщик', 'агент', 'партнёр', 'сервис', 'команда',
  'друг', 'семья', 'знакомый', 'холодный', 'другое',
] as const

// Обещание считается открытым, пока его явно не отметили выполненным:
// «неясно» (null) — тоже повод проверить.
export function openPromises(list: CrmPromise[] | null | undefined): CrmPromise[] {
  return (list ?? []).filter(p => p.done !== true)
}

export function openMoney(list: MoneyItem[] | null | undefined): MoneyItem[] {
  return (list ?? []).filter(m => !m.settled)
}

// Ссылка «Открыть в Telegram». Личный чат без ника открывается по id
// (работает в приложении Telegram); группу без ника открыть нечем.
export function telegramLink(c: Pick<CrmContact, 'kind' | 'username' | 'chat_id'>): string | null {
  if (c.username) return `https://t.me/${c.username}`
  if (c.kind === 'user') return `tg://user?id=${c.chat_id}`
  return null
}
