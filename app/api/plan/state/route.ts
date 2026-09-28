import { NextResponse } from 'next/server'
import { isKnownTask } from '@/lib/plan/data'
import { hasPlanAccess } from '@/lib/plan/access'
import { loadDoneTasks, setTaskDone } from '@/lib/plan/store'
import { loadPlanSteps } from '@/lib/plan/steps'

// Состояние галочек личного плана. Оба метода закрыты той же проверкой,
// что и страница /plan, — доступ у владельца плана и больше ни у кого.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    // Шаги из переписки: по ним экран сам закрывает задачи с правилом.
    const [{ done, days, off }, steps] = await Promise.all([loadDoneTasks(), loadPlanSteps()])
    return NextResponse.json({ ok: true, done, days, off, steps })
  } catch {
    return NextResponse.json({ ok: false, error: 'read_failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { task_id?: unknown; done?: unknown; auto_off?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  const taskId = typeof body.task_id === 'string' ? body.task_id : null
  const done = typeof body.done === 'boolean' ? body.done : null
  // Чужие id в базу не пускаем: писать можно только по задачам из плана.
  if (!taskId || done === null || !isKnownTask(taskId)) {
    return NextResponse.json({ ok: false, error: 'bad_task' }, { status: 400 })
  }

  try {
    await setTaskDone(taskId, done, body.auto_off === true)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
  }
}
