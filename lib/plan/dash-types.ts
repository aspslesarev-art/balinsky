// Типы дашборда /plan, общие для сервера и экрана. Без зависимостей от
// базы: этот файл импортирует клиентский компонент.

import type { ChatRole } from './kinds'

/** Один собеседник в блоке «Переписка». */
export type CommChat = {
  chat_id: number
  name: string
  username: string | null
  role: ChatRole | null
  /** Карточка в CRM, если есть. */
  crm: { kind: 'agent' | 'developer'; id: string; title: string; status: string } | null
  last_ts: string
  last_dir: 'in' | 'out'
  last_text: string
  /** Последнее его сообщение: бот может написать ему только в течение суток после него. */
  last_in_ts: string | null
  /** Сообщений за 7 дней: от него и от нас. */
  in7: number
  out7: number
  /** С какого момента его сообщение висит без нашего ответа. */
  waiting_since: string | null
  /** Цель владельца с этим человеком — под неё секретарь строит разговор. */
  goal: string | null
}

/** Быстрые цели одной кнопкой; свою можно вписать текстом. */
export const GOAL_PRESETS = ['Созвон', 'Встреча', 'Подписать фикс', 'Привести клиента', 'На встречу 2 октября'] as const

/** Задача от ИИ-секретаря. */
export type AiTask = {
  id: number
  day: string
  title: string
  detail: string | null
  chat_id: number | null
  contact: string | null
  priority: 1 | 2 | 3
  auto_close: boolean
  status: 'open' | 'done' | 'dropped'
  done_by: 'owner' | 'chat' | null
  done_at: string | null
  created_at: string
  /** Готовый текст сообщения человеку — поправить и отправить. */
  draft: string | null
  /** К чему ведёт сообщение: созвон, встреча или просто ответ. */
  goal: 'call' | 'meeting' | 'reply' | null
}

/** Черновик по запросу для любого чата. */
export type Draft = { text: string; goal: 'call' | 'meeting' | 'reply'; why: string }

/** Оценка дня: из чего сложилась. Часть без данных (null) в счёт не идёт. */
export type DayScore = {
  day: string
  score: number
  plan: { done: number; total: number } | null
  ai: { done: number; total: number } | null
  result: { points: number; target: number; steps: number }
  replies: { answered: number; total: number } | null
}

/** Утренний план и вечерний итог секретаря. */
export type DayNote = {
  day: string
  brief: string | null
  brief_at: string | null
  review: string | null
  score: number | null
}

/** Встреча впереди — из бота-наблюдателя. */
export type Upcoming = {
  id: number
  starts_at: string
  contact: string | null
  topic: string | null
  place: string | null
}
