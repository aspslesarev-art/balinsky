// ИИ-выжимка переписки для карточки агента: о чём говорили, чем
// закончилось, что дальше. В базе 150+ диалогов по несколько десятков
// сообщений — глазами их не перечитать, а решение «кому написать
// сегодня» принимается именно по этому.
//
// Провайдер — OpenAI напрямую (тот же ключ и та же модель gpt-5-mini,
// на которой бот-наблюдатель ловит встречи), не Azure: у Azure кредиты
// на исходе, и ставить ежедневный фон на иссякающий пул нельзя.
//
// Деньги. Разбор одного диалога — доли цента, но прогон по всей базе и
// ежедневное обновление обязаны иметь три предохранителя:
//   1. AGENTS_AI_DISABLED=1 — полный стоп без выката кода;
//   2. AGENTS_AI_DAILY_USD_CAP — потолок на сутки, по нему прогон встаёт;
//   3. нет новых сообщений с прошлого разбора — не платим вовсе.
// Каждый вызов попадает в balina_usage и виден в /admin/usage.

import { createClient } from '@supabase/supabase-js'
import { logUsage } from '@/lib/usage-tracker'
import { chatTail } from './store'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const MODEL = process.env.AGENTS_AI_MODEL || 'gpt-5-mini'
const DAILY_CAP_USD = Number(process.env.AGENTS_AI_DAILY_USD_CAP ?? '2')
const TIMEOUT_MS = 60_000

// Сколько сообщений даём модели. 60 — это примерно вся переписка
// среднего агента; на длинных диалогах хвост важнее начала.
const TAIL = 60

const SYSTEM = `Ты помощник риелторского бизнеса на Бали. Тебе дают переписку владельца компании с агентом по недвижимости.

Верни JSON строго вида:
{"summary": "...", "next_step": "..."}

summary — 2–4 коротких предложения по-русски: о чём договаривались, что агент просил или предлагал, чем всё закончилось. Пиши только то, что есть в переписке. Без вступлений вроде «В этой переписке».
next_step — одна строка: что владельцу логично сделать дальше (например «Ответить на вопрос о рассрочке в Pandawa Dream» или «Напомнить о себе, последнее сообщение без ответа 3 недели»). Если следующий шаг из переписки не следует — пустая строка.

Не выдумывай фактов, которых нет в сообщениях. Не давай советов по инвестициям.`

export class AiDisabled extends Error {}
export class AiCapReached extends Error {}

export function aiEnabled(): boolean {
  return process.env.AGENTS_AI_DISABLED !== '1' && !!process.env.OPENAI_API_KEY
}

// Потрачено на этот раздел за сегодня. Считаем по своей фиче, а не по
// всему balina_usage: чат Балины на сайте — отдельный кошелёк со своим
// потолком, и упершийся в него консультант не должен глушить админку.
export async function todayAgentsSpendUsd(): Promise<number> {
  const d = new Date()
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
  const { data, error } = await sb
    .from('balina_usage')
    .select('cost_usd')
    .eq('feature', 'admin-ai')
    .contains('meta', { kind: 'agent-summary' })
    .gte('ts', from)
  if (error) { console.error('[agents-ai] spend read:', error.message); return 0 }
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
}

export type Summary = { summary: string; next_step: string | null; last_message_id: number }

// Разобрать переписку и записать результат в карточку.
// force=false — если новых сообщений с прошлого раза нет, возвращаем null
// и ничего не тратим.
export async function summarizeAgentChat(
  agent: { id: string; name: string; tg_chat_id: number | null; ai_last_message_id: number | null },
  opts: { force?: boolean } = {},
): Promise<Summary | null> {
  if (!aiEnabled()) throw new AiDisabled('ИИ-разбор выключен (AGENTS_AI_DISABLED или нет OPENAI_API_KEY)')
  if (agent.tg_chat_id == null) return null

  const messages = await chatTail(agent.tg_chat_id, TAIL)
  const lastId = messages.at(-1)?.id ?? null
  if (lastId == null) return null
  if (!opts.force && agent.ai_last_message_id != null && lastId <= agent.ai_last_message_id) return null

  if (DAILY_CAP_USD > 0 && (await todayAgentsSpendUsd()) >= DAILY_CAP_USD) {
    throw new AiCapReached(`дневной потолок $${DAILY_CAP_USD} на ИИ-разбор переписок исчерпан`)
  }

  const transcript = messages
    .map(m => {
      const who = m.direction === 'out' ? 'Андрей' : agent.name
      const body = m.text?.trim() || (m.media_type ? `[${m.media_type}]` : '[без текста]')
      const when = new Date(m.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })
      return `${when} ${who}: ${body}`
    })
    .join('\n')
    .slice(-24_000)

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Агент: ${agent.name}\n\nПереписка:\n${transcript}` },
      ],
      response_format: { type: 'json_object' },
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`)

  const payload = await r.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  logUsage({
    feature: 'admin-ai',
    deployment: MODEL,
    promptTokens: payload.usage?.prompt_tokens ?? 0,
    completionTokens: payload.usage?.completion_tokens ?? 0,
    meta: { kind: 'agent-summary', agent_id: agent.id, chat_id: agent.tg_chat_id, provider: 'openai' },
  })

  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw new Error('модель не вернула ответ')
  let parsed: { summary?: unknown; next_step?: unknown }
  try { parsed = JSON.parse(raw) } catch { throw new Error('модель вернула не JSON') }

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  const nextStep = typeof parsed.next_step === 'string' ? parsed.next_step.trim() : ''
  if (!summary) throw new Error('модель вернула пустую выжимку')

  const { error } = await sb.from('agents').update({
    ai_summary: summary,
    ai_next_step: nextStep || null,
    ai_updated_at: new Date().toISOString(),
    ai_last_message_id: lastId,
  }).eq('id', agent.id)
  if (error) throw new Error(error.message)

  return { summary, next_step: nextStep || null, last_message_id: lastId }
}
