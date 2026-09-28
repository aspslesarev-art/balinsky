// Раз в час днём по Бали: переписка → шаги плана → воронка агентов и
// застройщиков → сводка владельцу в Telegram; затем секретарь (утренний
// план, пересборка, итог дня). Подробности и предохранители трат — в
// lib/plan/steps.ts и lib/plan/secretary.ts.

import { NextResponse } from 'next/server'
import { runPlanScan } from '@/lib/plan/steps'
import { secretaryTick } from '@/lib/plan/secretary'
import { scanEvent } from '@/lib/plan/event'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authOk(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return req.headers.get('authorization') === `Bearer ${expected}`
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  try {
    const res = await runPlanScan()
    console.log('[plan-steps]', JSON.stringify(res))
    // Гости мероприятия — до секретаря: он тоже смотрит, кто придёт.
    let event: unknown
    try {
      event = await scanEvent()
    } catch (e) {
      event = `ошибка: ${e instanceof Error ? e.message : String(e)}`
      console.error('[plan-event]', event)
    }
    // Секретарь после разбора: ему нужны свежие шаги. Его сбой не должен
    // прятать отчёт разбора.
    let secretary: string
    try {
      secretary = await secretaryTick()
    } catch (e) {
      secretary = `ошибка: ${e instanceof Error ? e.message : String(e)}`
      console.error('[plan-secretary]', secretary)
    }
    return NextResponse.json({ ok: true, ...res, event, secretary })
  } catch (e) {
    console.error('[plan-steps] run failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'run_failed' }, { status: 500 })
  }
}
