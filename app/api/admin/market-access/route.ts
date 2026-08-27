import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { grantMarketAccess, revokeMarketAccess } from '@/lib/market/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Список доступа к закрытому отчёту /rynok: выдать по @нику или id, отозвать по строке.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })

  const body = (await req.json().catch(() => null)) as
    | { handle?: string; note?: string; revokeId?: number }
    | null

  if (typeof body?.revokeId === 'number') {
    const res = await revokeMarketAccess(body.revokeId)
    return NextResponse.json(res, { status: res.ok ? 200 : 500 })
  }

  if (typeof body?.handle !== 'string') {
    return NextResponse.json({ ok: false, error: 'нужен handle' }, { status: 400 })
  }

  const res = await grantMarketAccess(body.handle, typeof body.note === 'string' ? body.note : null)
  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
