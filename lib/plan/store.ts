// Галочки квартального плана в Supabase. Таблица — migrations/081_plan_tasks.sql.
// Сам план (недели, дни, задачи, суммы) лежит в коде: lib/plan/data.ts.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const BALI_OFFSET_MS = 8 * 3600_000

/**
 * Отмеченные задачи и дни, в которые что-то отмечалось (по Бали).
 * Дни нужны для серии: сколько суток подряд закрывалась хотя бы одна
 * задача. Точность приблизительная — снятая и заново поставленная
 * галочка сдвигает свою дату, но для счётчика серии этого достаточно.
 */
export async function loadDoneTasks(): Promise<{ done: string[]; days: string[] }> {
  const { data, error } = await sb.from('plan_tasks').select('task_id, updated_at').eq('done', true)
  if (error) throw new Error(`plan_tasks read failed: ${error.message}`)
  const rows = data ?? []
  const days = new Set<string>()
  for (const r of rows) {
    const ts = Date.parse(r.updated_at as string)
    if (!Number.isNaN(ts)) days.add(new Date(ts + BALI_OFFSET_MS).toISOString().slice(0, 10))
  }
  return {
    done: rows.map(r => r.task_id as string),
    days: [...days].sort(),
  }
}

export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  const { error } = await sb
    .from('plan_tasks')
    .upsert({ task_id: taskId, done, updated_at: new Date().toISOString() })
  if (error) throw new Error(`plan_tasks write failed: ${error.message}`)
}
