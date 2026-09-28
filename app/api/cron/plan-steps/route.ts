// Раз в час днём по Бали: переписка → шаги плана → воронка агентов и
// застройщиков → сводка владельцу в Telegram. Подробности и
// предохранители трат — в lib/plan/steps.ts.

import { NextResponse } from 'next/server'
import { runPlanScan } from '@/lib/plan/steps'

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
    return NextResponse.json({ ok: true, ...res })
  } catch (e) {
    console.error('[plan-steps] run failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'run_failed' }, { status: 500 })
  }
}
