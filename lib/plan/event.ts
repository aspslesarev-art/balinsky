// Гости мероприятия по переписке. Андрей приглашает агентов лично в
// Telegram — ИИ читает каждый такой чат после приглашения и ставит
// статус: пригласили / интересно / придёт / не сможет. Владелец может
// поправить статус руками — такой ИИ больше не трогает.
//
// Каждый чат перечитывается, только когда в нём появились новые
// сообщения (last_message_id). Деньги — общий потолок плана
// (PLAN_AI_DAILY_USD_CAP, steps.ts).

import { createClient } from '@supabase/supabase-js'
import { logUsage } from '@/lib/usage-tracker'
import { DAILY_CAP_USD, PLAN_START_TS, baliDay, contactName, loadRoles, planAiEnabled, todayPlanSpendUsd } from './steps'
import type { EventGuest, EventInfo, GuestStatus } from './dash-types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const MODEL = process.env.PLAN_AI_MODEL || 'gpt-5-mini'
const BALI_OFFSET_MS = 8 * 3600_000

/** Текущее мероприятие. Следующее — новая запись здесь с новым key. */
export const EVENT: EventInfo = {
  key: '2026-10-02-breig',
  title: 'Встреча агентов на вилле Брейга',
  date: '2026-10-02',
  time: '15:30',
  place: 'Переренан, Аквамарин 3',
  // Организаторы и помощники — не гости: Никита Брейг (вилла и спонсор),
  // Елена Данилюк (ассистент).
  hosts: [740013954, 1354493667],
}

/**
 * Сообщения Андрея, по которым чат считается кандидатом в гости. Широко
 * намеренно: лишний чат ИИ отсеет (invited=false), пропущенный — нет.
 */
const INVITE_RE = /2 октября|02\.10|\b2\.10\b|брейг|переренан|аквамарин|встреч\S* (крутых|продающих|агентов|для агентов)|собираю (агентов|брокеров|сильных)|строго по списк|альянс|в пятницу собираемся|тусовк\S* агентов|6 сделок/i

const SYSTEM = `Ты помогаешь Андрею собрать гостей на мероприятие: ${EVENT.title}, ${EVENT.date} (пятница) в ${EVENT.time}, ${EVENT.place}. Это закрытая встреча продающих агентов недвижимости: сбор, съёмка на вилле с оператором и дроном, круглый стол, барбекю.

Тебе дают переписку Андрея с одним человеком. Реши, приглашён ли человек на ЭТО мероприятие и что он ответил.

Верни JSON:
{"invited": true, "status": "invited|interested|yes|no", "plus_ones": 0, "note": "...", "quote": "..."}

invited — Андрей пригласил человека на эту встречу (лично, прислал программу, спросил «записать тебя?»). Приглашение на другие встречи, вебинары, кофе — не считается. Если человек — организатор или спонсор (например, владелец виллы), либо ассистент Андрея — invited=false.
status:
- yes — человек явно подтвердил, что придёт («внеси в список», «буду», «приму участие», «ок» в ответ на приглашение, «по плану» на напоминание);
- no — явно не сможет: сейчас не на Бали или за границей («на Кипре», «не на острове», «прилечу 7-го»), визаран, отпуск на эти даты, «не поеду», «не хочу»;
- interested — отвечает с интересом, задаёт вопросы, но «приду» не сказал;
- invited — пригласили, по сути не ответил.
plus_ones — сколько людей человек приводит с собой (например «можно с Антоном?» и Андрей согласился — 1).
note — 3–8 слов для Андрея: что сейчас с этим человеком («подтвердила, съёмка не нужна», «в Москве до 7 октября», «спрашивал программу, не ответил»).
quote — дословная ключевая фраза человека (до 120 знаков) или пусто.
Не выдумывай. Сомневаешься между yes и interested — ставь interested.`

type Raw = { invited?: unknown; status?: unknown; plus_ones?: unknown; note?: unknown; quote?: unknown }

function isStatus(v: unknown): v is GuestStatus {
  return v === 'invited' || v === 'interested' || v === 'yes' || v === 'no'
}

async function classify(transcript: string, who: string): Promise<{ raw: Raw; cost: number }> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'low',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `Собеседник: ${who}\n\nПереписка:\n${transcript}` }],
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const payload = await r.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
  const pt = payload.usage?.prompt_tokens ?? 0
  const ct = payload.usage?.completion_tokens ?? 0
  logUsage({ feature: 'admin-ai', deployment: MODEL, promptTokens: pt, completionTokens: ct, meta: { kind: 'plan-steps', sub: 'event', provider: 'openai' } })
  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw new Error('модель не вернула ответ')
  try { return { raw: JSON.parse(raw) as Raw, cost: (pt / 1e6) * 0.25 + (ct / 1e6) * 2 } } catch { throw new Error('модель вернула не JSON') }
}

type Msg = { id: number; chat_id: number; direction: 'in' | 'out'; text: string | null; voice_transcript: string | null; media_type: string | null; contact: string | null; ts: string }

export type EventScan = { candidates: number; checked: number; spentUsd: number; stoppedByCap: boolean; failed: number }

/**
 * Разобрать чаты-кандидаты, где с прошлого раза появились сообщения.
 * capUsd — сколько можно потратить в этот запуск (по умолчанию остаток суток).
 */
export async function scanEvent(opts: { capUsd?: number } = {}): Promise<EventScan> {
  const report: EventScan = { candidates: 0, checked: 0, spentUsd: 0, stoppedByCap: false, failed: 0 }
  // После мероприятия список заморожен.
  if (baliDay(Date.now()) > EVENT.date || !planAiEnabled()) return report

  const msgs: Msg[] = []
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await sb.from('tg_messages')
      .select('id,chat_id,direction,text,voice_transcript,media_type,contact,ts')
      .gte('ts', PLAN_START_TS).order('id', { ascending: true }).range(from, from + 999)
    if (error) throw new Error(`tg_messages read: ${error.message}`)
    msgs.push(...(data ?? []) as Msg[])
    if (!data || data.length < 1000) break
  }
  const roles = await loadRoles()
  const byChat = new Map<number, Msg[]>()
  for (const m of msgs) {
    const list = byChat.get(m.chat_id)
    if (list) list.push(m); else byChat.set(m.chat_id, [m])
  }

  const { data: existing, error: ee } = await sb.from('plan_event_guests')
    .select('chat_id,manual,last_message_id').eq('event_key', EVENT.key)
  if (ee) throw new Error(`plan_event_guests read: ${ee.message}`)
  const known = new Map((existing ?? []).map(g => [Number(g.chat_id), g]))

  let left = opts.capUsd ?? Math.max(0, DAILY_CAP_USD - await todayPlanSpendUsd())

  for (const [chatId, list] of byChat) {
    if (roles.get(chatId) === 'other' || EVENT.hosts.includes(chatId)) continue
    const firstInvite = list.findIndex(m => m.direction === 'out' && INVITE_RE.test(m.text || m.voice_transcript || ''))
    if (firstInvite < 0) continue
    report.candidates++
    const last = list.at(-1)!
    const cur = known.get(chatId)
    if (cur?.manual || (cur?.last_message_id != null && Number(cur.last_message_id) >= last.id)) continue
    if (left <= 0) { report.stoppedByCap = true; break }

    // Немного контекста до приглашения и всё, что после.
    const slice = list.slice(Math.max(0, firstInvite - 4)).slice(-60)
    const contact = [...list].reverse().find(m => m.contact)?.contact ?? null
    const name = contactName(contact)
    const transcript = slice.map(m => {
      const when = new Date(Date.parse(m.ts) + BALI_OFFSET_MS).toISOString().slice(5, 16).replace('T', ' ')
      return `${when} ${m.direction === 'out' ? 'Андрей' : name}: ${(m.text || m.voice_transcript || `[${m.media_type ?? 'без текста'}]`).replace(/\s+/g, ' ').slice(0, 700)}`
    }).join('\n')

    try {
      const { raw, cost } = await classify(transcript, contact ?? name)
      report.checked++
      report.spentUsd += cost
      left -= cost
      const row = {
        event_key: EVENT.key, chat_id: chatId, contact,
        status: isStatus(raw.status) ? raw.status : 'invited',
        plus_ones: Math.max(0, Math.min(5, Number(raw.plus_ones) || 0)),
        note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 120) || null : null,
        quote: typeof raw.quote === 'string' ? raw.quote.trim().slice(0, 160) || null : null,
        last_message_id: last.id, updated_at: new Date().toISOString(),
      }
      if (raw.invited === false) {
        // Не гость (организатор, чужая встреча) — запоминаем, что чат
        // разобран, но в список не выводим.
        if (cur) {
          const { error } = await sb.from('plan_event_guests').delete().eq('event_key', EVENT.key).eq('chat_id', chatId)
          if (error) throw new Error(error.message)
        }
        continue
      }
      const { error } = await sb.from('plan_event_guests').upsert(row)
      if (error) throw new Error(`plan_event_guests write: ${error.message}`)
    } catch (e) {
      report.failed++
      console.error('[plan-event] classify failed:', chatId, e instanceof Error ? e.message : e)
    }
  }
  return report
}

export async function loadGuests(): Promise<EventGuest[]> {
  const { data, error } = await sb.from('plan_event_guests')
    .select('chat_id,contact,status,plus_ones,note,quote,manual,updated_at')
    .eq('event_key', EVENT.key)
  if (error) throw new Error(`plan_event_guests read: ${error.message}`)
  return (data ?? []).filter(g => !EVENT.hosts.includes(Number(g.chat_id))).map(g => ({
    ...g,
    chat_id: Number(g.chat_id),
    name: contactName(g.contact),
    username: /\(@([^)]+)\)/.exec(g.contact ?? '')?.[1] ?? null,
  })) as EventGuest[]
}

/** Владелец поправил статус руками — ИИ его больше не перезаписывает. */
export async function setGuestStatus(chatId: number, status: GuestStatus): Promise<void> {
  const { error } = await sb.from('plan_event_guests')
    .update({ status, manual: true, updated_at: new Date().toISOString() })
    .eq('event_key', EVENT.key).eq('chat_id', chatId)
  if (error) throw new Error(`plan_event_guests write: ${error.message}`)
}
