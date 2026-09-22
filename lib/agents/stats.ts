// Касания по агентам за период — данные для вкладки «Дашборд».
//
// Касание = одно сообщение в переписке бота, в любую сторону. Считаем по
// сырым сообщениям (tg_messages), а не по отметкам в карточке: карточка
// хранит только tg_chat_id, вся история живёт у бота-наблюдателя, и так
// дашборд не расходится с разделом «Переписка Андрея».
//
// Отдельной SQL-функции для подсчёта нет намеренно: раздел закрытый,
// открывают его несколько раз в день, а за сутки у бота сотни сообщений —
// три колонки на такую выборку дешевле, чем миграция под каждый разрез.

import { createClient } from '@supabase/supabase-js'
import { splitContact, type TouchRow, type TouchStats } from './types'
import { listAgents } from './store'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Бали — UTC+8 круглый год, переходов на летнее время нет. Считать «сегодня»
// по UTC нельзя: до 8 утра по Бали это ещё вчерашние сутки, и утренняя
// переписка уезжала бы в предыдущий день.
const WITA_OFFSET_MS = 8 * 3600_000
const DAY_MS = 86400_000

// Начало суток по Бали, days=1 → сегодняшние, days=7 → шесть дней назад.
export function periodStart(days: number): string {
  const startOfTodayWita = Math.floor((Date.now() + WITA_OFFSET_MS) / DAY_MS) * DAY_MS
  return new Date(startOfTodayWita - (days - 1) * DAY_MS - WITA_OFFSET_MS).toISOString()
}

type MsgRow = { chat_id: number; direction: 'in' | 'out'; contact: string | null; ts: string }

// PostgREST отдаёт максимум 1000 строк за запрос, поэтому листаем
// страницами. Потолок — чтобы случайный запрос на год не вычитал базу.
const PAGE = 1000
const MAX_ROWS = 20_000

async function messagesSince(since: string): Promise<MsgRow[]> {
  const out: MsgRow[] = []
  for (let from = 0; out.length < MAX_ROWS; from += PAGE) {
    const { data, error } = await sb
      .from('tg_messages')
      .select('chat_id,direction,contact,ts')
      .gte('ts', since)
      .order('ts', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as MsgRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export async function touchStats(days: number): Promise<TouchStats> {
  const since = periodStart(days)
  const [messages, agents] = await Promise.all([messagesSince(since), listAgents()])

  type Acc = { incoming: number; outgoing: number; last_ts: string; contact: string | null }
  const byChat = new Map<number, Acc>()
  for (const m of messages) {
    const acc = byChat.get(m.chat_id) ?? { incoming: 0, outgoing: 0, last_ts: m.ts, contact: m.contact }
    if (m.direction === 'out') acc.outgoing++
    else acc.incoming++
    // Сообщения отсортированы по времени, так что последнее и есть последнее.
    acc.last_ts = m.ts
    acc.contact = m.contact ?? acc.contact
    byChat.set(m.chat_id, acc)
  }

  const rows: TouchRow[] = []
  const matched = new Set<number>()
  for (const a of agents) {
    if (a.tg_chat_id == null) continue
    const acc = byChat.get(a.tg_chat_id)
    if (!acc) continue
    matched.add(a.tg_chat_id)
    rows.push({
      agent_id: a.id,
      name: a.name,
      agency: a.agency,
      status: a.status,
      incoming: acc.incoming,
      outgoing: acc.outgoing,
      total: acc.incoming + acc.outgoing,
      last_ts: acc.last_ts,
    })
  }
  rows.sort((x, y) => y.total - x.total || y.last_ts.localeCompare(x.last_ts))

  // Переписки без карточки — их видно во «Входящих», но в сводке важно
  // знать, что часть дня ушла в разговоры, которых в воронке нет.
  const unlinked: TouchStats['unlinked'] = { chats: 0, touches: 0, names: [] }
  for (const [chatId, acc] of byChat) {
    if (matched.has(chatId)) continue
    unlinked.chats++
    unlinked.touches += acc.incoming + acc.outgoing
    const { name, username } = splitContact(acc.contact)
    if (unlinked.names.length < 5) unlinked.names.push(name || (username ? `@${username}` : `Чат ${chatId}`))
  }

  return {
    days,
    since,
    rows,
    totals: {
      touches: rows.reduce((s, r) => s + r.total, 0),
      agents: rows.length,
      incoming: rows.reduce((s, r) => s + r.incoming, 0),
      outgoing: rows.reduce((s, r) => s + r.outgoing, 0),
    },
    unlinked,
    truncated: messages.length >= MAX_ROWS,
  }
}
