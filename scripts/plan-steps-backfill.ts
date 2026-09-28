// Разовый добор шагов плана из переписки с начала квеста (15 сентября).
//
//   npx tsx --env-file=.env.local scripts/plan-steps-backfill.ts --dry [чатов=5]
//     — показать, что ИИ нашёл бы в самых активных чатах, ничего не записывая;
//   npx tsx --env-file=.env.local scripts/plan-steps-backfill.ts --cap=0.5
//     — записать всё, с потолком трат на этот прогон ($0.5 по умолчанию).
//
// Ночной и часовой режим — /api/cron/plan-steps, здесь только история.

import { createClient } from '@supabase/supabase-js'
import { PLAN_START_TS, askModel, contactName, line, runPlanScan, MSG_COLS, type Msg } from '../lib/plan/steps'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const capArg = args.find(a => a.startsWith('--cap='))
const cap = capArg ? Number(capArg.slice(6)) : 0.5

async function dryRun(limit: number) {
  const { data, error } = await sb.from('tg_messages').select('chat_id').gte('ts', PLAN_START_TS).limit(5000)
  if (error) throw new Error(error.message)
  const counts = new Map<number, number>()
  for (const r of data ?? []) counts.set(r.chat_id, (counts.get(r.chat_id) ?? 0) + 1)
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit)
  let spent = 0
  for (const [chatId] of top) {
    const { data: msgs } = await sb.from('tg_messages').select(MSG_COLS).eq('chat_id', chatId)
      .gte('ts', PLAN_START_TS).order('id', { ascending: true }).limit(80)
    const batch = (msgs ?? []) as unknown as Msg[]
    const contact = batch.at(-1)?.contact ?? null
    const res = await askModel(batch.map(m => line(m, contactName(contact))).join('\n'), `Собеседник: ${contact}`)
    spent += res.cost
    console.log(`\n=== ${contact} · ${batch.length} сообщ. · роль ${res.role}`)
    const byId = new Map(batch.map(m => [m.id, m]))
    for (const s of res.steps) {
      const m = byId.get(s.id)
      console.log(`  ${s.kind.padEnd(13)} ${s.note}  ←  ${(m?.text ?? m?.voice_transcript ?? '[?]').slice(0, 110).replace(/\n/g, ' ')}`)
    }
  }
  console.log(`\nпотрачено $${spent.toFixed(4)}`)
}

async function main() {
  if (dry) {
    const n = Number(args.find(a => /^\d+$/.test(a)) ?? '5')
    await dryRun(n)
    return
  }
  const res = await runPlanScan({ lookbackDays: 60, capUsd: cap, maxCalls: 400, notify: false })
  console.log(JSON.stringify(res, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
