import { NextResponse } from 'next/server'
import { hasPlanAccess } from '@/lib/plan/access'
import { setAiTaskStatus } from '@/lib/plan/dashboard'

// Галочка на задаче секретаря. Закрыто той же проверкой, что и /plan.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { id?: unknown; done?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  const id = typeof body.id === 'number' && Number.isInteger(body.id) && body.id > 0 ? body.id : null
  const done = typeof body.done === 'boolean' ? body.done : null
  if (id === null || done === null) return NextResponse.json({ ok: false, error: 'bad_task' }, { status: 400 })

  try {
    await setAiTaskStatus(id, done)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
  }
}
