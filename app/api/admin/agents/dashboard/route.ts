import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { touchStats } from '@/lib/agents/stats'
import { TOUCH_PERIODS } from '@/lib/agents/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Касания по агентам за период. Период — только из разрешённого списка:
// «?days=3650» вычитало бы всю переписку разом.
export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const raw = Number(new URL(req.url).searchParams.get('days') ?? 1)
  const days = TOUCH_PERIODS.some(p => p.days === raw) ? raw : 1
  try {
    return NextResponse.json({ ok: true, stats: await touchStats(days) })
  } catch (e) {
    console.error('[agents] dashboard', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}
