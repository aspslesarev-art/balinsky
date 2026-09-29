// Галочки квартального плана в Supabase. Таблица — migrations/081_plan_tasks.sql.
// Сам план (недели, дни, задачи, суммы) лежит в коде: lib/plan/data.ts.

import { createClient } from '@supabase/supabase-js'
import { PEOPLE_PREFIX } from './people'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const BALI_OFFSET_MS = 8 * 3600_000

/**
 * Отмеченные задачи и дни, в которые что-то отмечалось (по Бали).
 * Дни нужны для серии: сколько суток подряд закрывалась хотя бы одна
 * задача. Точность приблизительная — снятая и заново поставленная
 * галочка сдвигает свою дату, но для счётчика серии этого достаточно.
 */
export async function loadDoneTasks(): Promise<{ done: string[]; days: string[]; off: string[]; people: string[] }> {
  const { data: raw, error } = await sb.from('plan_tasks').select('task_id, done, auto_off, updated_at')
  if (error) throw new Error(`plan_tasks read failed: ${error.message}`)
  // Галочки по людям живут в той же таблице, но в план, опыт и серию
  // не идут — это отдельный список договорённостей.
  const isPeople = (r: { task_id: unknown }) => String(r.task_id).startsWith(PEOPLE_PREFIX)
  const people = (raw ?? []).filter(r => isPeople(r) && r.done === true).map(r => r.task_id as string)
  const all = (raw ?? []).filter(r => !isPeople(r))
  const rows = all.filter(r => r.done === true)
  // Снятые руками задачи, которые иначе закрыла бы переписка.
  const off = all.filter(r => r.auto_off === true).map(r => r.task_id as string)
  const days = new Set<string>()
  for (const r of rows) {
    const ts = Date.parse(r.updated_at as string)
    if (!Number.isNaN(ts)) days.add(new Date(ts + BALI_OFFSET_MS).toISOString().slice(0, 10))
  }
  return {
    done: rows.map(r => r.task_id as string),
    days: [...days].sort(),
    off,
    people,
  }
}

/**
 * autoOff — галочку сняли с задачи, которую закрыла переписка: подсчёт
 * больше её не ставит, пока владелец не отметит задачу снова.
 */
export async function setTaskDone(taskId: string, done: boolean, autoOff = false): Promise<void> {
  const { error } = await sb
    .from('plan_tasks')
    .upsert({ task_id: taskId, done, auto_off: !done && autoOff, updated_at: new Date().toISOString() })
  if (error) throw new Error(`plan_tasks write failed: ${error.message}`)
}
