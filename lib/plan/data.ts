// Квартальный план — единственный источник самого плана.
// Правки плана делаются здесь, в коде: добавить неделю, день, задачу
// или поменять сумму. В базе (public.plan_tasks) лежат только галочки,
// привязанные к `id` задачи — поэтому id менять нельзя, иначе отметка
// «отвалится» от задачи. Удалить задачу можно свободно: её строка
// в базе просто перестанет читаться.
//
// ВНИМАНИЕ: ниже пока каркас-заглушка. Настоящий план переносится
// один в один из массива DATA в goa-quest.html — меняется только
// содержимое PLAN, весь остальной код трогать не нужно.

export type PlanTask = {
  /** Стабильный id: по нему хранится галочка. */
  id: string
  text: string
  /** Сумма в долларах — попадает в счётчик денег, когда задача отмечена. */
  amount?: number
  /** Задача — закрытая сделка: идёт в счётчик сделок. */
  deal?: boolean
}

export type PlanDay = {
  id: string
  /** Подпись дня: «Пн, 22 сент» или просто «День 1». */
  label: string
  note?: string
  tasks: PlanTask[]
}

export type PlanWeek = {
  id: string
  title: string
  subtitle?: string
  days: PlanDay[]
}

/** До этой даты считаем оставшиеся дни. Бали, UTC+8. */
export const PLAN_DEADLINE = '2026-12-14'

/** Цель квартала в долларах — знаменатель прогресс-бара по деньгам. */
export const PLAN_GOAL_USD = 100_000

export const PLAN: PlanWeek[] = [
  {
    id: 'w1',
    title: 'Неделя 1',
    subtitle: 'Заглушка — заменить на данные из goa-quest.html',
    days: [
      {
        id: 'w1d1',
        label: 'День 1',
        tasks: [
          { id: 'w1d1t1', text: 'Задача с суммой', amount: 5000 },
          { id: 'w1d1t2', text: 'Задача-сделка', amount: 15000, deal: true },
          { id: 'w1d1t3', text: 'Задача без денег' },
        ],
      },
      {
        id: 'w1d2',
        label: 'День 2',
        tasks: [
          { id: 'w1d2t1', text: 'Ещё одна задача' },
          { id: 'w1d2t2', text: 'И ещё одна', amount: 2500 },
        ],
      },
    ],
  },
  {
    id: 'w2',
    title: 'Неделя 2',
    days: [
      {
        id: 'w2d1',
        label: 'День 1',
        tasks: [
          { id: 'w2d1t1', text: 'Задача второй недели', amount: 8000, deal: true },
          { id: 'w2d1t2', text: 'Задача второй недели без суммы' },
        ],
      },
    ],
  },
]

/** Все задачи плана одним списком — для счётчиков и валидации task_id. */
export const ALL_TASKS: PlanTask[] = PLAN.flatMap(w => w.days.flatMap(d => d.tasks))

const TASK_IDS = new Set(ALL_TASKS.map(t => t.id))

/** Знает ли план такую задачу. API не пишет в базу чужие id. */
export function isKnownTask(id: string): boolean {
  return TASK_IDS.has(id)
}
