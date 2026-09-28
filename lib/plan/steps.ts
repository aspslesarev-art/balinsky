// Трекер плана следит за перепиской сам.
//
// Владелец фиксирует каждый свой шаг в Telegram — отправил договор,
// пригласил на мероприятие, клиент внёс бронь. Этот модуль превращает
// переписку в шаги (plan_steps), а задачи плана закрываются их подсчётом
// (lib/plan/auto.ts). Три источника:
//
//   1. ИИ читает новые сообщения каждого чата и находит сделанные дела.
//      Каждый чат читается один раз: курсор в plan_chat_scan.
//   2. Встречи берутся у бота-наблюдателя (tg_meetings) — он уже ловит
//      время и место, подтверждённые обеими сторонами. Засчитываем, когда
//      время встречи прошло. Бесплатно.
//   3. Касание агента — первое наше сообщение после трёх дней тишины в
//      чате. Бесплатно.
//
// Найденный шаг двигает агента или застройщика по воронке (только вперёд)
// и оставляет запись в ленте карточки.
//
// Деньги (владелец разрешил до $3 в месяц): gpt-5-mini, как у бота встреч.
//   • PLAN_AI_DISABLED=1 — полный стоп без выката кода;
//   • PLAN_AI_DAILY_USD_CAP (дефолт $0.10) — потолок на сутки, прогон
//     встаёт, остаток дочитается на следующий день;
//   • платим только за чаты, где появились новые сообщения.

import { createClient } from '@supabase/supabase-js'
import { logUsage } from '@/lib/usage-tracker'
import { sendAdminAlert } from '@/lib/admin-alert'
import { updateAgent, addNote as addAgentNote } from '@/lib/agents/store'
import { updatePartner, addNote as addDevNote } from '@/lib/dev-crm/store'
import type { AgentStatus } from '@/lib/agents/types'
import {
  AI_KINDS, STEP_KINDS, isChatRole, isStepKind,
  type ChatRole, type PlanStep, type StepKind,
} from './kinds'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

/** Старт квеста по Бали: раньше этого переписку не читаем. */
export const PLAN_START_TS = '2026-09-15T00:00:00+08:00'

const BALI_OFFSET_MS = 8 * 3600_000
const MODEL = process.env.PLAN_AI_MODEL || 'gpt-5-mini'
const DAILY_CAP_USD = Number(process.env.PLAN_AI_DAILY_USD_CAP ?? '0.10')
const TIMEOUT_MS = 60_000
/** Новых сообщений за один вызов модели. Остаток — следующим вызовом. */
const BATCH = 80
/** Сколько прежних сообщений показать модели для понимания контекста. */
const CONTEXT = 12
/** Пауза, после которой наше сообщение считается новым касанием. */
const PING_GAP_MS = 3 * 86_400_000
const AUTHOR = 'ИИ по переписке'

export function baliDay(ts: string | number): string {
  const ms = typeof ts === 'number' ? ts : Date.parse(ts)
  return new Date(ms + BALI_OFFSET_MS).toISOString().slice(0, 10)
}

export class PlanAiCapReached extends Error {}

export function planAiEnabled(): boolean {
  return process.env.PLAN_AI_DISABLED !== '1' && !!process.env.OPENAI_API_KEY
}

/** Потрачено на разбор переписки для плана с полуночи по Бали. */
export async function todayPlanSpendUsd(): Promise<number> {
  const from = new Date(Date.parse(`${baliDay(Date.now())}T00:00:00+08:00`)).toISOString()
  const { data, error } = await sb
    .from('balina_usage')
    .select('cost_usd')
    .eq('feature', 'admin-ai')
    .contains('meta', { kind: 'plan-steps' })
    .gte('ts', from)
  if (error) throw new Error(`balina_usage read: ${error.message}`)
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
}

// ─── Роли чатов ────────────────────────────────────────────────────────

/**
 * С кем каждый чат. Карточка в CRM главнее догадки модели: если чат
 * привязан к агенту или к человеку застройщика — так и есть.
 */
async function loadRoles(): Promise<Map<number, ChatRole>> {
  const roles = new Map<number, ChatRole>()
  const [scan, agents, people] = await Promise.all([
    sb.from('plan_chat_scan').select('chat_id,role'),
    sb.from('agents').select('tg_chat_id').not('tg_chat_id', 'is', null),
    sb.from('dev_people').select('tg_chat_id').not('tg_chat_id', 'is', null),
  ])
  for (const r of [scan, agents, people]) if (r.error) throw new Error(r.error.message)
  for (const r of scan.data ?? []) if (isChatRole(r.role)) roles.set(Number(r.chat_id), r.role)
  for (const r of agents.data ?? []) roles.set(Number(r.tg_chat_id), 'agent')
  for (const r of people.data ?? []) roles.set(Number(r.tg_chat_id), 'developer')
  return roles
}

// ─── Сообщения ─────────────────────────────────────────────────────────

export type Msg = {
  id: number
  chat_id: number
  direction: 'in' | 'out'
  text: string | null
  voice_transcript: string | null
  media_type: string | null
  file_name: string | null
  contact: string | null
  ts: string
}

export const MSG_COLS = 'id,chat_id,direction,text,voice_transcript,media_type,file_name,contact,ts'

/** Все сообщения с момента since, постранично: PostgREST отдаёт максимум 1000 строк. */
async function messagesSince(since: string, cols = MSG_COLS): Promise<Msg[]> {
  const out: Msg[] = []
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await sb
      .from('tg_messages')
      .select(cols)
      .gte('ts', since)
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`tg_messages read: ${error.message}`)
    out.push(...((data ?? []) as unknown as Msg[]))
    if (!data || data.length < 1000) break
  }
  return out
}

export function line(m: Msg, name: string): string {
  const who = m.direction === 'out' ? 'Андрей' : name
  const when = new Date(Date.parse(m.ts) + BALI_OFFSET_MS).toISOString().slice(5, 16).replace('T', ' ')
  const body = (m.text || m.voice_transcript || '').trim()
    || (m.media_type ? `[${m.media_type}${m.file_name ? `: ${m.file_name}` : ''}]` : '[без текста]')
  const attach = m.media_type && (m.text || m.voice_transcript) ? ` [${m.media_type}${m.file_name ? `: ${m.file_name}` : ''}]` : ''
  return `#${m.id} ${when} ${who}: ${body.slice(0, 1500)}${attach}`
}

export function contactName(contact: string | null): string {
  return (contact ?? '').replace(/\s*\(@[^)]+\)\s*$/, '').trim() || 'Собеседник'
}

// ─── ИИ ────────────────────────────────────────────────────────────────

const SYSTEM = `Ты ведёшь учёт работы Андрея. Его бизнес на Бали: он собирает сеть агентов по недвижимости, подписывает застройщиков на ежемесячный фикс (продвижение их объектов через эту сеть, вебинары, мероприятия), агенты приводят клиентов, Андрей получает комиссию со сделок.

Тебе дают кусок переписки Андрея в Telegram с одним человеком. Строки «Андрей: …» пишет Андрей, остальные — собеседник. Сообщения с пометкой [контекст] уже учтены раньше — шаги в них НЕ ищи, они только для понимания.

Верни JSON строго вида:
{"role": "agent|developer|client|other", "steps": [{"id": 123, "kind": "...", "note": "..."}]}

role — кто собеседник:
- agent — агент или брокер по недвижимости, агентство;
- developer — застройщик, его основатель, отдел продаж, представитель;
- client — покупатель или инвестор, который покупает через Андрея;
- other — всё остальное: ассистент или сотрудник Андрея, друзья, сервисы, подрядчики, стройка и ремонт, личные дела Андрея (в том числе его собственная недвижимость).
Если role = other — steps всегда пустой.

steps — дела, которые СОСТОЯЛИСЬ в новых сообщениях. id — номер сообщения (#123), где это видно. kind — один из:

Действия Андрея (строка должна быть от Андрея, иначе это не шаг):
- event_invite — Андрей лично пригласил собеседника на СВОЁ мероприятие, встречу агентов, вебинар или онлайн-разбор. Позвать один на один на кофе, чай или созвон — не шаг (такие встречи учитываются отдельно). Приглашение Андрея куда-то от собеседника — не шаг.
- dev_pitch — Андрей предложил застройщику сотрудничество с ним (фикс, продвижение через сеть агентов, место на вебинаре).
- dev_terms — Андрей назвал застройщику конкретные условия, отправил договор или его редакцию, предложил даты подписания.
- materials — Андрей отправил АГЕНТУ или КЛИЕНТУ подборку объектов, разбор, расчёт доходности или презентацию объекта под запрос. Несколько файлов подряд — один шаг. Отчёт или презентация, отправленные застройщику, — это dev_pitch, не materials.
- qual_call — у Андрея с агентом состоялся звонок-знакомство (есть явный след: «спасибо за звонок», «как обсудили по телефону», итоги разговора). Договорённость созвониться — ещё не шаг.

События, о которых может сообщить любая сторона:
- event_yes — собеседник подтвердил, что придёт на мероприятие или вебинар Андрея.
- dev_signed — застройщик подписал договор с Андреем (явно сказано или прислан подписанный договор).
- booking — клиент внёс бронь (booking fee) за объект.
- deposit — внесён депозит или подписан договор купли по объекту клиента.
- commission — Андрею пришла комиссия за сделку клиента.

note — 3–8 слов по-русски, что именно («договор Oceaniq на подпись», «пригласил на 2 октября»).

Правила:
- Только сделанное, не обещанное: «завтра пришлю договор» — не шаг; «отправляю договор» с файлом — шаг.
- Деньги и подпись (booking, deposit, commission, dev_signed) — только при явном подтверждении, без догадок.
- Пересланные сообщения, рассылки, пересказ чужих дел — не шаги.
- Каждый вид шага — не больше одного раза во всём куске.
- Нет шагов — пустой массив. Лучше пропустить шаг, чем засчитать лишний.`

type AiStep = { id: number; kind: StepKind; note: string }

export async function askModel(transcript: string, hint: string): Promise<{ role: ChatRole | null; steps: AiStep[]; cost: number }> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `${hint}\n\nПереписка:\n${transcript}` },
      ],
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const payload = await r.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const pt = payload.usage?.prompt_tokens ?? 0
  const ct = payload.usage?.completion_tokens ?? 0
  logUsage({ feature: 'admin-ai', deployment: MODEL, promptTokens: pt, completionTokens: ct, meta: { kind: 'plan-steps', provider: 'openai' } })
  // Та же цена, что в usage-tracker: нужна здесь, чтобы потолок
  // срабатывал внутри прогона, не дожидаясь записи в balina_usage.
  const cost = (pt / 1e6) * 0.25 + (ct / 1e6) * 2

  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw new Error('модель не вернула ответ')
  let parsed: { role?: unknown; steps?: unknown }
  try { parsed = JSON.parse(raw) } catch { throw new Error('модель вернула не JSON') }

  const steps: AiStep[] = []
  for (const s of Array.isArray(parsed.steps) ? parsed.steps : []) {
    const id = Number((s as { id?: unknown }).id)
    const kind = (s as { kind?: unknown }).kind
    const note = (s as { note?: unknown }).note
    if (!Number.isFinite(id) || !isStepKind(kind) || !AI_KINDS.includes(kind)) continue
    steps.push({ id, kind, note: typeof note === 'string' ? note.trim().slice(0, 120) : '' })
  }
  return { role: isChatRole(parsed.role) ? parsed.role : null, steps, cost }
}

type NewStep = {
  key: string
  kind: StepKind
  ts: string
  source: 'ai' | 'meeting' | 'rule'
  chat_id: number | null
  message_id?: number | null
  meeting_id?: number | null
  role?: ChatRole | null
  contact: string | null
  note: string | null
}

/** Записать шаги; вернуть только действительно новые (повтор ключа молча пропускается). */
async function saveSteps(rows: NewStep[]): Promise<NewStep[]> {
  if (!rows.length) return []
  const { data, error } = await sb
    .from('plan_steps')
    .upsert(rows, { onConflict: 'key', ignoreDuplicates: true })
    .select('key')
  if (error) throw new Error(`plan_steps write: ${error.message}`)
  const fresh = new Set((data ?? []).map(r => r.key as string))
  return rows.filter(r => fresh.has(r.key))
}

export type ScanReport = {
  chats: number
  calls: number
  spentUsd: number
  stoppedByCap: boolean
  failed: number
  fresh: NewStep[]
}

/**
 * Прочесть ИИ все чаты, где с прошлого раза появились сообщения.
 * capUsd — потолок на этот запуск поверх уже потраченного за сутки.
 */
async function scanAi(roles: Map<number, ChatRole>, opts: { capUsd: number; maxCalls: number }): Promise<ScanReport> {
  const report: ScanReport = { chats: 0, calls: 0, spentUsd: 0, stoppedByCap: false, failed: 0, fresh: [] }
  if (!planAiEnabled()) return report

  const { data: cursors, error } = await sb.from('plan_chat_scan').select('chat_id,last_message_id')
  if (error) throw new Error(error.message)
  const seen = new Map<number, number>((cursors ?? []).map(c => [Number(c.chat_id), Number(c.last_message_id)]))

  // Какие чаты ждут чтения: самое свежее сообщение новее курсора.
  const heads = await messagesSince(PLAN_START_TS, 'id,chat_id')
  const pending = new Map<number, number>()
  for (const m of heads) if (m.id > (seen.get(m.chat_id) ?? 0)) pending.set(m.chat_id, Math.max(pending.get(m.chat_id) ?? 0, m.id))

  for (const chatId of pending.keys()) {
    report.chats++
    let cursor = seen.get(chatId) ?? 0
    // Длинный чат читается несколькими порциями подряд.
    for (;;) {
      if (report.calls >= opts.maxCalls) return report
      if (report.spentUsd >= opts.capUsd) { report.stoppedByCap = true; return report }

      const { data: fresh, error: fe } = await sb
        .from('tg_messages').select(MSG_COLS)
        .eq('chat_id', chatId).gt('id', cursor).gte('ts', PLAN_START_TS)
        .order('id', { ascending: true }).limit(BATCH)
      if (fe) throw new Error(fe.message)
      const batch = (fresh ?? []) as unknown as Msg[]
      if (!batch.length) break

      const { data: prev, error: pe } = await sb
        .from('tg_messages').select(MSG_COLS)
        .eq('chat_id', chatId).lt('id', batch[0].id)
        .order('id', { ascending: false }).limit(CONTEXT)
      if (pe) throw new Error(pe.message)
      const context = ((prev ?? []) as unknown as Msg[]).reverse()

      const contact = batch.at(-1)!.contact ?? context.at(-1)?.contact ?? null
      const name = contactName(contact)
      const known = roles.get(chatId)
      const hint = `Собеседник: ${contact ?? 'без имени'}` + (known && known !== 'other'
        ? `\nПо CRM это ${known === 'agent' ? 'агент' : known === 'developer' ? 'застройщик' : 'клиент'}.`
        : '')
      const transcript = [
        ...context.map(m => `[контекст] ${line(m, name)}`),
        ...batch.map(m => line(m, name)),
      ].join('\n').slice(-30_000)

      let res: Awaited<ReturnType<typeof askModel>>
      try {
        res = await askModel(transcript, hint)
      } catch (e) {
        report.failed++
        console.error('[plan-steps] ai failed:', chatId, e instanceof Error ? e.message : e)
        break // курсор не двигаем — дочитаем в следующий раз
      }
      report.calls++
      report.spentUsd += res.cost

      const byId = new Map(batch.map(m => [m.id, m]))
      const role = roles.get(chatId) ?? res.role
      if (!roles.has(chatId) && res.role) roles.set(chatId, res.role)

      const rows: NewStep[] = []
      // Ассистент, друзья, личные дела — не работа по плану, даже если
      // модель что-то там нашла.
      for (const s of role === 'other' ? [] : res.steps) {
        const m = byId.get(s.id)
        if (!m) continue // модель сослалась на сообщение из контекста или выдумала номер
        rows.push({
          // Один вид шага с одним человеком — не чаще раза в сутки: пять
          // видео подряд или приглашение с напоминанием — это одно дело.
          key: `ai:${chatId}:${baliDay(m.ts)}:${s.kind}`, kind: s.kind, ts: m.ts, source: 'ai',
          chat_id: chatId, message_id: m.id, role: role ?? null,
          contact: m.contact ?? contact, note: s.note || null,
        })
      }
      report.fresh.push(...await saveSteps(rows))

      cursor = batch.at(-1)!.id
      const { error: ce } = await sb.from('plan_chat_scan').upsert({
        chat_id: chatId, last_message_id: cursor, role: res.role ?? role ?? null, updated_at: new Date().toISOString(),
      })
      if (ce) throw new Error(ce.message)
      if (batch.length < BATCH) break
    }
  }
  return report
}

// ─── Встречи ───────────────────────────────────────────────────────────

const ONLINE_RE = /zoom|зум|звон|созвон|call|meet|телефон|онлайн|online|видео/i
const WEBINAR_RE = /вебинар|эфир|разбор для|онлайн-разбор/i
const EVENT_RE = /мероприят|встреча агентов|агентов на вилле|альянс|продающих агентов/i
const CLIENT_RE = /клиент|инвестор|покупател/i

function meetingKind(m: { topic: string | null; place: string | null }, role: ChatRole | undefined): StepKind | null {
  const topic = m.topic ?? ''
  const place = m.place ?? ''
  if (WEBINAR_RE.test(topic)) return 'webinar'
  if (EVENT_RE.test(topic)) return 'event'
  if (role === 'other') return null
  if (role === 'developer') return 'dev_meet'
  const online = ONLINE_RE.test(place) || ONLINE_RE.test(topic)
  if (online) return role === 'client' || CLIENT_RE.test(topic) ? 'client_zoom' : 'agent_zoom'
  return 'coffee'
}

/** Прошедшие встречи бота-наблюдателя → шаги. Повтор той же встречи (одно время в одном чате) — один шаг. */
async function scanMeetings(roles: Map<number, ChatRole>): Promise<NewStep[]> {
  const { data, error } = await sb
    .from('tg_meetings')
    .select('id,chat_id,contact,status,topic,place,starts_at')
    .gte('starts_at', PLAN_START_TS)
    .lte('starts_at', new Date().toISOString())
    .neq('status', 'cancelled')
    .order('id', { ascending: true })
  if (error) throw new Error(`tg_meetings read: ${error.message}`)

  const rows: NewStep[] = []
  const slot = new Set<string>()
  for (const m of data ?? []) {
    const chatId = Number(m.chat_id)
    const kind = meetingKind(m, roles.get(chatId))
    if (!kind) continue
    // Мероприятие одно на всех, сколько бы агентов его ни подтвердили.
    const key = kind === 'event' || kind === 'webinar'
      ? `mt:${kind}:${baliDay(m.starts_at)}`
      : `mt:${chatId}:${new Date(m.starts_at).toISOString()}`
    if (slot.has(key)) continue
    slot.add(key)
    rows.push({
      key, kind, ts: m.starts_at, source: 'meeting', chat_id: chatId, meeting_id: m.id,
      role: roles.get(chatId) ?? null, contact: m.contact, note: m.topic,
    })
  }
  return saveSteps(rows)
}

// ─── Касания ───────────────────────────────────────────────────────────

/** Наше первое сообщение агенту после трёх дней тишины в чате. */
async function scanPings(roles: Map<number, ChatRole>, lookbackDays: number): Promise<NewStep[]> {
  const planStart = Date.parse(PLAN_START_TS)
  const windowStart = Math.max(planStart, Date.now() - lookbackDays * 86_400_000)
  const msgs = await messagesSince(new Date(windowStart - PING_GAP_MS).toISOString(), 'id,chat_id,direction,contact,ts')

  const last = new Map<number, number>()
  const rows: NewStep[] = []
  for (const m of msgs) {
    const t = Date.parse(m.ts)
    const prev = last.get(m.chat_id)
    last.set(m.chat_id, t)
    if (m.direction !== 'out' || t < windowStart || roles.get(m.chat_id) !== 'agent') continue
    if (prev !== undefined && t - prev < PING_GAP_MS) continue
    rows.push({
      key: `ping:${m.id}`, kind: 'ping', ts: m.ts, source: 'rule', chat_id: m.chat_id,
      message_id: m.id, role: 'agent', contact: m.contact, note: null,
    })
  }
  return saveSteps(rows)
}

// ─── Воронка ───────────────────────────────────────────────────────────

const RANK: Record<AgentStatus, number> = { new: 0, contact: 1, to_schedule: 2, scheduled: 3, met: 4, working: 5, lost: -1 }

/** Куда шаг продвигает карточку. Назад и из «Не сложилось» — никогда. */
const ADVANCE: Partial<Record<StepKind, AgentStatus>> = {
  qual_call: 'met', coffee: 'met', agent_zoom: 'met', client_zoom: 'met', dev_meet: 'met',
  dev_terms: 'met', dev_signed: 'working', booking: 'working', deposit: 'working', commission: 'working',
}

async function syncCrm(steps: NewStep[]): Promise<number> {
  const notable = steps.filter(s => s.kind !== 'ping' && s.chat_id != null && s.kind !== 'event' && s.kind !== 'webinar')
  if (!notable.length) return 0
  const chatIds = [...new Set(notable.map(s => s.chat_id!))]

  const [agents, people] = await Promise.all([
    sb.from('agents').select('id,status,tg_chat_id').in('tg_chat_id', chatIds),
    sb.from('dev_people').select('partner_id,tg_chat_id').in('tg_chat_id', chatIds),
  ])
  if (agents.error) throw new Error(agents.error.message)
  if (people.error) throw new Error(people.error.message)
  const agentBy = new Map((agents.data ?? []).map(a => [Number(a.tg_chat_id), a as { id: string; status: AgentStatus }]))
  const partnerIds = [...new Set((people.data ?? []).map(p => p.partner_id as string))]
  const partners = partnerIds.length
    ? await sb.from('dev_partners').select('id,status').in('id', partnerIds)
    : { data: [], error: null }
  if (partners.error) throw new Error(partners.error.message)
  const partnerStatus = new Map((partners.data ?? []).map(p => [p.id as string, p.status as AgentStatus]))
  const partnerBy = new Map((people.data ?? []).map(p => [Number(p.tg_chat_id), p.partner_id as string]))

  let touched = 0
  for (const s of notable.sort((a, b) => a.ts.localeCompare(b.ts))) {
    const text = `${STEP_KINDS[s.kind].icon} По переписке: ${STEP_KINDS[s.kind].label.toLowerCase()}${s.note ? ` — ${s.note}` : ''} (${baliDay(s.ts)})`
    const target = ADVANCE[s.kind]
    try {
      const agent = agentBy.get(s.chat_id!)
      if (agent) {
        await addAgentNote(agent.id, text, AUTHOR, 'system')
        if (target && RANK[agent.status] >= 0 && RANK[target] > RANK[agent.status]) {
          await updateAgent(agent.id, { status: target }, AUTHOR)
          agent.status = target
        }
        touched++
      }
      const partnerId = partnerBy.get(s.chat_id!)
      if (partnerId) {
        await addDevNote(partnerId, text, AUTHOR, 'system')
        const cur = partnerStatus.get(partnerId) ?? 'new'
        if (target && RANK[cur] >= 0 && RANK[target] > RANK[cur]) {
          await updatePartner(partnerId, { status: target }, AUTHOR)
          partnerStatus.set(partnerId, target)
        }
        touched++
      }
    } catch (e) {
      console.error('[plan-steps] crm sync failed:', s.key, e instanceof Error ? e.message : e)
    }
  }
  return touched
}

// ─── Сводка в Telegram ─────────────────────────────────────────────────

/** Важное — поштучно, рутину (касания, приглашения) — счётчиком. */
const LOUD: StepKind[] = ['dev_signed', 'commission', 'deposit', 'booking', 'dev_terms', 'webinar', 'event']

function digest(steps: NewStep[]): string | null {
  if (!steps.length) return null
  const lines: string[] = []
  for (const s of steps.filter(s => LOUD.includes(s.kind))) {
    lines.push(`${STEP_KINDS[s.kind].icon} ${STEP_KINDS[s.kind].label} — ${contactName(s.contact)}${s.note ? `: ${s.note}` : ''}`)
  }
  const counts = new Map<StepKind, number>()
  for (const s of steps) if (!LOUD.includes(s.kind)) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1)
  for (const [k, n] of counts) lines.push(`${STEP_KINDS[k].icon} ${STEP_KINDS[k].label}: ${n}`)
  return `✅ Трекер засчитал по переписке:\n${lines.join('\n')}\n\nНе так — сними на https://balinsky.info/plan`
}

// ─── Один прогон ───────────────────────────────────────────────────────

export type RunResult = {
  ai: Omit<ScanReport, 'fresh'>
  steps: Record<string, number>
  crmTouched: number
}

/**
 * Полный прогон: ИИ по новым сообщениям, встречи, касания, воронка,
 * сводка. lookbackDays — окно для касаний (при разовом доборе истории
 * передать больше). capUsd по умолчанию — остаток суточного потолка.
 */
export async function runPlanScan(opts: { lookbackDays?: number; capUsd?: number; maxCalls?: number; notify?: boolean } = {}): Promise<RunResult> {
  const roles = await loadRoles()

  const left = opts.capUsd ?? Math.max(0, DAILY_CAP_USD - await todayPlanSpendUsd())
  const ai = await scanAi(roles, { capUsd: left, maxCalls: opts.maxCalls ?? 60 })
  if (ai.stoppedByCap) console.warn(`[plan-steps] остановлено потолком $${DAILY_CAP_USD}/сутки`)

  const meetings = await scanMeetings(roles)
  const pings = await scanPings(roles, opts.lookbackDays ?? 5)
  const fresh = [...ai.fresh, ...meetings, ...pings]

  const crmTouched = await syncCrm(fresh)

  if (opts.notify !== false) {
    const text = digest(fresh)
    if (text) await sendAdminAlert(text)
  }

  const steps: Record<string, number> = {}
  for (const s of fresh) steps[s.kind] = (steps[s.kind] ?? 0) + 1
  const { fresh: _omit, ...aiReport } = ai
  void _omit
  return { ai: aiReport, steps, crmTouched }
}

// ─── Для экрана плана ──────────────────────────────────────────────────

/** Все шаги квеста, включая отклонённые (их видно в ленте зачёркнутыми). */
export async function loadPlanSteps(): Promise<PlanStep[]> {
  const out: PlanStep[] = []
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await sb
      .from('plan_steps')
      .select('id,kind,ts,contact,note,chat_id,rejected')
      .gte('ts', PLAN_START_TS)
      .order('ts', { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`plan_steps read: ${error.message}`)
    for (const r of data ?? []) {
      if (!isStepKind(r.kind)) continue
      out.push({
        id: Number(r.id), kind: r.kind, ts: r.ts, day: baliDay(r.ts),
        contact: r.contact ? contactName(r.contact) : null, note: r.note,
        chat_id: r.chat_id == null ? null : Number(r.chat_id), rejected: r.rejected === true,
      })
    }
    if (!data || data.length < 1000) break
  }
  return out
}

export async function setStepRejected(id: number, rejected: boolean): Promise<void> {
  const { error } = await sb.from('plan_steps').update({ rejected }).eq('id', id)
  if (error) throw new Error(`plan_steps write: ${error.message}`)
}
