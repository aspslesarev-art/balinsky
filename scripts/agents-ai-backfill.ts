// Разовый прогон ИИ-выжимок по всем карточкам агентов с привязанной
// перепиской. Дальше их поддерживает ночной крон /api/cron/agents-summary.
//
//   npx tsx --env-file=.env.local scripts/agents-ai-backfill.ts --dry
//   npx tsx --env-file=.env.local scripts/agents-ai-backfill.ts
//   npx tsx --env-file=.env.local scripts/agents-ai-backfill.ts --limit 10
//
// Платный. --dry ничего не тратит: показывает, сколько карточек попадёт
// в прогон и во сколько это примерно обойдётся. Прогон останавливается
// сам, упершись в дневной потолок AGENTS_AI_DAILY_USD_CAP.

import { createClient } from '@supabase/supabase-js'
import { AiCapReached, AiDisabled, aiEnabled, summarizeAgentChat, todayAgentsSpendUsd } from '../lib/agents/ai'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const dry = process.argv.includes('--dry')
const force = process.argv.includes('--force')
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 1000

// Оценка «на глаз» для --dry: диалог из 60 сообщений — примерно 4 тыс.
// токенов на вход и 150 на выход при цене gpt-5-mini $0.25/$2 за млн.
const EST_USD_PER_CHAT = (4000 / 1e6) * 0.25 + (150 / 1e6) * 2

async function main() {
  if (!aiEnabled()) {
    console.error('ИИ-разбор выключен: снимите AGENTS_AI_DISABLED и проверьте OPENAI_API_KEY')
    process.exit(1)
  }

  const { data, error } = await sb
    .from('agents')
    .select('id,name,tg_chat_id,ai_last_message_id,ai_updated_at')
    .eq('archived', false)
    .not('tg_chat_id', 'is', null)
    .order('ai_updated_at', { ascending: true, nullsFirst: true })
    .limit(limit)
  if (error) { console.error('Не читается таблица agents:', error.message); process.exit(1) }

  const rows = data ?? []
  const fresh = rows.filter(r => !r.ai_updated_at)
  console.log(`Карточек с перепиской: ${rows.length} (ни разу не разбирали: ${fresh.length})`)

  if (dry) {
    const n = force ? rows.length : fresh.length
    console.log(`[проверка] к разбору ${n} шт., это примерно $${(n * EST_USD_PER_CHAT).toFixed(2)}`)
    return
  }

  let done = 0, skipped = 0, failed = 0
  for (const a of rows) {
    try {
      const res = await summarizeAgentChat(a as never, { force })
      if (res) { done++; console.log(`✓ ${a.name}: ${res.summary.slice(0, 90)}…`) }
      else skipped++
    } catch (e) {
      if (e instanceof AiCapReached) { console.warn(`Стоп: ${e.message}`); break }
      if (e instanceof AiDisabled) { console.warn('Стоп: ИИ-разбор выключен'); break }
      failed++
      console.error(`× ${a.name}:`, e instanceof Error ? e.message : e)
    }
  }

  const spent = await todayAgentsSpendUsd()
  console.log(`\nРазобрано ${done}, без изменений ${skipped}, ошибок ${failed}. Потрачено сегодня $${spent.toFixed(4)}`)
}

main()
