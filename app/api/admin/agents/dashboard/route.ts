import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { touchStats } from '@/lib/agents/stats'
import { TOUCH_PERIODS, type TouchPeriodKey } from '@/lib/agents/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Отчёт по работе с агентами за период. Период — только из разрешённого списка.
export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const raw = new URL(req.url).searchParams.get('p')
  const period: TouchPeriodKey = TOUCH_PERIODS.find(p => p.key === raw)?.key ?? 'today'
  try {
    return NextResponse.json({ ok: true, stats: await touchStats(period) })
  } catch (e) {
    console.error('[agents] dashboard', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}
