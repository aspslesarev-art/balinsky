// Какие задачи плана закрыла переписка. Чистый расчёт без базы: его
// делает экран /plan, чтобы «не засчитывать» шаг меняло картину сразу.

import type { PlanTask } from './data'
import type { PlanStep, StepKind } from './kinds'

export type AutoProgress = {
  /** Сколько шагов набралось. */
  have: number
  need: number
  done: boolean
  /** Шаги, на которых держится отметка: за день — все, «№N» — сам N-й. */
  evidence: PlanStep[]
}

export function autoProgress(tasks: PlanTask[], steps: PlanStep[]): Map<string, AutoProgress> {
  const byKind = new Map<StepKind, PlanStep[]>()
  for (const s of steps) {
    if (s.rejected) continue
    const list = byKind.get(s.kind)
    if (list) list.push(s); else byKind.set(s.kind, [s])
  }
  for (const list of byKind.values()) list.sort((a, b) => a.ts.localeCompare(b.ts))

  const out = new Map<string, AutoProgress>()
  for (const t of tasks) {
    if (!t.auto) continue
    const { k, n, per } = t.auto
    const all = byKind.get(k) ?? []
    if (per === 'day') {
      const day = all.filter(s => s.day === t.expected)
      out.set(t.id, { have: day.length, need: n, done: day.length >= n, evidence: day })
    } else {
      out.set(t.id, { have: all.length, need: n, done: all.length >= n, evidence: all.length >= n ? [all[n - 1]] : [] })
    }
  }
  return out
}
