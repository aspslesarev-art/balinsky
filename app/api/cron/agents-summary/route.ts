// Ночное обновление ИИ-выжимок по карточкам агентов.
//
// Платит только за то, что изменилось: summarizeAgentChat сам пропускает
// карточку, если с прошлого разбора в чате не появилось новых сообщений.
// Поэтому обычная ночь — это несколько диалогов, а не полторы сотни.
//
// Предохранители: AGENTS_AI_DISABLED=1 гасит всё; дневной потолок
// AGENTS_AI_DAILY_USD_CAP останавливает прогон на полпути (останок
// доберётся следующей ночью); MAX_PER_RUN не даёт одному запуску
// растянуться дольше лимита функции.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AiCapReached, AiDisabled, aiEnabled, summarizeAgentChat, todayAgentsSpendUsd } from '@/lib/agents/ai'
import { autoLinkChatsByNick } from '@/lib/agents/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_PER_RUN = Number(process.env.AGENTS_AI_MAX_PER_RUN ?? '40')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

function authOk(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return req.headers.get('authorization') === `Bearer ${expected}`
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  // Привязка по нику идёт до проверки ИИ: она бесплатная и нужна, даже
  // когда разбор выключен.
  const autoLinked = await autoLinkChatsByNick()
  if (!aiEnabled()) return NextResponse.json({ ok: true, autoLinked, skipped: 'ai_disabled' })

  const { data, error } = await sb
    .from('agents')
    .select('id,name,tg_chat_id,ai_last_message_id')
    .eq('archived', false)
    .not('tg_chat_id', 'is', null)
    // Сначала те, кого ни разу не разбирали, потом давно не обновлённые.
    .order('ai_updated_at', { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN)
  if (error) {
    console.error('[agents-cron] list failed:', error.message)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }

  let updated = 0, skipped = 0, failed = 0
  let stoppedByCap = false

  for (const a of data ?? []) {
    try {
      const res = await summarizeAgentChat(a as never)
      if (res) updated++; else skipped++
    } catch (e) {
      if (e instanceof AiCapReached) { stoppedByCap = true; break }
      if (e instanceof AiDisabled) break
      failed++
      console.error('[agents-cron] summary failed:', a.name, e instanceof Error ? e.message : e)
    }
  }

  const spent = await todayAgentsSpendUsd()
  console.log(`[agents-cron] привязано по нику ${autoLinked}, обновлено ${updated}, без изменений ${skipped}, ошибок ${failed}, потрачено сегодня $${spent.toFixed(4)}${stoppedByCap ? ' (остановлено потолком)' : ''}`)
  return NextResponse.json({ ok: true, autoLinked, updated, skipped, failed, stoppedByCap, spentTodayUsd: Number(spent.toFixed(4)) })
}
