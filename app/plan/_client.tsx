'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ALL_TASKS, PLAN, PLAN_DEALS_TOTAL, PLAN_LEVELS, PLAN_TARGET_USD,
  SKILLS, SKILL_ORDER, SKILL_TOTALS, levelOf, type PlanWeek, type Skill,
} from '@/lib/plan/data'
import styles from './plan.module.css'

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

const fmt = (n: number) => '$' + n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

async function postTask(taskId: string, done: boolean): Promise<boolean> {
  try {
    const r = await fetch('/api/plan/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, done }),
    })
    return r.ok
  } catch { return false }
}

export function PlanClient({ daysLeft }: { daysLeft: number }) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  // Недель можно держать открытыми сколько угодно — как в исходнике.
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set())
  const [armed, setArmed] = useState(false)
  // Неделю открываем автоматически один раз — дальше это выбор человека.
  const autoOpened = useRef(false)

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

  // Как в исходнике: открыта первая незакрытая неделя.
  useEffect(() => {
    if (!loaded || autoOpened.current) return
    autoOpened.current = true
    const first = PLAN.find(w => w.days.some(d => d.tasks.some(t => !done.has(t.id))))
    setOpenWeeks(first ? new Set([first.n]) : new Set())
  }, [loaded, done])

  const toggle = useCallback((taskId: string) => {
    const wasDone = done.has(taskId)
    const next = new Set(done)
    if (wasDone) next.delete(taskId); else next.add(taskId)

    // Оптимистично: галочка красится сразу, запрос уходит следом.
    setDone(next)
    writeCache(next)
    setFailed(false)

    void postTask(taskId, !wasDone).then(ok => {
      if (ok) return
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

  // Сброс — в две ступени вместо системного confirm: тот блокирует
  // страницу и на телефоне выглядит чужеродно.
  const reset = useCallback(() => {
    if (!armed) { setArmed(true); return }
    setArmed(false)
    const toClear = [...done]
    if (toClear.length === 0) return

    const before = new Set(done)
    setDone(new Set())
    writeCache(new Set())
    setFailed(false)

    void Promise.all(toClear.map(id => postTask(id, false))).then(results => {
      if (results.every(Boolean)) return
      setDone(before)
      writeCache(before)
      setFailed(true)
    })
  }, [armed, done])

  const stats = useMemo(() => {
    let money = 0, doneCount = 0, deals = 0, xp = 0
    const bySkill = Object.fromEntries(SKILL_ORDER.map(sk => [sk, 0])) as Record<Skill, number>
    for (const t of ALL_TASKS) {
      if (!done.has(t.id)) continue
      doneCount++
      xp += t.xp
      bySkill[t.skill] += t.xp
      if (t.amount) money += t.amount
      if (t.deal) deals++
    }
    return { money, doneCount, deals, xp, bySkill }
  }, [done])

  const pct = Math.min(100, (stats.money / PLAN_TARGET_USD) * 100)

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.goal}>
          Гоа
          <small>Старт 15 сентября. Вылет 14 декабря. 12 сделок, 4 застройщика на фиксе.</small>
        </h1>

        <div className={styles.meter}>
          <div className={styles.mrow}>
            <div className={styles.msum}>{fmt(stats.money)}</div>
            <div className={styles.mtarget}>из {fmt(PLAN_TARGET_USD)}</div>
          </div>
          <div className={styles.bar} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс по деньгам">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.levels}>
            {PLAN_LEVELS.map(lv => (
              <span key={lv.name} className={`${styles.lv} ${stats.money >= lv.amount ? styles.lvHit : ''}`}>
                <b>{lv.name}</b> {fmt(lv.amount)}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.stats}>
          <div><span>{stats.doneCount}</span>задач закрыто</div>
          <div><span>{stats.deals}</span>сделок из {PLAN_DEALS_TOTAL}</div>
          <div><span>{daysLeft}</span>{plural(daysLeft, 'день', 'дня', 'дней')} до вылета</div>
        </div>

        <section className={styles.skills} aria-label="Прокачка навыков">
          <div className={styles.skillsHead}>
            <b>Прокачка</b>
            <span>{stats.xp.toLocaleString('ru-RU')} XP всего</span>
          </div>
          {SKILL_ORDER.map(sk => {
            const xp = stats.bySkill[sk]
            const { level, into, need } = levelOf(xp)
            return (
              <div key={sk} className={styles.skill} title={`${SKILLS[sk].hint}. Всего в плане ${SKILL_TOTALS[sk]} XP, набрано ${xp}`}>
                <div className={styles.skillTop}>
                  <b>{SKILLS[sk].name}</b>
                  <span className={styles.skillLv}>ур. {level}</span>
                  <span className={styles.skillXp}>{into} / {need} → ур. {level + 1}</span>
                </div>
                <div className={styles.skillBar}>
                  <i style={{ width: `${(into / need) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </section>
      </header>

      <div>
        {PLAN.map(week => (
          <Week
            key={week.n}
            week={week}
            done={done}
            open={openWeeks.has(week.n)}
            onToggleWeek={() => setOpenWeeks(cur => {
              const next = new Set(cur)
              if (next.has(week.n)) next.delete(week.n); else next.add(week.n)
              return next
            })}
            onToggleTask={toggle}
          />
        ))}
      </div>

      <button
        type="button"
        className={`${styles.reset} ${armed ? styles.resetArmed : ''}`}
        onClick={reset}
        onBlur={() => setArmed(false)}
      >
        {armed ? 'Точно снять все галочки?' : 'Сбросить все галочки'}
      </button>

      <p className={styles.note} role="status">
        {failed
          ? 'Не сохранилось, попробуй ещё раз.'
          : !loaded
            ? 'Загружаю отметки…'
            : 'Галочки сохраняются в базе — они одинаковые на всех устройствах.'}
      </p>
    </div>
  )
}

function Week({ week, done, open, onToggleWeek, onToggleTask }: {
  week: PlanWeek
  done: Set<string>
  open: boolean
  onToggleWeek: () => void
  onToggleTask: (taskId: string) => void
}) {
  const tasks = week.days.flatMap(d => d.tasks)
  const count = tasks.filter(t => done.has(t.id)).length
  const complete = tasks.length > 0 && count === tasks.length
  const bodyId = `week-body-${week.n}`

  return (
    <section className={`${styles.week} ${open ? styles.weekOpen : ''} ${complete ? styles.weekDone : ''}`}>
      <button type="button" className={styles.whead} onClick={onToggleWeek} aria-expanded={open} aria-controls={bodyId}>
        <span className={styles.wnum}>{week.n}</span>
        <span className={styles.wtitle}>
          <b>{week.title}</b>
          <em>{week.dates}</em>
        </span>
        <span className={styles.wcount}>{count}/{tasks.length}</span>
        <span className={styles.chev} aria-hidden="true">›</span>
      </button>

      {open && (
        <div className={styles.wbody} id={bodyId}>
          {week.days.map(day => (
            <Day key={day.id} day={day} done={done} onToggleTask={onToggleTask} />
          ))}
        </div>
      )}
    </section>
  )
}

function Day({ day, done, onToggleTask }: {
  day: PlanWeek['days'][number]
  done: Set<string>
  onToggleTask: (taskId: string) => void
}) {
  // «сегодня» ставим только после монтирования: на сервере и на клиенте
  // дата может разойтись, и React ругается на несовпадение разметки.
  const [today, setToday] = useState(false)
  useEffect(() => { setToday(new Date().toISOString().slice(0, 10) === day.iso) }, [day.iso])

  return (
    <div className={`${styles.day} ${today ? styles.dayToday : ''}`}>
      <div className={styles.dname}>{day.label}</div>
      {day.tasks.map(task => (
        <label key={task.id} className={styles.task}>
          <input type="checkbox" checked={done.has(task.id)} onChange={() => onToggleTask(task.id)} />
          <span className={styles.txt}>
            {task.text}
            {task.amount != null && <span className={styles.pay}>+{fmt(task.amount)}</span>}
            <span className={styles.tag}>{SKILLS[task.skill].name} +{task.xp}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
