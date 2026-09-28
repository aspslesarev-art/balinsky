import { NextResponse } from 'next/server'
import { hasPlanAccess } from '@/lib/plan/access'
import { SecretaryCapReached, planDay } from '@/lib/plan/secretary'

// «Пересобрать план» по кнопке: секретарь заново смотрит переписку и
// план и обновляет задачи на сегодня. Один вызов ИИ, под общим потолком.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST() {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    const res = await planDay('refresh', { notify: false })
    return NextResponse.json({ ok: true, ...res })
  } catch (e) {
    if (e instanceof SecretaryCapReached) return NextResponse.json({ ok: false, error: 'cap' }, { status: 429 })
    console.error('[plan-secretary] manual refresh:', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
