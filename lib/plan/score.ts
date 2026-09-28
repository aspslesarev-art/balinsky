// Оценка дня 0–100: насколько эффективно прошёл день. Считается без ИИ —
// по фактам, чтобы цифру можно было разобрать на части и ей верить:
//
//   план дня    35 — доля задач квест-плана на этот день, что закрыты;
//   секретарь   25 — доля задач секретаря на этот день, что закрыты;
//   результат   25 — вес шагов из переписки (встреча, договор, бронь…)
//                    против дневной нормы RESULT_TARGET;
//   ответы      15 — в скольких чатах, где нам написали, мы ответили
//                    в течение суток.
//
// Если у части нет данных (выходной без плана, секретарь ещё не ставил
// задач, никто не писал) — она выпадает, остальные растягиваются до 100.

import type { PlanTask } from './data'
import type { PlanStep, StepKind } from './kinds'
import type { AiTask, DayScore } from './dash-types'

/** Сколько «очков результата» за день — норма. */
export const RESULT_TARGET = 20

/** Вес шага: деньги и подписи дороже касаний. */
export const STEP_WEIGHT: Record<StepKind, number> = {
  commission: 10, deposit: 10, booking: 10, dev_signed: 10,
  webinar: 10, event: 10,
  dev_terms: 5,
  coffee: 4, agent_zoom: 4, client_zoom: 4, dev_meet: 4,
  qual_call: 3,
  dev_pitch: 2, materials: 2,
  event_invite: 1, event_yes: 1,
  ping: 0.5,
}

const WEIGHTS = { plan: 35, ai: 25, result: 25, replies: 15 }

export function scoreDays(input: {
  days: string[]
  tasks: PlanTask[]
  done: ReadonlySet<string>
  steps: PlanStep[]
  aiTasks: AiTask[]
  replies: Map<string, { answered: number; total: number }>
}): DayScore[] {
  return input.days.map(day => {
    const planned = input.tasks.filter(t => !t.waiting && t.expected === day)
    const plan = planned.length
      ? { done: planned.filter(t => input.done.has(t.id)).length, total: planned.length }
      : null

    const mine = input.aiTasks.filter(t => t.day === day && t.status !== 'dropped')
    const ai = mine.length ? { done: mine.filter(t => t.status === 'done').length, total: mine.length } : null

    const daySteps = input.steps.filter(s => s.day === day && !s.rejected)
    const points = daySteps.reduce((sum, s) => sum + STEP_WEIGHT[s.kind], 0)
    const result = { points: Math.round(points * 10) / 10, target: RESULT_TARGET, steps: daySteps.length }

    const r = input.replies.get(day)
    const replies = r && r.total > 0 ? r : null

    let got = 0, max = 0
    if (plan) { got += WEIGHTS.plan * (plan.done / plan.total); max += WEIGHTS.plan }
    if (ai) { got += WEIGHTS.ai * (ai.done / ai.total); max += WEIGHTS.ai }
    got += WEIGHTS.result * Math.min(1, points / RESULT_TARGET); max += WEIGHTS.result
    if (replies) { got += WEIGHTS.replies * (replies.answered / replies.total); max += WEIGHTS.replies }

    return { day, score: Math.round((got / max) * 100), plan, ai, result, replies }
  })
}
