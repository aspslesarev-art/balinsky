import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { grantByContact, setPro } from '@/lib/pro-access'

// Решения по доступу Pro из /admin/pro: переключатель у человека
// ({ id, status }) или «Дать Pro» по почте / @telegram ({ contact }).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: 'Нет доступа' }, { status: 401 })
  let body: { id?: unknown; status?: unknown; contact?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Некорректный запрос' }, { status: 400 }) }

  if (typeof body.contact === 'string') {
    const r = await grantByContact(body.contact.slice(0, 254))
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  }
  const id = Number(body.id)
  const status = body.status
  if (!Number.isSafeInteger(id) || (status !== 'granted' && status !== 'denied' && status !== 'pending')) {
    return NextResponse.json({ ok: false, error: 'Некорректный запрос' }, { status: 400 })
  }
  try {
    const user = await setPro(id, status)
    return user ? NextResponse.json({ ok: true, user }) : NextResponse.json({ ok: false, error: 'Человек не найден' }, { status: 404 })
  } catch (e) {
    console.error('[admin/pro]', (e as Error).message)
    return NextResponse.json({ ok: false, error: 'Не получилось сохранить' }, { status: 500 })
  }
}
