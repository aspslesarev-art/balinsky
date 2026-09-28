// Данные дашборда /plan, которые считаются без ИИ: переписка по людям,
// задачи секретаря, ответы, встречи впереди. ИИ-часть — secretary.ts.

import { createClient } from '@supabase/supabase-js'
import { splitContact } from '@/lib/dev-crm/types'
import { baliDay, contactName, loadRoles, messagesSince, PLAN_START_TS, type Msg } from './steps'
import type { AiTask, CommChat, DayNote, Upcoming } from './dash-types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const DAY_MS = 86_400_000
/** Дольше этого сообщение без ответа — уже не «ждёт», а заглохший разговор. */
const WAITING_MAX_MS = 7 * DAY_MS
/** Короткое «спасибо», «ок», эмодзи — ответа не требует. */
const CLOSING_RE = /^(спасибо|спс|благодар\S*|ок|окей|ok|хорошо|отлично|супер|договорились|понял\S*|принято|👍|🙏|🔥|❤️|👌)[\s!.)👍🙏🔥❤️👌]*$/iu

/** Окно переписки на дашборде. */
export const COMMS_DAYS = 30

/** Сообщения за окно дашборда — один раз на загрузку, дальше из памяти. */
export async function recentMessages(): Promise<Msg[]> {
  const since = new Date(Math.max(Date.parse(PLAN_START_TS) - 14 * DAY_MS, Date.now() - COMMS_DAYS * DAY_MS)).toISOString()
  return messagesSince(since, 'id,chat_id,direction,text,voice_transcript,media_type,file_name,contact,ts')
}

function snippet(m: Msg): string {
  const t = (m.text || m.voice_transcript || '').replace(/\s+/g, ' ').trim()
  if (t) return t.length > 140 ? `${t.slice(0, 137)}…` : t
  return m.media_type ? `[${m.media_type === 'photo' ? 'фото' : m.media_type === 'voice' ? 'голосовое' : m.media_type === 'video' ? 'видео' : 'файл'}]` : ''
}

/**
 * Все рабочие чаты за окно: последний ход, кто кого ждёт, привязка к CRM.
 * Личное и ассистент (роль other) сюда не попадают.
 */
export async function loadComms(msgs: Msg[]): Promise<CommChat[]> {
  const roles = await loadRoles()
  const [agents, people] = await Promise.all([
    sb.from('agents').select('id,name,status,tg_chat_id').not('tg_chat_id', 'is', null),
    sb.from('dev_people').select('tg_chat_id,partner:dev_partners(id,name,status)').not('tg_chat_id', 'is', null),
  ])
  if (agents.error) throw new Error(agents.error.message)
  if (people.error) throw new Error(people.error.message)
  const crm = new Map<number, CommChat['crm']>()
  for (const a of agents.data ?? []) crm.set(Number(a.tg_chat_id), { kind: 'agent', id: a.id, title: a.name, status: a.status })
  for (const p of people.data ?? []) {
    const partner = (Array.isArray(p.partner) ? p.partner[0] : p.partner) as { id: string; name: string; status: string } | null
    if (partner) crm.set(Number(p.tg_chat_id), { kind: 'developer', id: partner.id, title: partner.name, status: partner.status })
  }

  const byChat = new Map<number, Msg[]>()
  for (const m of msgs) {
    const list = byChat.get(m.chat_id)
    if (list) list.push(m); else byChat.set(m.chat_id, [m])
  }

  const weekAgo = Date.now() - 7 * DAY_MS
  const out: CommChat[] = []
  for (const [chatId, list] of byChat) {
    const role = roles.get(chatId) ?? null
    if (role === 'other') continue
    list.sort((a, b) => a.id - b.id)
    const last = list.at(-1)!
    const contact = [...list].reverse().find(m => m.contact)?.contact ?? null
    // Его сообщения после нашего последнего — столько он ждёт ответа.
    // Не считаем ожиданием «спасибо»/«ок» и то, что висит дольше недели:
    // это закрытый разговор, а не человек, которому нужен ответ.
    let waiting: string | null = null
    for (let i = list.length - 1; i >= 0 && list[i].direction === 'in'; i--) waiting = list[i].ts
    if (waiting && (Date.now() - Date.parse(waiting) > WAITING_MAX_MS || CLOSING_RE.test((last.text ?? '').trim()))) waiting = null
    const recent = list.filter(m => Date.parse(m.ts) >= weekAgo)
    out.push({
      chat_id: chatId,
      name: contactName(contact),
      username: splitContact(contact).username,
      role,
      crm: crm.get(chatId) ?? null,
      last_ts: last.ts,
      last_dir: last.direction,
      last_text: snippet(last),
      last_in_ts: [...list].reverse().find(m => m.direction === 'in')?.ts ?? null,
      in7: recent.filter(m => m.direction === 'in').length,
      out7: recent.filter(m => m.direction === 'out').length,
      waiting_since: waiting,
    })
  }
  return out.sort((a, b) => b.last_ts.localeCompare(a.last_ts))
}

/**
 * Ответы по дням: в скольких рабочих чатах нам писали и в скольких мы
 * ответили в течение суток после последнего входящего за день.
 */
export async function repliesByDay(msgs: Msg[]): Promise<Map<string, { answered: number; total: number }>> {
  const roles = await loadRoles()
  const byChat = new Map<number, Msg[]>()
  for (const m of msgs) {
    if (roles.get(m.chat_id) === 'other') continue
    const list = byChat.get(m.chat_id)
    if (list) list.push(m); else byChat.set(m.chat_id, [m])
  }
  const out = new Map<string, { answered: number; total: number }>()
  for (const list of byChat.values()) {
    list.sort((a, b) => a.id - b.id)
    const lastIn = new Map<string, number>()
    for (const m of list) if (m.direction === 'in') lastIn.set(baliDay(m.ts), Date.parse(m.ts))
    for (const [day, t] of lastIn) {
      const answered = list.some(m => m.direction === 'out' && Date.parse(m.ts) > t && Date.parse(m.ts) - t <= DAY_MS)
      // Сутки ещё не прошли и ответа нет — рано записывать в неотвеченные.
      if (!answered && Date.now() - t < DAY_MS) continue
      const cur = out.get(day) ?? { answered: 0, total: 0 }
      cur.total++
      if (answered) cur.answered++
      out.set(day, cur)
    }
  }
  return out
}

export async function loadAiTasks(fromDay: string): Promise<AiTask[]> {
  const { data, error } = await sb
    .from('plan_ai_tasks')
    .select('*')
    .gte('day', fromDay)
    .order('priority', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw new Error(`plan_ai_tasks read: ${error.message}`)
  return (data ?? []) as AiTask[]
}

export async function loadDayNotes(fromDay: string): Promise<DayNote[]> {
  const { data, error } = await sb
    .from('plan_days')
    .select('day,brief,brief_at,review,score')
    .gte('day', fromDay)
    .order('day', { ascending: true })
  if (error) throw new Error(`plan_days read: ${error.message}`)
  return (data ?? []) as DayNote[]
}

export async function loadUpcoming(): Promise<Upcoming[]> {
  const { data, error } = await sb
    .from('tg_meetings')
    .select('id,starts_at,contact,topic,place')
    .gte('starts_at', new Date().toISOString())
    .lte('starts_at', new Date(Date.now() + 10 * DAY_MS).toISOString())
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
  if (error) throw new Error(`tg_meetings read: ${error.message}`)
  // Одно время — одна строка: мероприятие подтверждают десятки агентов,
  // а бот иногда записывает одну встречу дважды. Имена склеиваются.
  const byTime = new Map<string, Upcoming & { names: string[] }>()
  for (const m of data ?? []) {
    const key = new Date(m.starts_at).toISOString()
    const name = m.contact ? contactName(m.contact) : null
    const cur = byTime.get(key)
    if (cur) { if (name && !cur.names.includes(name)) cur.names.push(name); continue }
    byTime.set(key, { id: m.id, starts_at: m.starts_at, topic: m.topic, place: m.place, contact: null, names: name ? [name] : [] })
  }
  return [...byTime.values()].map(({ names, ...u }) => ({
    ...u,
    contact: names.length > 3 ? `${names.slice(0, 3).join(', ')} и ещё ${names.length - 3}` : names.join(', ') || null,
  }))
}

/**
 * Задачи «написать человеку» закрываются сами, как только в его чате
 * появилось наше сообщение после постановки задачи. Бесплатно: сверка
 * с уже загруженной перепиской.
 */
export async function autoCloseTasks(tasks: AiTask[], msgs: Msg[]): Promise<AiTask[]> {
  const closed: AiTask[] = []
  for (const t of tasks) {
    if (t.status !== 'open' || !t.auto_close || t.chat_id == null) continue
    const reply = msgs.find(m => m.chat_id === t.chat_id && m.direction === 'out' && m.ts > t.created_at)
    if (!reply) continue
    const { error } = await sb.from('plan_ai_tasks')
      .update({ status: 'done', done_by: 'chat', done_at: reply.ts })
      .eq('id', t.id).eq('status', 'open')
    if (error) throw new Error(`plan_ai_tasks write: ${error.message}`)
    Object.assign(t, { status: 'done', done_by: 'chat', done_at: reply.ts })
    closed.push(t)
  }
  return closed
}

export async function setAiTaskStatus(id: number, done: boolean): Promise<void> {
  const { error } = await sb.from('plan_ai_tasks').update(done
    ? { status: 'done', done_by: 'owner', done_at: new Date().toISOString() }
    : { status: 'open', done_by: null, done_at: null }).eq('id', id)
  if (error) throw new Error(`plan_ai_tasks write: ${error.message}`)
}

/** Сколько задач секретаря закрыто за всё время — идёт в опыт игрока. */
export async function countAiDone(): Promise<number> {
  const { count, error } = await sb.from('plan_ai_tasks').select('id', { count: 'exact', head: true }).eq('status', 'done')
  if (error) throw new Error(`plan_ai_tasks count: ${error.message}`)
  return count ?? 0
}
