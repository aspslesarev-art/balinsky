// Галочки квартального плана в Supabase. Таблица — migrations/081_plan_tasks.sql.
// Сам план (недели, дни, задачи, суммы) лежит в коде: lib/plan/data.ts.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

/** id всех отмеченных задач. Неотмеченные в базе не хранятся как false — они просто не возвращаются. */
export async function loadDoneTasks(): Promise<string[]> {
  const { data, error } = await sb.from('plan_tasks').select('task_id').eq('done', true)
  if (error) throw new Error(`plan_tasks read failed: ${error.message}`)
  return (data ?? []).map(r => r.task_id as string)
}

export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  const { error } = await sb
    .from('plan_tasks')
    .upsert({ task_id: taskId, done, updated_at: new Date().toISOString() })
  if (error) throw new Error(`plan_tasks write failed: ${error.message}`)
}
