'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ALL_TASKS, type PlanWeek } from '@/lib/plan/data'

// Источник правды — база. localStorage только для первой отрисовки:
// на телефоне по слабому интернету он показывает вчерашнее состояние
// сразу, а через секунду его заменяет ответ API.
const CACHE_KEY = 'plan_done_v1'

function readCache(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null
  } catch { return null }
}

function writeCache(done: Set<string>): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify([...done])) } catch { /* приватный режим — переживём */ }
}

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function PlanClient({ plan, goalUsd, daysLeft }: { plan: PlanWeek[]; goalUsd: number; daysLeft: number }) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const cached = readCache()
    if (cached) setDone(new Set(cached))

    let alive = true
    fetch('/api/plan/state')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((j: { done?: unknown }) => {
        if (!alive) return
        const ids = Array.isArray(j.done) ? j.done.filter((v): v is string => typeof v === 'string') : []
        const next = new Set(ids)
        setDone(next)
        writeCache(next)
        setFailed(false)
      })
      .catch(() => { if (alive) setFailed(true) })
      .finally(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  const toggle = useCallback((taskId: string) => {
    const wasDone = done.has(taskId)
    const next = new Set(done)
    if (wasDone) next.delete(taskId); else next.add(taskId)

    // Оптимистично: галочка красится сразу, запрос уходит следом.
    setDone(next)
    writeCache(next)
    setFailed(false)

    fetch('/api/plan/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, done: !wasDone }),
    })
      .then(r => { if (!r.ok) throw new Error('http') })
      .catch(() => {
        // Не сохранилось — возвращаем галочку как было, чтобы экран
        // не врал про сделанное.
        setDone(prev => {
          const rolled = new Set(prev)
          if (wasDone) rolled.add(taskId); else rolled.delete(taskId)
          writeCache(rolled)
          return rolled
        })
        setFailed(true)
      })
  }, [done])

  const stats = useMemo(() => {
    let earned = 0, deals = 0, doneCount = 0
    for (const t of ALL_TASKS) {
      if (!done.has(t.id)) continue
      doneCount++
      if (t.amount) earned += t.amount
      if (t.deal) deals++
    }
    return { earned, deals, doneCount, total: ALL_TASKS.length }
  }, [done])

  const pct = goalUsd > 0 ? Math.min(100, Math.round((stats.earned / goalUsd) * 100)) : 0

  return (
    <div className="grid gap-12">
      <section aria-label="Итоги">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Заработано" value={money.format(stats.earned)} />
          <Stat label="Сделок" value={String(stats.deals)} />
          <Stat label="Задач сделано" value={`${stats.doneCount} из ${stats.total}`} />
          <Stat label="Осталось" value={`${daysLeft} ${plural(daysLeft, 'день', 'дня', 'дней')}`} />
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between text-[13px] text-[var(--color-text-muted)]">
            <span>Цель квартала — {money.format(goalUsd)}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-search-bg)]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Прогресс по деньгам"
          >
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-[320ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <p className="mt-4 min-h-[18px] text-[13px] text-[var(--color-text-muted)]" role="status">
          {failed ? 'Не сохранилось, попробуй ещё раз.' : !loaded ? 'Загружаю отметки…' : ''}
        </p>
      </section>

      {plan.map(week => (
        <section key={week.id} aria-labelledby={`week-${week.id}`}>
          <h2 id={`week-${week.id}`} className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
            {week.title}
          </h2>
          {week.subtitle && (
            <p className="mt-1 max-w-[68ch] text-[15px] leading-relaxed text-[var(--color-text-muted)]">{week.subtitle}</p>
          )}

          <div className="mt-6 grid gap-6">
            {week.days.map(day => (
              <div key={day.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4 sm:p-6">
                <div className="text-[13px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  {day.label}
                </div>
                {day.note && <p className="mt-1 max-w-[68ch] text-[15px] leading-relaxed text-[var(--color-text-muted)]">{day.note}</p>}

                <ul className="mt-4 grid max-w-[72ch] gap-1">
                  {day.tasks.map(task => {
                    const checked = done.has(task.id)
                    return (
                      <li key={task.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-[120ms] hover:bg-[var(--color-search-bg)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-primary)]">
                          <input
                            type="checkbox"
                            className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-[var(--color-primary)] focus-visible:outline-none"
                            checked={checked}
                            onChange={() => toggle(task.id)}
                          />
                          <span className={`flex-1 text-[15px] leading-relaxed ${checked ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>
                            {task.text}
                          </span>
                          {task.amount != null && (
                            <span className={`shrink-0 text-[15px] tabular-nums ${checked ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                              {money.format(task.amount)}
                            </span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] px-4 py-3">
      <div className="text-[13px] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-[20px] font-semibold tracking-tight tabular-nums text-[var(--color-text)]">{value}</div>
    </div>
  )
}
