'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ACHIEVEMENTS, ALL_TASKS, PLAN, PLAN_DEALS_TOTAL, PLAN_LEVELS, PLAN_TARGET_USD,
  SKILLS, SKILL_ORDER, SKILL_TOTALS, levelOf, playerLevel, WAITING_TASKS,
  type PlanTask, type PlanWeek, type Skill,
} from '@/lib/plan/data'
import { playAward, playCoins, playFail, playLevelUp, playTick, playUndo } from './_sound'
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

export function PlanClient({ daysLeft, today }: { daysLeft: number; today: string }) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  // Недель можно держать открытыми сколько угодно — как в исходнике.
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set())
  const [armed, setArmed] = useState(false)
  const [allWaiting, setAllWaiting] = useState(false)
  const [days, setDays] = useState<string[]>([])
  const [muted, setMuted] = useState(false)
  // Дашборд и задачи разведены: каждый день нужны задачи, профиль — когда
  // хочется посмотреть, на что это всё копится.
  const [tab, setTab] = useState<'tasks' | 'profile'>('tasks')
  // Баннер награды и конфетти живут пару секунд после события.
  const [banner, setBanner] = useState<{ icon: string; title: string; sub: string } | null>(null)
  const [confetti, setConfetti] = useState(0)
  // Последнее действие — чтобы его можно было откатить одной кнопкой.
  const [undo, setUndo] = useState<{ taskId: string; text: string; nowDone: boolean } | null>(null)
  const mutedRef = useRef(false)
  // Чтобы не салютовать при первой загрузке уже полученным наградам.
  const seenAwards = useRef<Set<string> | null>(null)
  const seenLevel = useRef<number | null>(null)
  // Всплывашки «+25 XP»: живут пару секунд и исчезают.
  const [pops, setPops] = useState<Array<{ key: number; text: string; color: string }>>([])
  // Неделю открываем автоматически один раз — дальше это выбор человека.
  const autoOpened = useRef(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('plan_muted') === '1') { setMuted(true); mutedRef.current = true }
      if (localStorage.getItem('plan_tab') === 'profile') setTab('profile')
    } catch { /* приватный режим */ }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(v => {
      const next = !v
      mutedRef.current = next
      try { localStorage.setItem('plan_muted', next ? '1' : '0') } catch { /* приватный режим */ }
      if (!next) playTick()
      return next
    })
  }, [])

  useEffect(() => {
    const cached = readCache()
    if (cached) setDone(new Set(cached))

    let alive = true
    fetch('/api/plan/state')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((j: { done?: unknown; days?: unknown }) => {
        if (!alive) return
        const ids = Array.isArray(j.done) ? j.done.filter((v): v is string => typeof v === 'string') : []
        const next = new Set(ids)
        setDone(next)
        setDays(Array.isArray(j.days) ? j.days.filter((v): v is string => typeof v === 'string') : [])
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
    const task = ALL_TASKS.find(t => t.id === taskId)
    if (task && !wasDone) {
      const key = Date.now() + Math.random()
      setPops(cur => [...cur, { key, text: `+${task.xp} XP`, color: SKILLS[task.skill].color }])
      window.setTimeout(() => setPops(cur => cur.filter(p => p.key !== key)), 1400)
      if (task.amount) {
        const mk = key + 1
        setPops(cur => [...cur, { key: mk, text: `+${fmt(task.amount!)}`, color: '#f0a93c' }])
        window.setTimeout(() => setPops(cur => cur.filter(p => p.key !== mk)), 1600)
      }
      if (!mutedRef.current) (task.amount ? playCoins : playTick)()
    } else if (task && wasDone && !mutedRef.current) {
      playUndo()
    }
    if (task) setUndo({ taskId, text: task.text, nowDone: !wasDone })
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
      if (!mutedRef.current) playFail()
    })
  }, [done])

  const undoLast = useCallback(() => {
    if (!undo) return
    toggle(undo.taskId)
    setUndo(null)
  }, [undo, toggle])

  // Ctrl+Z / ⌘Z — привычный способ передумать.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undoLast()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoLast])

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
  const player = playerLevel(stats.xp)
  const nextLevel = PLAN_LEVELS.find(lv => stats.money < lv.amount) ?? null

  const earned = useMemo(() => {
    const state = { money: stats.money, deals: stats.deals, doneCount: stats.doneCount, done }
    return new Set(ACHIEVEMENTS.filter(a => a.test(state)).map(a => a.id))
  }, [stats, done])

  // Награда или новый уровень — фанфара, баннер и конфетти. Первая
  // загрузка не салютует: она лишь запоминает, что уже взято.
  useEffect(() => {
    if (!loaded) return

    if (seenAwards.current === null) {
      seenAwards.current = new Set(earned)
      seenLevel.current = player.level
      return
    }

    const fresh = ACHIEVEMENTS.filter(a => earned.has(a.id) && !seenAwards.current!.has(a.id))
    seenAwards.current = new Set(earned)

    const leveledUp = seenLevel.current !== null && player.level > seenLevel.current
    seenLevel.current = player.level

    if (leveledUp) {
      setBanner({ icon: '⭐️', title: `Уровень ${player.level}`, sub: player.rank })
      setConfetti(c => c + 1)
      if (!mutedRef.current) playLevelUp()
    } else if (fresh.length > 0) {
      const a = fresh[0]
      setBanner({ icon: a.icon, title: a.name, sub: a.hint })
      setConfetti(c => c + 1)
      if (!mutedRef.current) playAward()
    }
  }, [earned, loaded, player.level, player.rank])

  useEffect(() => {
    if (!undo) return
    const t = window.setTimeout(() => setUndo(null), 8000)
    return () => window.clearTimeout(t)
  }, [undo])

  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 2600)
    return () => window.clearTimeout(t)
  }, [banner])

  // Серия: сколько дней подряд, считая от сегодня (или вчера), что-то закрывалось.
  const streak = useMemo(() => {
    const set = new Set(days)
    const day = (shift: number) =>
      new Date(Date.parse(`${today}T00:00:00Z`) + shift * 86_400_000).toISOString().slice(0, 10)
    const start = set.has(day(0)) ? 0 : set.has(day(-1)) ? -1 : null
    if (start === null) return 0
    let n = 0
    while (set.has(day(start - n))) n++
    return n
  }, [days, today])

  // Хвосты: твои действия из прошедших дней, которые так и не отмечены.
  const overdue = useMemo(
    () => PLAN.flatMap(w => w.days.flatMap(d => d.tasks))
      .filter(t => !t.waiting && t.expected < today && !done.has(t.id)),
    [done, today],
  )
  // Случившиеся не исчезают из списка: иначе снять ошибочную галочку
  // будет негде — в днях этих задач нет.
  const waiting = useMemo(() => {
    const open = WAITING_TASKS.filter(t => !done.has(t.id))
    const closed = WAITING_TASKS.filter(t => done.has(t.id))
    return { open, closed, all: [...open, ...closed] }
  }, [done])

  return (
    <div className={styles.wrap}>
      <div className={styles.pops} aria-hidden="true">
        {pops.map(p => (
          <span key={p.key} className={styles.pop} style={{ color: p.color }}>{p.text}</span>
        ))}
      </div>

      {confetti > 0 && <Confetti key={confetti} />}

      {undo && (
        <div className={styles.undo} role="status">
          <span className={styles.undoText}>
            {undo.nowDone ? 'Отмечено' : 'Снято'}: {undo.text}
          </span>
          <button type="button" className={styles.undoBtn} onClick={undoLast}>Отменить</button>
        </div>
      )}

      {banner && (
        <div className={styles.banner} role="status">
          <span className={styles.bannerIcon} aria-hidden="true">{banner.icon}</span>
          <span>
            <b>{banner.title}</b>
            <em>{banner.sub}</em>
          </span>
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.hero}>
          <div className={styles.medal} aria-hidden="true">
            <span className={styles.medalLv}>{player.level}</span>
            <span className={styles.medalWord}>ур.</span>
          </div>
          <div className={styles.heroText}>
            <h1 className={styles.goal}>Гоа</h1>
            <div className={styles.rankRow}>
              <span className={styles.rank}>{player.rank}</span>
              <button
                type="button"
                className={styles.sound}
                onClick={toggleMute}
                aria-pressed={!muted}
                title={muted ? 'Включить звук' : 'Выключить звук'}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>
            <div className={styles.heroBar} title={`${stats.xp} XP всего`}>
              <i style={{ width: `${(player.into / player.need) * 100}%` }} />
            </div>
            <div className={styles.heroMeta}>
              <span>{stats.xp.toLocaleString('ru-RU')} XP</span>
              {/* Деньги видны на обеих вкладках: ради них всё и затевалось. */}
              <span className={styles.heroMoney}>{fmt(stats.money)}</span>
              <span>до {player.level + 1} ур. — {player.need - player.into}</span>
            </div>
          </div>
        </div>

        <div className={styles.tabs} role="tablist">
          {([['tasks', 'Задачи'], ['profile', 'Профиль']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`}
              onClick={() => {
                setTab(key)
                try { localStorage.setItem('plan_tab', key) } catch { /* приватный режим */ }
              }}
            >
              {label}
              {key === 'tasks' && overdue.length > 0 && <i className={styles.tabDot} />}
            </button>
          ))}
        </div>

        {tab === 'profile' ? (
          <>
        <div className={styles.quest}>
            Старт 15 сентября. Вылет 14 декабря. 12 сделок, 4 застройщика на фиксе.
          </div>

          <div className={styles.meter}>
            <div className={styles.mrow}>
              <div className={styles.msum}>{fmt(stats.money)}</div>
              <div className={styles.mtarget}>из {fmt(PLAN_TARGET_USD)}</div>
            </div>
            <div className={styles.bar} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс по деньгам">
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.levels}>
              {nextLevel
                ? <span>До планки «{nextLevel.name}» — {fmt(nextLevel.amount - stats.money)}</span>
                : <span>Все планки взяты</span>}
            </div>
          </div>

          <div className={styles.stats}>
            <div><span>{stats.doneCount}</span>задач закрыто</div>
            <div><span>{stats.deals}</span>{plural(stats.deals, 'сделка', 'сделки', 'сделок')} из {PLAN_DEALS_TOTAL}</div>
            <div><span>{daysLeft}</span>{plural(daysLeft, 'день', 'дня', 'дней')} до вылета</div>
            <div className={streak > 0 ? styles.statHot : undefined}>
              <span>{streak > 0 ? `🔥${streak}` : '—'}</span>
              {streak > 0 ? `${plural(streak, 'день', 'дня', 'дней')} подряд` : 'серии нет'}
            </div>
          </div>

          <section className={styles.skills} aria-label="Прокачка навыков">
            <div className={styles.skillsHead}>
              <b>Прокачка</b>
              <span>{stats.xp.toLocaleString('ru-RU')} XP всего</span>
            </div>
            {SKILL_ORDER.map(sk => {
              const xp = stats.bySkill[sk]
              const { level, into, need } = levelOf(xp)
              const { icon, name, hint, color } = SKILLS[sk]
              return (
                <div
                  key={sk}
                  className={styles.skill}
                  style={{ '--sk': color } as React.CSSProperties}
                  title={`${hint}. Всего в плане ${SKILL_TOTALS[sk]} XP, набрано ${xp}`}
                >
                  <span className={styles.skillIcon} aria-hidden="true">{icon}</span>
                  <div className={styles.skillBody}>
                    <div className={styles.skillTop}>
                      <b>{name}</b>
                      <span className={styles.skillLv}>ур. {level}</span>
                      <span className={styles.skillXp}>{into} / {need}</span>
                    </div>
                    <div className={styles.skillBar}>
                      <i style={{ width: `${(into / need) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          <section className={styles.awards} aria-label="Достижения">
            <div className={styles.skillsHead}>
              <b>Добыча</b>
              <span>{earned.size} из {ACHIEVEMENTS.length}</span>
            </div>
            <div className={styles.awardGrid}>
              {ACHIEVEMENTS.map(a => {
                const got = earned.has(a.id)
                return (
                  <div key={a.id} className={`${styles.award} ${got ? styles.awardGot : ''}`} title={a.hint}>
                    <span className={styles.awardIcon} aria-hidden="true">{a.icon}</span>
                    <span className={styles.awardName}>{a.name}</span>
                  </div>
                )
              })}
            </div>
          </section>
          </>
        ) : (
          <>
          {overdue.length > 0 && (
            <section className={styles.tails} aria-label="Хвосты">
              <div className={styles.tailsHead}>
                <b>Хвосты</b>
                <span>{overdue.length} {plural(overdue.length, 'задача', 'задачи', 'задач')} из прошедших дней</span>
              </div>
              {overdue.map(task => (
                <Row key={task.id} task={task} done={done} onToggle={toggle} note={ageNote(task.expected, today)} />
              ))}
            </section>
          )}

          {waiting.all.length > 0 && (
            <section className={styles.waiting} aria-label="В работе">
              <div className={styles.tailsHead}>
                <b>Ждут чужого решения</b>
                <span>
                  {waiting.open.length} {plural(waiting.open.length, 'ждёт', 'ждут', 'ждут')}
                  {waiting.closed.length > 0 && ` · ${waiting.closed.length} ${plural(waiting.closed.length, 'случилось', 'случилось', 'случилось')}`}
                </span>
              </div>
              {(allWaiting
                ? waiting.all
                // Случившиеся показываем всегда: иначе ошибочную галочку
                // придётся искать за кнопкой «показать все».
                : [...waiting.open.slice(0, 5), ...waiting.closed]
              ).map(task => (
                <Row key={task.id} task={task} done={done} onToggle={toggle} note={ageNote(task.expected, today)} />
              ))}
              {waiting.open.length > 5 && (
                <button type="button" className={styles.waitingMore} onClick={() => setAllWaiting(v => !v)}>
                  {allWaiting ? 'Свернуть' : `Показать все — ещё ${waiting.open.length - 5}`}
                </button>
              )}
            </section>
          )}
          </>
        )}
      </header>

      {tab === 'tasks' && (
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
      )}

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

const CONFETTI_COLORS = ['#4fd1a5', '#f0a93c', '#ff5fa2', '#4cc2ff', '#b18cff']

/** Салют: 28 бумажек разлетаются и гаснут. Чистый CSS, без библиотек. */
function Confetti() {
  const bits = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({
      left: Math.round(Math.random() * 100),
      delay: Math.round(Math.random() * 220),
      drift: Math.round((Math.random() - 0.5) * 220),
      spin: Math.round(Math.random() * 540 - 270),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.round(Math.random() * 6),
    })),
    [],
  )
  return (
    <div className={styles.confetti} aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            left: `${b.left}%`,
            background: b.color,
            width: b.size,
            height: b.size * 1.6,
            animationDelay: `${b.delay}ms`,
            '--drift': `${b.drift}px`,
            '--spin': `${b.spin}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Насколько событие разошлось с плановой датой. */
function ageNote(expected: string, today: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(expected)) / 86_400_000)
  if (days > 0) return `${days} ${plural(days, 'день', 'дня', 'дней')} как ждёт`
  if (days === 0) return 'по плану сегодня'
  return `по плану ${dayMonth.format(new Date(`${expected}T00:00:00Z`))}`
}

function Row({ task, done, onToggle, note }: {
  task: PlanTask
  done: Set<string>
  onToggle: (taskId: string) => void
  note: string
}) {
  return (
    <label className={styles.task}>
      <input type="checkbox" checked={done.has(task.id)} onChange={() => onToggle(task.id)} />
      <span className={styles.txt}>
        {task.text}
        {task.amount != null && <span className={styles.pay}>+{fmt(task.amount)}</span>}
        <span className={styles.age}>{note}</span>
      </span>
    </label>
  )
}

function Week({ week, done, open, onToggleWeek, onToggleTask }: {
  week: PlanWeek
  done: Set<string>
  open: boolean
  onToggleWeek: () => void
  onToggleTask: (taskId: string) => void
}) {
  // Ожидания в счёт недели не идут: их нельзя закрыть усилием воли.
  const tasks = week.days.flatMap(d => d.tasks).filter(t => !t.waiting)
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
          {week.days.filter(d => d.tasks.some(t => !t.waiting)).map(day => (
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
      {day.tasks.filter(t => !t.waiting).map(task => (
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
