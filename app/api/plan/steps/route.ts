import { NextResponse } from 'next/server'
import { hasPlanAccess } from '@/lib/plan/access'
import { setStepRejected } from '@/lib/plan/steps'

// «Не засчитывать» шаг, который ИИ или правило нашли в переписке, и
// вернуть его обратно. Закрыто той же проверкой, что и /plan.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { id?: unknown; rejected?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  const id = typeof body.id === 'number' && Number.isInteger(body.id) && body.id > 0 ? body.id : null
  const rejected = typeof body.rejected === 'boolean' ? body.rejected : null
  if (id === null || rejected === null) return NextResponse.json({ ok: false, error: 'bad_step' }, { status: 400 })

  try {
    await setStepRejected(id, rejected)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
  }
}
