// Отчётность по работе с агентами — данные для вкладки «Дашборд».
//
// Переписки на сайте нет и не должно быть: текст сообщений остаётся на Маке
// Андрея. Мак каждые 15 минут присылает только счётчики — сколько сообщений
// за сутки по Бали написал Андрей и сколько собеседник (crm_touch_daily), и
// кому ушла рассылка и кто на неё ответил (crm_outreach). Встречи берём из
// Google Календаря, брони и сделки — из reservations.

import { createClient } from '@supabase/supabase-js'
import type { AgentStatus, CalMeeting, TouchPeriodKey, TouchRow, TouchStats } from './types'
import { GoogleNotConnectedError, listEvents, BOOKING_PROP } from '@/lib/meetings/google'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Бали — UTC+8 круглый год, без летнего времени.
const WITA_OFFSET_MS = 8 * 3600_000
const DAY_MS = 86400_000

function baliDay(offsetDays: number): string {
  const startOfTodayWita = Math.floor((Date.now() + WITA_OFFSET_MS) / DAY_MS) * DAY_MS
  return new Date(startOfTodayWita + offsetDays * DAY_MS).toISOString().slice(0, 10)
}

// Начало суток по Бали в UTC для дня YYYY-MM-DD.
function dayStartIso(day: string): string {
  return new Date(Date.parse(day + 'T00:00:00Z') - WITA_OFFSET_MS).toISOString()
}

export function periodRange(p: TouchPeriodKey): { from: string; to: string } {
  switch (p) {
    case 'yesterday': return { from: baliDay(-1), to: baliDay(-1) }
    case '7d':        return { from: baliDay(-6), to: baliDay(0) }
    case '30d':       return { from: baliDay(-29), to: baliDay(0) }
    default:          return { from: baliDay(0), to: baliDay(0) }
  }
}

type DailyRow = { day: string; chat_id: number; out_cnt: number; in_cnt: number; label: string | null; kind: TouchRow['kind'] }
type AgentLite = { id: string; name: string; agency: string | null; status: AgentStatus; tg_chat_id: number | null; deals_count: number | null; deals_volume_usd: number | null; data: { not_agent?: boolean } | null }

async function dailyRows(from: string, to: string): Promise<DailyRow[]> {
  const out: DailyRow[] = []
  for (let off = 0; off < 50_000; off += 1000) {
    const { data, error } = await sb.from('crm_touch_daily')
      .select('day,chat_id,out_cnt,in_cnt,label,kind')
      .gte('day', from).lte('day', to)
      .order('day', { ascending: true })
      .range(off, off + 999)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as DailyRow[]))
    if (!data || data.length < 1000) break
  }
  return out
}

// Встреча или зум из календаря. Свои записи с сайта (BOOKING_PROP) — тоже
// встречи, их считаем; отменённые и «свободен» — нет.
const ZOOM_RE = /zoom|зум|созвон|call|meet\.google|google meet/i

async function calendarMeetings(fromIso: string, toIso: string): Promise<{ list: CalMeeting[]; state: TouchStats['calendar'] }> {
  try {
    const events = await listEvents(fromIso, toIso)
    const list: CalMeeting[] = []
    for (const e of events) {
      if (e.status === 'cancelled' || e.transparency === 'transparent') continue
      if (!e.start.dateTime) continue // события на весь день — не встречи
      if (e.attendees?.some(a => a.self && a.responseStatus === 'declined')) continue
      const title = e.summary?.trim() || (e.extendedProperties?.private?.[BOOKING_PROP] ? 'Запись с сайта' : 'Без названия')
      list.push({ title, start: e.start.dateTime, zoom: Boolean(e.hangoutLink) || ZOOM_RE.test(title) })
    }
    return { list, state: 'ok' }
  } catch (err) {
    if (err instanceof GoogleNotConnectedError) return { list: [], state: 'not_connected' }
    console.error('[agents] calendar', err)
    return { list: [], state: 'error' }
  }
}

async function countSince(table: 'reservations', statuses: string[], fromIso: string, toIso: string): Promise<number> {
  const { count, error } = await sb.from(table).select('id', { count: 'exact', head: true })
    .in('status', statuses).gte('created_at', fromIso).lt('created_at', toIso)
  if (error) throw new Error(error.message)
  return count ?? 0
}

// День, с которого ведётся отчёт (app_config.crm_report_start). Всё, что
// раньше, в цифры не попадает, даже если выбран период «30 дней».
async function reportStart(): Promise<string | null> {
  const { data } = await sb.from('app_config').select('value').eq('key', 'crm_report_start').maybeSingle()
  const v = (data as { value: string } | null)?.value
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

export async function touchStats(period: TouchPeriodKey): Promise<TouchStats> {
  const range = periodRange(period)
  const start = await reportStart()
  const to = range.to
  // Если период целиком раньше старта отчёта, from > to, и выборки пустые — это честный ноль.
  const from = start && start > range.from ? start : range.from
  const fromIso = dayStartIso(from)
  const toIso = new Date(Date.parse(dayStartIso(to)) + DAY_MS).toISOString()

  const [daily, agentsRes, outreachRes, syncRes, cal, reservations, deals] = await Promise.all([
    dailyRows(from, to),
    sb.from('agents').select('id,name,agency,status,tg_chat_id,deals_count,deals_volume_usd,data').eq('archived', false).not('tg_chat_id', 'is', null),
    sb.from('crm_outreach').select('sent_at,replied_at').gte('sent_at', fromIso).lt('sent_at', toIso),
    sb.from('crm_sync_status').select('synced_at').eq('id', 1).maybeSingle(),
    calendarMeetings(fromIso, toIso),
    countSince('reservations', ['confirmed', 'invoice_sent', 'paid'], fromIso, toIso),
    countSince('reservations', ['paid'], fromIso, toIso),
  ])
  if (agentsRes.error) throw new Error(agentsRes.error.message)
  if (outreachRes.error) throw new Error(outreachRes.error.message)

  const agents = new Map<number, AgentLite>()
  // В отчёт идут только агенты по недвижимости — те, у кого есть карточка.
  // Застройщики, юристы, боты и прочие собеседники без карточки не считаются;
  // карточку, заведённую не на агента, помечаем data.not_agent.
  for (const a of (agentsRes.data ?? []) as AgentLite[]) {
    if (a.tg_chat_id != null && !a.data?.not_agent) agents.set(Number(a.tg_chat_id), a)
  }

  const byChat = new Map<number, TouchRow>()
  for (const d of daily) {
    const a = agents.get(Number(d.chat_id))
    if (!a) continue
    const row = byChat.get(d.chat_id) ?? {
      chat_id: d.chat_id,
      agent_id: a?.id ?? null,
      name: a?.name ?? d.label ?? `Чат ${d.chat_id}`,
      agency: a?.agency ?? null,
      status: a?.status ?? null,
      kind: a ? 'agent' : d.kind,
      incoming: 0, outgoing: 0, total: 0,
      last_day: d.day,
      deals_count: a?.deals_count ?? null,
      deals_volume_usd: a?.deals_volume_usd ?? null,
    }
    row.outgoing += d.out_cnt
    row.incoming += d.in_cnt
    row.total = row.incoming + row.outgoing
    if (d.day > row.last_day) row.last_day = d.day
    byChat.set(d.chat_id, row)
  }
  const rows = [...byChat.values()].sort((x, y) => y.total - x.total || y.last_day.localeCompare(x.last_day))

  const outreach = (outreachRes.data ?? []) as Array<{ sent_at: string; replied_at: string | null }>

  return {
    period, from, to,
    syncedAt: (syncRes.data as { synced_at: string } | null)?.synced_at ?? null,
    funnel: {
      wroteChats: rows.filter(r => r.outgoing > 0).length,
      wroteMsgs: rows.reduce((s, r) => s + r.outgoing, 0),
      gotChats: rows.filter(r => r.incoming > 0).length,
      gotMsgs: rows.reduce((s, r) => s + r.incoming, 0),
      dialogs: rows.filter(r => r.incoming > 0 && r.outgoing > 0).length,
      outreachSent: outreach.length,
      outreachReplied: outreach.filter(o => o.replied_at).length,
      meetings: cal.list.length,
      zooms: cal.list.filter(m => m.zoom).length,
      reservations,
      deals,
    },
    rows,
    meetings: cal.list,
    calendar: cal.state,
  }
}
