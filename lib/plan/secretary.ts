// ИИ-секретарь трекера плана. Ведёт день владельца:
//
//   08:00 — утренний план: 5–10 конкретных задач (кому написать, что
//           отправить, кого дожать) по квест-плану, переписке, воронке
//           и встречам впереди; короткий бриф в Telegram;
//   13:00, 17:00 — пересборка: сделанное остаётся, неактуальное снимается,
//           новое (кто-то написал, встреча перенеслась) добавляется;
//   21:00 — итог дня: оценка 0–100 (считается без ИИ, lib/plan/score.ts)
//           и пара фраз — что получилось, что нет, фокус на завтра.
//
// Задачи «написать человеку» закрываются сами, когда в его чате появился
// наш ответ (dashboard.ts → autoCloseTasks).
//
// Деньги — общий потолок с разбором переписки (steps.ts): PLAN_AI_DAILY_USD_CAP,
// стоп PLAN_AI_DISABLED=1. Один вызов — около цента.

import { createClient } from '@supabase/supabase-js'
import { logUsage } from '@/lib/usage-tracker'
import { sendAdminAlert } from '@/lib/admin-alert'
import { ALL_TASKS, PLAN, PLAN_DEADLINE, WAITING_TASKS } from './data'
import { autoProgress } from './auto'
import { STEP_KINDS } from './kinds'
import { scoreDays } from './score'
import { loadDoneTasks } from './store'
import { DAILY_CAP_USD, baliDay, loadPlanSteps, planAiEnabled, todayPlanSpendUsd, type Msg } from './steps'
import {
  autoCloseTasks, loadAiTasks, loadComms, loadDayNotes, loadUpcoming, recentMessages, repliesByDay,
} from './dashboard'
import type { AiTask, CommChat, Draft } from './dash-types'
import { DRAFT_RULES, OFFER, humanize } from './offer'
import type { PlanStep } from './kinds'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const MODEL = process.env.PLAN_AI_MODEL || 'gpt-5-mini'
const TIMEOUT_MS = 90_000
const BALI_OFFSET_MS = 8 * 3600_000
const PLAN_URL = 'https://balinsky.info/plan'

export class SecretaryCapReached extends Error {}

function baliHour(): number {
  return new Date(Date.now() + BALI_OFFSET_MS).getUTCHours()
}

function shortDate(day: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))
}

const ROLE_RU = { agent: 'агент', developer: 'застройщик', client: 'клиент', other: 'другое' } as const

/** Созвоны и живые встречи с человеком с начала квеста — ступень лестницы. */
const CALL_KINDS = new Set(['qual_call', 'agent_zoom', 'client_zoom', 'dev_meet'])
function stageOf(chatId: number, steps: PlanStep[]): string {
  const mine = steps.filter(s => s.chat_id === chatId && !s.rejected)
  const calls = mine.filter(s => CALL_KINDS.has(s.kind)).length
  const meets = mine.filter(s => s.kind === 'coffee').length
  if (meets) return `живых встреч было ${meets} — вести к следующему шагу`
  if (calls) return `созвон был (${calls}) — вести к живой встрече`
  return 'созвона ещё не было — вести к созвону'
}

function ago(ts: string): string {
  const h = Math.round((Date.now() - Date.parse(ts)) / 3_600_000)
  return h < 24 ? `${h} ч назад` : `${Math.round(h / 24)} дн назад`
}

// ─── Контекст ──────────────────────────────────────────────────────────

type Context = {
  today: string
  text: string
  openToday: AiTask[]
  comms: CommChat[]
}

async function buildContext(): Promise<Context> {
  const today = baliDay(Date.now())
  const yesterday = baliDay(Date.now() - 86_400_000)
  const [msgs, { done, off }, steps, aiTasks, notes, upcoming] = await Promise.all([
    recentMessages(), loadDoneTasks(), loadPlanSteps(), loadAiTasks(yesterday), loadDayNotes(yesterday), loadUpcoming(),
  ])
  await autoCloseTasks(aiTasks, msgs)
  const comms = await loadComms(msgs)

  const auto = autoProgress(ALL_TASKS, steps)
  const eff = new Set(done)
  for (const [id, p] of auto) if (p.done && !off.includes(id)) eff.add(id)

  const week = PLAN.find(w => w.days.some(d => d.iso >= today)) ?? PLAN.at(-1)!
  const planToday = ALL_TASKS.filter(t => !t.waiting && t.expected === today)
  const overdue = ALL_TASKS.filter(t => !t.waiting && t.expected < today && !eff.has(t.id))
  const waiting = WAITING_TASKS.filter(t => !eff.has(t.id)).slice(0, 5)
  const daysLeft = Math.ceil((Date.parse(`${PLAN_DEADLINE}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)

  const taskLine = (t: (typeof ALL_TASKS)[number]) => {
    const p = auto.get(t.id)
    return `- ${t.text}${eff.has(t.id) ? ' [сделано]' : ''}${p && !p.done ? ` [по переписке ${p.have}/${p.need}]` : ''}`
  }

  const byChat = new Map<number, Msg[]>()
  for (const m of msgs) {
    const list = byChat.get(m.chat_id)
    if (list) list.push(m); else byChat.set(m.chat_id, [m])
  }
  const tail = (chatId: number, n: number) => (byChat.get(chatId) ?? [])
    .sort((a, b) => a.id - b.id).slice(-n)
    .map(m => `    ${m.direction === 'out' ? 'Андрей' : 'Он'}: ${(m.text || m.voice_transcript || `[${m.media_type ?? 'без текста'}]`).replace(/\s+/g, ' ').slice(0, 300)}`)
    .join('\n')

  const who = (c: CommChat) => `${c.name}${c.username ? ` (@${c.username})` : ''}, ${c.role ? ROLE_RU[c.role] : 'роль неизвестна'}${c.crm ? `, CRM: ${c.crm.title}, статус ${c.crm.status}` : ''}; ${c.goal ? `ЦЕЛЬ АНДРЕЯ: «${c.goal}»; ` : ''}${stageOf(c.chat_id, steps)} [chat_id ${c.chat_id}]`

  // Ждут нашего ответа: сначала те, кто в воронке, потом по давности.
  const waitingMe = comms.filter(c => c.waiting_since)
    .sort((a, b) => Number(!!b.crm) - Number(!!a.crm) || a.waiting_since!.localeCompare(b.waiting_since!))
    .slice(0, 15)
  // Ждём мы: наше сообщение последнее и висит больше двух суток.
  const waitingThem = comms.filter(c => c.last_dir === 'out' && Date.now() - Date.parse(c.last_ts) > 2 * 86_400_000)
    .sort((a, b) => Number(!!b.crm) - Number(!!a.crm) || b.last_ts.localeCompare(a.last_ts))
    .slice(0, 10)

  // Люди, по которым Андрей сам поставил цель, — видны всегда, даже если молчат.
  const withGoal = comms.filter(c => c.goal)

  const todaySteps = steps.filter(s => s.day === today && !s.rejected)
  const yNote = notes.find(n => n.day === yesterday)
  const yOpen = aiTasks.filter(t => t.day === yesterday && t.status === 'open')
  const openToday = aiTasks.filter(t => t.day === today && t.status !== 'dropped')

  const text = [
    `Сегодня ${shortDate(today)} (${today}). До вылета в Гоа ${daysLeft} дн. Неделя плана №${week.n} «${week.title}».`,
    `Цель квартала: $52 500, 12 сделок, 4 застройщика на фиксе.`,
    '',
    'ПЛАН НА СЕГОДНЯ (квест):',
    planToday.length ? planToday.map(taskLine).join('\n') : '- в плане на сегодня ничего',
    '',
    `ХВОСТЫ ИЗ ПРОШЛЫХ ДНЕЙ (${overdue.length}):`,
    overdue.slice(0, 12).map(taskLine).join('\n') || '- нет',
    '',
    'ЖДЁМ ЧУЖОГО РЕШЕНИЯ:',
    waiting.map(t => `- ${t.text} (по плану ${t.expected})`).join('\n') || '- нет',
    '',
    'ВСТРЕЧИ ВПЕРЕДИ:',
    upcoming.map(u => `- ${u.starts_at.slice(0, 16).replace('T', ' ')} UTC · ${u.contact ?? ''} · ${u.topic ?? ''} · ${u.place ?? ''}`).join('\n') || '- нет',
    '',
    'ЛЮДИ, ПО КОТОРЫМ АНДРЕЙ ПОСТАВИЛ ЦЕЛЬ (главный приоритет):',
    withGoal.map(c => `- ${who(c)}, ${c.waiting_since ? `ждёт ответа ${ago(c.waiting_since)}` : `последнее сообщение ${ago(c.last_ts)} от ${c.last_dir === 'out' ? 'Андрея' : 'него'}`}\n${tail(c.chat_id, 6)}`).join('\n') || '- целей пока нет',
    '',
    'ЖДУТ ОТВЕТА АНДРЕЯ:',
    waitingMe.map(c => `- ${who(c)}, пишет ${ago(c.waiting_since!)}\n${tail(c.chat_id, 4)}`).join('\n') || '- никто',
    '',
    'АНДРЕЙ НАПИСАЛ, ОТВЕТА НЕТ БОЛЬШЕ 2 ДНЕЙ:',
    waitingThem.map(c => `- ${who(c)}, последнее ${ago(c.last_ts)}\n${tail(c.chat_id, 2)}`).join('\n') || '- никто',
    '',
    'СДЕЛАНО СЕГОДНЯ ПО ПЕРЕПИСКЕ:',
    todaySteps.length
      ? [...new Set(todaySteps.map(s => s.kind))].map(k => `- ${STEP_KINDS[k].label}: ${todaySteps.filter(s => s.kind === k).length}`).join('\n')
      : '- пока ничего',
    '',
    yNote?.review ? `ИТОГ ВЧЕРА: ${yNote.review}` : '',
    yOpen.length ? `НЕ СДЕЛАНО ВЧЕРА:\n${yOpen.map(t => `- ${t.title}`).join('\n')}` : '',
  ].join('\n')

  return { today, text, openToday, comms }
}

// ─── Вызов модели ──────────────────────────────────────────────────────

async function callModel(system: string, user: string): Promise<{ json: Record<string, unknown>; cost: number }> {
  if (!planAiEnabled()) throw new Error('ИИ выключен (PLAN_AI_DISABLED или нет OPENAI_API_KEY)')
  if ((await todayPlanSpendUsd()) >= DAILY_CAP_USD) throw new SecretaryCapReached(`дневной потолок $${DAILY_CAP_USD} исчерпан`)

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'low',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
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
  logUsage({ feature: 'admin-ai', deployment: MODEL, promptTokens: pt, completionTokens: ct, meta: { kind: 'plan-secretary', provider: 'openai' } })
  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw new Error('модель не вернула ответ')
  try {
    return { json: JSON.parse(raw) as Record<string, unknown>, cost: (pt / 1e6) * 0.25 + (ct / 1e6) * 2 }
  } catch { throw new Error('модель вернула не JSON') }
}

// ─── План дня ──────────────────────────────────────────────────────────

const PLAN_SYSTEM = `Ты — личный секретарь Андрея. Его бизнес на Бали: сеть агентов по недвижимости, застройщики на ежемесячном фиксе (продвижение их объектов через агентов, вебинары, мероприятия), комиссия со сделок клиентов, которых приводят агенты. У него квест: заработать к 14 декабря и улететь в Гоа.

Тебе дают сводку: план квеста на сегодня, хвосты, кто ждёт ответа, кому он написал без ответа, встречи впереди, что уже сделано. Составь ему план на СЕГОДНЯ — то, что реально двигает деньги.

Верни JSON строго вида:
{"brief": "...", "tasks": [{"keep_id": 12, "title": "...", "detail": "...", "chat_id": 123, "priority": 1, "auto_close": true, "goal": "call", "draft": "..."}]}

brief — 2–3 коротких предложения: главное на сегодня и почему. Без приветствий и воды.

tasks — от 5 до 10 задач, самые важные первыми:
- title — действие одной строкой, с именем: «Ответить Ольге Жук про 2 октября», «Отправить Застройщику Oceaniq договор», «Написать 10 агентам: Жанна, Кристина, …». До 90 знаков.
- detail — одна строка: что именно сказать или сделать и зачем. Можно пусто.
- chat_id — если задача про конкретного человека из сводки, его chat_id (ТОЛЬКО из сводки, не выдумывать); иначе null.
- priority — 1: срочно (деньги, подписи, человек ждёт ответа больше суток, встреча сегодня) — не больше трёх таких; 2: важно для плана; 3: если останется время.
- auto_close — true, если задача выполняется одним сообщением этому человеку (ответить, напомнить, отправить); false для всего остального.
- keep_id — только при пересборке: если задача совпадает с уже поставленной, верни её id, текст можно уточнить.
- goal и draft — ТОЛЬКО для задач с chat_id: goal — к чему ведёт сообщение ("call" — созвон, "meeting" — встреча, "reply" — просто ответить), draft — готовый текст сообщения этому человеку от имени Андрея, по правилам ниже. Для остальных задач — null.

Если у человека стоит ЦЕЛЬ АНДРЕЯ — всё общение с ним ведёт к этой цели: пойми по переписке, где вы сейчас, что мешает и какой один следующий шаг приближает к цели; задача и черновик — про этот шаг. У каждого человека с целью должна быть задача на сегодня, если с ним сейчас уместно написать (не пиши тому, кому уже написали сегодня и ждём ответа меньше двух дней).
Если цели нет — поднимай человека на ступень: переписка → созвон → встреча → договорённость. Ступень каждого указана в сводке.

${OFFER}

${DRAFT_RULES}

Правила:
- Задачи квест-плана на сегодня и хвосты превращай в конкретику: не «10 пингов», а кому именно, из тех, кто в сводке давно молчит.
- Ждущих ответа агентов и застройщиков из воронки — в приоритет 1.
- Не ставь задач про уже сделанное (помечено [сделано] или есть в «сделано сегодня»).
- Не придумывай людей, суммы и договорённости, которых нет в сводке. Одного человека не упоминай в двух задачах.
- Личное и ассистент — не задачи.`

type RawTask = { keep_id?: unknown; title?: unknown; detail?: unknown; chat_id?: unknown; priority?: unknown; auto_close?: unknown; goal?: unknown; draft?: unknown }

function goalOf(v: unknown): Draft['goal'] | null {
  return v === 'call' || v === 'meeting' || v === 'reply' ? v : null
}

async function writePlan(ctx: Context, json: Record<string, unknown>, mode: 'morning' | 'refresh'): Promise<{ brief: string; added: AiTask[] }> {
  const brief = typeof json.brief === 'string' ? json.brief.trim().slice(0, 600) : ''
  const raw = Array.isArray(json.tasks) ? (json.tasks as RawTask[]) : []
  const chats = new Set(ctx.comms.map(c => c.chat_id))
  const nameOf = new Map(ctx.comms.map(c => [c.chat_id, c.name]))
  const existing = new Map(ctx.openToday.map(t => [t.id, t]))

  const kept = new Set<number>()
  const inserts: Array<Record<string, unknown>> = []
  for (const t of raw.slice(0, 12)) {
    const title = typeof t.title === 'string' ? t.title.trim().slice(0, 140) : ''
    if (!title) continue
    const chatId = Number(t.chat_id)
    const chat = Number.isFinite(chatId) && chats.has(chatId) ? chatId : null
    const priority = t.priority === 1 || t.priority === 3 ? t.priority : 2
    const detail = typeof t.detail === 'string' && t.detail.trim() ? t.detail.trim().slice(0, 300) : null
    const draft = chat && typeof t.draft === 'string' && t.draft.trim() ? humanize(t.draft).slice(0, 1500) : null
    const goal = chat ? goalOf(t.goal) : null
    const keep = Number(t.keep_id)
    if (Number.isFinite(keep) && existing.has(keep)) {
      kept.add(keep)
      const cur = existing.get(keep)!
      if (cur.status === 'open') {
        const { error } = await sb.from('plan_ai_tasks').update({ title, detail, priority, draft: draft ?? cur.draft, goal: goal ?? cur.goal }).eq('id', keep)
        if (error) throw new Error(error.message)
      }
      continue
    }
    inserts.push({
      day: ctx.today, title, detail, chat_id: chat, contact: chat ? nameOf.get(chat) ?? null : null,
      priority, auto_close: t.auto_close === true && chat !== null, draft, goal,
    })
  }

  // Пересборка снимает открытые задачи, которых нет в новом списке.
  // Сделанные не трогаем никогда: это история дня.
  if (mode === 'refresh') {
    const drop = ctx.openToday.filter(t => t.status === 'open' && !kept.has(t.id)).map(t => t.id)
    if (drop.length) {
      const { error } = await sb.from('plan_ai_tasks').update({ status: 'dropped' }).in('id', drop)
      if (error) throw new Error(error.message)
    }
  }

  let added: AiTask[] = []
  if (inserts.length) {
    const { data, error } = await sb.from('plan_ai_tasks').insert(inserts).select('*')
    if (error) throw new Error(error.message)
    added = (data ?? []) as AiTask[]
  }

  const now = new Date().toISOString()
  const { error } = await sb.from('plan_days').upsert({ day: ctx.today, brief: brief || null, brief_at: now, updated_at: now })
  if (error) throw new Error(error.message)
  return { brief, added }
}

/** Составить (morning) или пересобрать (refresh) план дня. */
export async function planDay(mode: 'morning' | 'refresh', opts: { notify?: boolean } = {}): Promise<{ brief: string; added: number }> {
  const ctx = await buildContext()
  const existing = ctx.openToday.length
    ? `\n\nУЖЕ ПОСТАВЛЕННЫЕ ЗАДАЧИ НА СЕГОДНЯ (сохраняй через keep_id то, что ещё актуально):\n${ctx.openToday.map(t => `- id ${t.id} [${t.status === 'done' ? 'сделано' : 'открыта'}] ${t.title}`).join('\n')}`
    : ''
  const { json } = await callModel(PLAN_SYSTEM, ctx.text + existing)
  const { brief, added } = await writePlan(ctx, json, ctx.openToday.length ? 'refresh' : mode)

  if (opts.notify !== false) {
    const urgent = added.filter(t => t.priority === 1)
    if (mode === 'morning' || !ctx.openToday.length) {
      const lines = added.map((t, i) => `${i + 1}. ${t.priority === 1 ? '❗️' : ''}${t.title}`)
      await sendAdminAlert(`☀️ План на ${shortDate(ctx.today)}\n\n${brief}\n\n${lines.join('\n')}\n\n${PLAN_URL}`)
    } else if (urgent.length) {
      await sendAdminAlert(`📌 Новое срочное:\n${urgent.map(t => `• ${t.title}`).join('\n')}\n\n${PLAN_URL}`)
    }
  }
  return { brief, added: added.length }
}

// ─── Итог дня ──────────────────────────────────────────────────────────

const REVIEW_SYSTEM = `Ты — личный секретарь Андрея (агенты, застройщики, сделки на Бали; квест — заработать и улететь в Гоа 14 декабря). Вечером ты подводишь итог дня.

Тебе дают оценку дня 0–100 с разбивкой, задачи дня (сделано и нет), шаги из переписки и сводку.

Верни JSON: {"review": "..."}

review — 3–4 коротких предложения по-русски, прямо и по делу, как хороший ассистент:
1) что сегодня реально сдвинулось (с именами и цифрами);
2) что провалено или отложено и чем это грозит плану;
3) главный фокус на завтра — одно действие.
Без похвалы ради похвалы и без мотивационных фраз. Не выдумывай фактов.`

export async function reviewDay(opts: { notify?: boolean } = {}): Promise<{ score: number; review: string }> {
  const ctx = await buildContext()
  const [msgs, { done, off }, steps, aiTasks] = await Promise.all([recentMessages(), loadDoneTasks(), loadPlanSteps(), loadAiTasks(ctx.today)])
  const auto = autoProgress(ALL_TASKS, steps)
  const eff = new Set(done)
  for (const [id, p] of auto) if (p.done && !off.includes(id)) eff.add(id)
  const [s] = scoreDays({ days: [ctx.today], tasks: ALL_TASKS, done: eff, steps, aiTasks, replies: await repliesByDay(msgs) })

  const parts = [
    `Оценка дня: ${s.score}/100.`,
    s.plan ? `План квеста: ${s.plan.done} из ${s.plan.total}.` : 'План квеста на сегодня пуст.',
    s.ai ? `Задачи секретаря: ${s.ai.done} из ${s.ai.total}.` : '',
    `Результат по переписке: ${s.result.points} очков из нормы ${s.result.target} (${s.result.steps} шагов).`,
    s.replies ? `Ответы: в ${s.replies.answered} из ${s.replies.total} чатов, где писали.` : '',
    '',
    'ЗАДАЧИ СЕКРЕТАРЯ:',
    aiTasks.filter(t => t.day === ctx.today && t.status !== 'dropped').map(t => `- [${t.status === 'done' ? 'сделано' : 'НЕ сделано'}] ${t.title}`).join('\n') || '- не ставились',
    '',
    ctx.text,
  ].join('\n')

  const { json } = await callModel(REVIEW_SYSTEM, parts)
  const review = typeof json.review === 'string' ? json.review.trim().slice(0, 900) : ''
  const now = new Date().toISOString()
  const { error } = await sb.from('plan_days').upsert({ day: ctx.today, review: review || null, score: s.score, review_at: now, updated_at: now })
  if (error) throw new Error(error.message)

  if (opts.notify !== false) {
    await sendAdminAlert(`🌙 Итог ${shortDate(ctx.today)}: ${s.score}/100\n\n${review}\n\n${PLAN_URL}`)
  }
  return { score: s.score, review }
}

// ─── Расписание ────────────────────────────────────────────────────────

/**
 * Что секретарю делать в этот час (зовётся ежечасным кроном). Каждое
 * действие делается один раз: утро — если плана на сегодня ещё нет,
 * пересборка — если последняя была до 13:00 / 17:00, итог — если его нет.
 */
export async function secretaryTick(): Promise<string> {
  const hour = baliHour()
  const today = baliDay(Date.now())
  if (hour < 8) return 'рано'

  const { data: note, error } = await sb.from('plan_days').select('brief_at,review_at').eq('day', today).maybeSingle()
  if (error) throw new Error(error.message)

  if (hour >= 21) {
    if (note?.review_at) return 'итог уже есть'
    await reviewDay()
    return 'итог дня'
  }
  if (!note?.brief_at) {
    await planDay('morning')
    return 'утренний план'
  }
  const briefHour = new Date(Date.parse(note.brief_at) + BALI_OFFSET_MS).getUTCHours()
  if ((hour >= 13 && briefHour < 13) || (hour >= 17 && briefHour < 17)) {
    await planDay('refresh')
    return 'пересборка'
  }
  // Между пересборками — только бесплатное: закрыть задачи по ответам.
  const [msgs, tasks] = await Promise.all([recentMessages(), loadAiTasks(today)])
  const closed = await autoCloseTasks(tasks, msgs)
  return `закрыто по переписке: ${closed.length}`
}

// ─── Черновик по запросу ───────────────────────────────────────────────

const DRAFT_SYSTEM = `Ты — секретарь Андрея. Тебе дают его переписку с одним человеком и, если есть, ЦЕЛЬ Андрея с этим человеком.

Если цель есть: проанализируй переписку — где вы сейчас относительно цели, что человеку важно, что мешает (сомнения, молчание, занятость) — и напиши сообщение, которое делает один следующий шаг к цели. Не прыгай сразу к цели, если до неё несколько шагов: например, для «подписать фикс» без созвона следующий шаг — созвон.
Если цели нет: подними человека на следующую ступень: переписка → созвон → встреча → договорённость.

${OFFER}

${DRAFT_RULES}

Верни JSON: {"draft": "...", "goal": "call|meeting|reply", "why": "..."}
why — одна короткая строка для Андрея: где вы сейчас относительно цели и почему этот шаг (например «созвона не было, без него к фиксу не перейти»).`

/** Черновик для любого чата — по кнопке на дашборде. Один вызов ИИ. */
export async function draftFor(chatId: number): Promise<Draft> {
  const [msgs, steps] = await Promise.all([recentMessages(), loadPlanSteps()])
  const comms = await loadComms(msgs)
  const c = comms.find(x => x.chat_id === chatId)
  if (!c) throw new Error('chat_not_found')
  const { data, error } = await sb.from('tg_messages')
    .select('direction,text,voice_transcript,media_type,ts')
    .eq('chat_id', chatId).order('id', { ascending: false }).limit(25)
  if (error) throw new Error(error.message)
  const lines = (data ?? []).reverse().map(m => {
    const when = new Date(Date.parse(m.ts) + BALI_OFFSET_MS).toISOString().slice(5, 16).replace('T', ' ')
    return `${when} ${m.direction === 'out' ? 'Андрей' : c.name}: ${(m.text || m.voice_transcript || `[${m.media_type ?? 'без текста'}]`).replace(/\s+/g, ' ').slice(0, 600)}`
  })
  const user = [
    `Собеседник: ${c.name}${c.username ? ` (@${c.username})` : ''}, ${c.role ? ROLE_RU[c.role] : 'роль неизвестна'}${c.crm ? `, в CRM: ${c.crm.title}, статус ${c.crm.status}` : ''}.`,
    c.goal ? `ЦЕЛЬ АНДРЕЯ с этим человеком: «${c.goal}».` : 'Цель не задана.',
    `Ступень: ${stageOf(chatId, steps)}.`,
    c.waiting_since ? `Он ждёт ответа с ${ago(c.waiting_since)}.` : `Последним писал Андрей, ${ago(c.last_ts)}.`,
    `Сейчас по Бали: ${new Date(Date.now() + BALI_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ')}.`,
    '',
    'Переписка:',
    lines.join('\n'),
  ].join('\n')
  const { json } = await callModel(DRAFT_SYSTEM, user)
  const text = typeof json.draft === 'string' ? humanize(json.draft).slice(0, 1500) : ''
  if (!text) throw new Error('empty_draft')
  return { text, goal: goalOf(json.goal) ?? 'reply', why: typeof json.why === 'string' ? json.why.trim().slice(0, 200) : '' }
}
