import { NextResponse } from 'next/server'
import { isKnownTask } from '@/lib/plan/data'
import { hasPlanAccess } from '@/lib/plan/access'
import { loadDoneTasks, setTaskDone } from '@/lib/plan/store'
import { baliDay, loadPlanSteps } from '@/lib/plan/steps'
import { autoProgress } from '@/lib/plan/auto'
import { ALL_TASKS } from '@/lib/plan/data'
import { scoreDays } from '@/lib/plan/score'
import { EVENT, loadGuests } from '@/lib/plan/event'
import {
  autoCloseTasks, countAiDone, loadAiTasks, loadComms, loadDayNotes, loadUpcoming, recentMessages, repliesByDay,
} from '@/lib/plan/dashboard'

/** Сколько дней истории показывает блок «Эффективность». */
const HISTORY_DAYS = 14

// Состояние галочек личного плана. Оба метода закрыты той же проверкой,
// что и страница /plan, — доступ у владельца плана и больше ни у кого.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await hasPlanAccess())) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    // Шаги из переписки: по ним экран сам закрывает задачи с правилом.
    const now = Date.now()
    const from = baliDay(now - (HISTORY_DAYS - 1) * 86_400_000)
    const [{ done, days, off }, steps, msgs, aiTasks, notes, upcoming] = await Promise.all([
      loadDoneTasks(), loadPlanSteps(), recentMessages(), loadAiTasks(from), loadDayNotes(from), loadUpcoming(),
    ])
    // Задачи «ответить человеку» закрываются по переписке при каждом заходе,
    // не дожидаясь часового крона.
    await autoCloseTasks(aiTasks, msgs)
    const [comms, replies, aiDone, guests] = await Promise.all([loadComms(msgs), repliesByDay(msgs), countAiDone(), loadGuests()])

    const eff = new Set(done)
    for (const [id, p] of autoProgress(ALL_TASKS, steps)) if (p.done && !off.includes(id)) eff.add(id)
    const history = Array.from({ length: HISTORY_DAYS }, (_, i) => baliDay(now - (HISTORY_DAYS - 1 - i) * 86_400_000))
      .filter(d => d >= '2026-09-15')
    const scores = scoreDays({ days: history, tasks: ALL_TASKS, done: eff, steps, aiTasks, replies })

    return NextResponse.json({ ok: true, done, days, off, steps, aiTasks, aiDone, notes, upcoming, comms, scores, event: { info: EVENT, guests } })
  } catch (e) {
    console.error('[plan-state]', e instanceof Error ? e.message : e)
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
