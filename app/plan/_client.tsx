'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ACHIEVEMENTS, ALL_TASKS, PLAN, PLAN_DEALS_TOTAL, PLAN_LEVELS, PLAN_TARGET_USD,
  SKILLS, SKILL_ORDER, SKILL_TOTALS, levelOf, playerLevel, WAITING_TASKS,
  type PlanTask, type PlanWeek, type Skill,
} from '@/lib/plan/data'
import { autoProgress, type AutoProgress } from '@/lib/plan/auto'
import { STEP_KINDS, isStepKind, type PlanStep, type StepKind } from '@/lib/plan/kinds'
import { FOCUS, HQ_AS_OF, PROJECTS, QUARTER, REVIEW, type Project } from '@/lib/plan/hq'
import { CLOSED, PEOPLE, PEOPLE_AS_OF, SILENT, type Person, type PersonKind, type PersonTask } from '@/lib/plan/people'
import { GOAL_PRESETS, type AiTask, type CommChat, type DayNote, type DayScore, type Draft, type EventGuest, type EventInfo, type GuestStatus, type Upcoming } from '@/lib/plan/dash-types'
import { playAward, playCoins, playFail, playLevelUp, playTick, playUndo } from './_sound'
import styles from './plan.module.css'

// Дашборд квеста «Гоа»: секретарь ставит задачи на день, трекер сам
// отмечает шаги по переписке, оценка дня показывает, насколько день удался.
//
// Источник правды — база. localStorage только для первой отрисовки
// галочек: на телефоне по слабому интернету он показывает вчерашнее
// состояние сразу, а через секунду его заменяет ответ API.
const CACHE_KEY = 'plan_done_v1'
/** Задачи, которые переписка уже закрывала при прошлом заходе: чтобы салютовать только новым. */
const AUTO_SEEN_KEY = 'plan_auto_seen_v1'
/** Опыт за задачу секретаря — наравне с мелкими задачами плана. */
const AI_TASK_XP = 10
const TZ = 'Asia/Makassar'

type Tab = 'hq' | 'today' | 'comms' | 'people' | 'plan' | 'results'

const TABS: ReadonlyArray<readonly [Tab, string]> = [
  ['hq', 'Штаб'],
  ['today', 'Сегодня'],
  ['comms', 'Переписка'],
  ['people', 'По людям'],
  ['plan', 'План'],
  ['results', 'Итоги'],
]

function isTab(v: unknown): v is Tab {
  return v === 'hq' || v === 'today' || v === 'comms' || v === 'people' || v === 'plan' || v === 'results'
}

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

const fmt = (n: number) => '$' + n.toLocaleString('ru-RU').replace(/ /g, ' ')

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekdayLong = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const weekdayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' })
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const whenFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ })

/** «2 ч», «3 дн» — сколько прошло. */
function since(ts: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(ts)) / 60_000))
  if (min < 60) return `${min} мин`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} ч`
  return `${Math.round(h / 24)} дн`
}

async function post(url: string, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.ok
  } catch { return false }
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function parseSteps(v: unknown): PlanStep[] {
  if (!Array.isArray(v)) return []
  return v.filter((s): s is PlanStep =>
    !!s && typeof s === 'object' && typeof (s as PlanStep).id === 'number' && isStepKind((s as PlanStep).kind))
}

type Dash = {
  event: { info: EventInfo; guests: EventGuest[] } | null
  aiTasks: AiTask[]
  aiDone: number
  notes: DayNote[]
  upcoming: Upcoming[]
  comms: CommChat[]
  scores: DayScore[]
}

const EMPTY_DASH: Dash = { event: null, aiTasks: [], aiDone: 0, notes: [], upcoming: [], comms: [], scores: [] }

export function PlanClient({ daysLeft, today }: { daysLeft: number; today: string }) {
  // done — галочки руками; off — снятые руками задачи, которые закрыла
  // бы переписка; steps — шаги, найденные в переписке.
  const [done, setDone] = useState<Set<string>>(new Set())
  const [off, setOff] = useState<Set<string>>(new Set())
  // Галочки на договорённостях с людьми — отдельно от плана и опыта.
  const [peopleDone, setPeopleDone] = useState<Set<string>>(new Set())
  const [steps, setSteps] = useState<PlanStep[]>([])
  const [dash, setDash] = useState<Dash>(EMPTY_DASH)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set())
  const [armed, setArmed] = useState(false)
  const [days, setDays] = useState<string[]>([])
  const [muted, setMuted] = useState(false)
  const [tab, setTab] = useState<Tab>('hq')
  const [refreshing, setRefreshing] = useState<'idle' | 'busy' | 'cap' | 'error'>('idle')
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
  const [pops, setPops] = useState<Array<{ key: number; text: string }>>([])
  // Неделю открываем автоматически один раз — дальше это выбор человека.
  const autoOpened = useRef(false)

  const pop = useCallback((text: string, ms = 1400) => {
    const key = Date.now() + Math.random()
    setPops(cur => [...cur, { key, text }])
    window.setTimeout(() => setPops(cur => cur.filter(p => p.key !== key)), ms)
  }, [])

  useEffect(() => {
    try {
      if (localStorage.getItem('plan_muted') === '1') { setMuted(true); mutedRef.current = true }
      const saved = localStorage.getItem('plan_tab')
      if (isTab(saved)) setTab(saved)
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

  const load = useCallback(async (): Promise<boolean> => {
    try {
      const r = await fetch('/api/plan/state', { cache: 'no-store' })
      if (!r.ok) throw new Error('http')
      const j = await r.json() as Record<string, unknown>
      const next = new Set(strings(j.done))
      setDone(next)
      writeCache(next)
      setOff(new Set(strings(j.off)))
      setPeopleDone(new Set(strings(j.people)))
      setDays(strings(j.days))
      setSteps(parseSteps(j.steps))
      const ev = j.event as { info?: EventInfo; guests?: EventGuest[] } | undefined
      setDash({
        event: ev?.info && Array.isArray(ev.guests) ? { info: ev.info, guests: ev.guests } : null,
        aiTasks: Array.isArray(j.aiTasks) ? j.aiTasks as AiTask[] : [],
        aiDone: typeof j.aiDone === 'number' ? j.aiDone : 0,
        notes: Array.isArray(j.notes) ? j.notes as DayNote[] : [],
        upcoming: Array.isArray(j.upcoming) ? j.upcoming as Upcoming[] : [],
        comms: Array.isArray(j.comms) ? j.comms as CommChat[] : [],
        scores: Array.isArray(j.scores) ? j.scores as DayScore[] : [],
      })
      setFailed(false)
      return true
    } catch {
      setFailed(true)
      return false
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    const cached = readCache()
    if (cached) setDone(new Set(cached))
    void load()
    // Вернулся на вкладку спустя время — подтянуть свежее: переписка
    // и секретарь меняют картину в течение дня.
    let last = Date.now()
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return
      last = Date.now()
      void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  // Что закрыла переписка. Снятое руками (off) не возвращается, пока
  // задачу не отметят снова.
  const auto = useMemo(() => autoProgress(ALL_TASKS, steps), [steps])
  const autoDone = useMemo(() => new Set([...auto].filter(([, p]) => p.done).map(([id]) => id)), [auto])
  const effDone = useMemo(() => {
    const all = new Set(done)
    for (const id of autoDone) if (!off.has(id)) all.add(id)
    return all
  }, [done, off, autoDone])

  useEffect(() => {
    if (!loaded || autoOpened.current) return
    autoOpened.current = true
    const first = PLAN.find(w => w.days.some(d => d.tasks.some(t => !effDone.has(t.id))))
    setOpenWeeks(first ? new Set([first.n]) : new Set())
  }, [loaded, effDone])

  const toggle = useCallback((taskId: string) => {
    const wasDone = effDone.has(taskId)
    // Сняли задачу, которую закрыла переписка, — запоминаем, иначе
    // подсчёт тут же поставит галочку обратно.
    const byAuto = autoDone.has(taskId)
    const task = ALL_TASKS.find(t => t.id === taskId)
    if (task && !wasDone) {
      pop(`+${task.xp} XP`)
      if (task.amount) pop(`+${fmt(task.amount)}`, 1600)
      if (!mutedRef.current) (task.amount ? playCoins : playTick)()
    } else if (task && wasDone && !mutedRef.current) {
      playUndo()
    }
    if (task) setUndo({ taskId, text: task.text, nowDone: !wasDone })
    const next = new Set(done)
    const wasManual = done.has(taskId)
    const wasOff = off.has(taskId)
    const nextOff = new Set(off)
    if (wasDone) { next.delete(taskId); if (byAuto) nextOff.add(taskId) }
    else { next.add(taskId); nextOff.delete(taskId) }

    // Оптимистично: галочка красится сразу, запрос уходит следом.
    setDone(next)
    setOff(nextOff)
    writeCache(next)
    setFailed(false)

    void post('/api/plan/state', { task_id: taskId, done: !wasDone, auto_off: wasDone && byAuto }).then(ok => {
      if (ok) return
      // Не сохранилось — возвращаем галочку как было, чтобы экран
      // не врал про сделанное.
      setDone(prev => {
        const rolled = new Set(prev)
        if (wasManual) rolled.add(taskId); else rolled.delete(taskId)
        writeCache(rolled)
        return rolled
      })
      setOff(prev => {
        const rolled = new Set(prev)
        if (wasOff) rolled.add(taskId); else rolled.delete(taskId)
        return rolled
      })
      setFailed(true)
      if (!mutedRef.current) playFail()
    })
  }, [done, off, effDone, autoDone, pop])

  const togglePerson = useCallback((taskId: string) => {
    const wasDone = peopleDone.has(taskId)
    if (!mutedRef.current) (wasDone ? playUndo : playTick)()
    setPeopleDone(prev => {
      const next = new Set(prev)
      if (wasDone) next.delete(taskId); else next.add(taskId)
      return next
    })
    setFailed(false)
    void post('/api/plan/state', { task_id: taskId, done: !wasDone }).then(ok => {
      if (ok) return
      setPeopleDone(prev => {
        const rolled = new Set(prev)
        if (wasDone) rolled.add(taskId); else rolled.delete(taskId)
        return rolled
      })
      setFailed(true)
      if (!mutedRef.current) playFail()
    })
  }, [peopleDone])

  const toggleAi = useCallback((id: number) => {
    const task = dash.aiTasks.find(t => t.id === id)
    if (!task) return
    const nowDone = task.status !== 'done'
    const patch = (d: boolean) => (t: AiTask): AiTask => t.id !== id ? t
      : { ...t, status: d ? 'done' : 'open', done_by: d ? 'owner' : null, done_at: d ? new Date().toISOString() : null }
    setDash(cur => ({ ...cur, aiTasks: cur.aiTasks.map(patch(nowDone)), aiDone: cur.aiDone + (nowDone ? 1 : -1) }))
    if (nowDone) { pop(`+${AI_TASK_XP} XP`); if (!mutedRef.current) playTick() } else if (!mutedRef.current) playUndo()
    void post('/api/plan/tasks', { id, done: nowDone }).then(ok => {
      if (ok) return
      setDash(cur => ({ ...cur, aiTasks: cur.aiTasks.map(patch(!nowDone)), aiDone: cur.aiDone + (nowDone ? -1 : 1) }))
      setFailed(true)
      if (!mutedRef.current) playFail()
    })
  }, [dash.aiTasks, pop])

  // «Не засчитывать» шаг из переписки — и вернуть обратно.
  const rejectStep = useCallback((id: number, rejected: boolean) => {
    setSteps(cur => cur.map(s => (s.id === id ? { ...s, rejected } : s)))
    if (!mutedRef.current) (rejected ? playUndo : playTick)()
    void post('/api/plan/steps', { id, rejected }).then(ok => {
      if (ok) return
      setSteps(cur => cur.map(s => (s.id === id ? { ...s, rejected: !rejected } : s)))
      setFailed(true)
      if (!mutedRef.current) playFail()
    })
  }, [])

  // Цель по человеку: сразу на экране, запрос следом.
  const saveGoal = useCallback(async (chatId: number, goal: string): Promise<boolean> => {
    const clean = goal.trim()
    const before = dash.comms.find(c => c.chat_id === chatId)?.goal ?? null
    setDash(cur => ({ ...cur, comms: cur.comms.map(c => (c.chat_id === chatId ? { ...c, goal: clean || null } : c)) }))
    const ok = await post('/api/plan/goal', { chat_id: chatId, goal: clean })
    if (!ok) {
      setDash(cur => ({ ...cur, comms: cur.comms.map(c => (c.chat_id === chatId ? { ...c, goal: before } : c)) }))
      setFailed(true)
      if (!mutedRef.current) playFail()
    } else if (!mutedRef.current) playTick()
    return ok
  }, [dash.comms])

  // Статус гостя руками: ИИ его после этого не перезапишет.
  const setGuest = useCallback((chatId: number, status: GuestStatus) => {
    const before = dash.event?.guests.find(g => g.chat_id === chatId)?.status
    const patch = (st: GuestStatus) => (cur: Dash): Dash => cur.event
      ? { ...cur, event: { ...cur.event, guests: cur.event.guests.map(g => (g.chat_id === chatId ? { ...g, status: st, manual: true } : g)) } }
      : cur
    setDash(patch(status))
    if (!mutedRef.current) playTick()
    void post('/api/plan/event', { chat_id: chatId, status }).then(ok => {
      if (ok || !before) return
      setDash(patch(before))
      setFailed(true)
      if (!mutedRef.current) playFail()
    })
  }, [dash.event])

  const refreshPlan = useCallback(async () => {
    setRefreshing('busy')
    try {
      const r = await fetch('/api/plan/secretary', { method: 'POST' })
      if (r.status === 429) { setRefreshing('cap'); return }
      if (!r.ok) { setRefreshing('error'); return }
      await load()
      setRefreshing('idle')
      if (!mutedRef.current) playTick()
    } catch { setRefreshing('error') }
  }, [load])

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

    void Promise.all(toClear.map(id => post('/api/plan/state', { task_id: id, done: false }))).then(results => {
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
      if (!effDone.has(t.id)) continue
      doneCount++
      xp += t.xp
      bySkill[t.skill] += t.xp
      if (t.amount) money += t.amount
      if (t.deal) deals++
    }
    // Задачи секретаря тоже дают опыт: это та же работа, только точнее.
    xp += dash.aiDone * AI_TASK_XP
    return { money, doneCount, deals, xp, bySkill }
  }, [effDone, dash.aiDone])

  const pct = Math.min(100, (stats.money / PLAN_TARGET_USD) * 100)
  const player = playerLevel(stats.xp)
  const nextLevel = PLAN_LEVELS.find(lv => stats.money < lv.amount) ?? null

  const earned = useMemo(() => {
    const state = { money: stats.money, deals: stats.deals, doneCount: stats.doneCount, done: effDone }
    return new Set(ACHIEVEMENTS.filter(a => a.test(state)).map(a => a.id))
  }, [stats, effDone])

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

  // Переписка закрыла задачи с прошлого захода — «+XP» и баннер, как
  // будто галочку поставили руками. Первый заход после выката ничего
  // не празднует: там засчитана вся история разом.
  useEffect(() => {
    if (!loaded) return
    const current = [...autoDone].filter(id => !off.has(id))
    let seen: unknown = null
    try {
      const raw = localStorage.getItem(AUTO_SEEN_KEY)
      seen = raw ? JSON.parse(raw) : null
    } catch { seen = null }
    try { localStorage.setItem(AUTO_SEEN_KEY, JSON.stringify(current)) } catch { /* приватный режим */ }
    if (!Array.isArray(seen)) return
    const was = new Set(seen)
    const fresh = ALL_TASKS.filter(t => current.includes(t.id) && !was.has(t.id) && !done.has(t.id))
    if (fresh.length === 0) return
    const xp = fresh.reduce((sum, t) => sum + t.xp, 0)
    const money = fresh.reduce((sum, t) => sum + (t.amount ?? 0), 0)
    pop(`+${xp} XP`)
    setBanner({
      icon: '💬',
      title: 'Засчитано по переписке',
      sub: fresh.length === 1 ? fresh[0].text : `${fresh.length} ${plural(fresh.length, 'задача', 'задачи', 'задач')}${money ? ` · +${fmt(money)}` : ''}`,
    })
    if (!mutedRef.current) (money ? playCoins : playTick)()
    // Смотрим только на смену набора, а не на каждую галочку руками.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, autoDone, off])

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

  // Серия: сколько дней подряд, считая от сегодня (или вчера), что-то делалось.
  const streak = useMemo(() => {
    const set = new Set([...days, ...steps.filter(s => !s.rejected).map(s => s.day)])
    const day = (shift: number) =>
      new Date(Date.parse(`${today}T00:00:00Z`) + shift * 86_400_000).toISOString().slice(0, 10)
    const start = set.has(day(0)) ? 0 : set.has(day(-1)) ? -1 : null
    if (start === null) return 0
    let n = 0
    while (set.has(day(start - n))) n++
    return n
  }, [days, steps, today])

  // Хвосты: твои действия из прошедших дней, которые так и не отмечены.
  const overdue = useMemo(
    () => ALL_TASKS.filter(t => !t.waiting && t.expected < today && !effDone.has(t.id)),
    [effDone, today],
  )
  const waiting = useMemo(() => WAITING_TASKS.filter(t => !effDone.has(t.id)), [effDone])

  const planToday = useMemo(() => {
    const day = PLAN.flatMap(w => w.days).find(d => d.iso === today)
    return day ? day.tasks.filter(t => !t.waiting) : []
  }, [today])

  const aiToday = useMemo(
    () => dash.aiTasks.filter(t => t.day === today && t.status !== 'dropped')
      .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.priority - b.priority || a.id - b.id),
    [dash.aiTasks, today],
  )
  const note = dash.notes.find(n => n.day === today) ?? null
  const scoreToday = dash.scores.find(s => s.day === today) ?? null

  const feed = useMemo(() => {
    const todays = steps.filter(s => s.day === today)
    if (todays.length > 0) return { label: 'сегодня', steps: todays }
    const last = steps.filter(s => s.day < today).at(-1)?.day
    return last
      ? { label: dayMonth.format(new Date(`${last}T00:00:00Z`)), steps: steps.filter(s => s.day === last) }
      : { label: null, steps: [] as PlanStep[] }
  }, [steps, today])

  const commsById = useMemo(() => new Map(dash.comms.map(c => [c.chat_id, c])), [dash.comms])

  const waitingMe = useMemo(
    () => dash.comms.filter(c => c.waiting_since).sort((a, b) => a.waiting_since!.localeCompare(b.waiting_since!)),
    [dash.comms],
  )

  // Сколько моих обещаний со сроком сегодня или раньше ещё не закрыто.
  const promisesDue = useMemo(
    () => PEOPLE.reduce((n, p) => n + p.tasks.filter(t => t.who === 'me' && t.due && t.due <= today && !peopleDone.has(t.id)).length, 0),
    [peopleDone, today],
  )

  const setTabSaved = (key: Tab) => {
    setTab(key)
    try { localStorage.setItem('plan_tab', key) } catch { /* приватный режим */ }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.pops} aria-hidden="true">
        {pops.map(p => <span key={p.key} className={styles.pop}>{p.text}</span>)}
      </div>

      {confetti > 0 && <Confetti key={confetti} />}

      {undo && (
        <div className={styles.undo} role="status">
          <span className={styles.undoText}>{undo.nowDone ? 'Отмечено' : 'Снято'}: {undo.text}</span>
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
        <div className={styles.headMain}>
          <p className={styles.eyebrow}>{weekdayLong.format(new Date(`${today}T00:00:00Z`))}</p>
          <h1 className={styles.title}>Гоа через {daysLeft} {plural(daysLeft, 'день', 'дня', 'дней')}</h1>
        </div>
        <div className={styles.headSide}>
          <div className={styles.player} title={`${stats.xp} XP всего`}>
            <span className={styles.lv}>{player.level}</span>
            <span className={styles.playerText}>
              <b>{player.rank}</b>
              <span className={styles.thinBar}><i style={{ width: `${(player.into / player.need) * 100}%` }} /></span>
              <em>{stats.xp.toLocaleString('ru-RU')} XP · до {player.level + 1} ур. {player.need - player.into}</em>
            </span>
          </div>
          <div className={styles.money} title="Заработано по плану">
            <b>{fmt(stats.money)}</b>
            <span className={`${styles.thinBar} ${styles.goldBar}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Деньги от цели">
              <i style={{ width: `${pct}%` }} />
            </span>
            <em>из {fmt(PLAN_TARGET_USD)}</em>
          </div>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleMute}
            aria-pressed={!muted}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      <nav className={styles.tabs} role="tablist" aria-label="Разделы">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`}
            onClick={() => setTabSaved(key)}
          >
            {label}
            {key === 'comms' && waitingMe.length > 0 && <span className={styles.count}>{waitingMe.length}</span>}
            {key === 'people' && promisesDue > 0 && <span className={styles.count}>{promisesDue}</span>}
          </button>
        ))}
      </nav>

      {failed && (
        <p className={styles.alert} role="alert">Не удалось загрузить или сохранить. Проверь интернет и обнови страницу.</p>
      )}

      {tab === 'today' && (
        <div className={styles.grid}>
          <div className={styles.col}>
            <div className={styles.slot} style={{ order: 1 }}>
            <section className={`${styles.card} ${styles.hero}`} aria-label="Секретарь">
              <div className={styles.cardHead}>
                <h2>Сегодня</h2>
                <button type="button" className={styles.ghostBtn} onClick={() => void refreshPlan()} disabled={refreshing === 'busy'}>
                  {refreshing === 'busy' ? 'Собираю…' : 'Пересобрать план'}
                </button>
              </div>
              {refreshing === 'cap' && <p className={styles.hint}>Дневной лимит на ИИ исчерпан — план обновится завтра утром.</p>}
              {refreshing === 'error' && <p className={styles.hint}>Секретарь не ответил. Попробуй ещё раз через минуту.</p>}
              {note?.brief
                ? <p className={styles.brief}>{note.brief}</p>
                : loaded && <p className={styles.hint}>Секретарь составляет план в 8:00 по Бали. Можно не ждать — нажми «Пересобрать план».</p>}

              {aiToday.length > 0 && (
                <ul className={styles.list}>
                  {aiToday.map(t => (
                    <AiRow key={t.id} task={t} chat={t.chat_id != null ? commsById.get(t.chat_id) : undefined} onToggle={toggleAi} onSent={load} />
                  ))}
                </ul>
              )}

              {planToday.length > 0 && (
                <>
                  <h3 className={styles.sub}>
                    По плану квеста
                    <span>{planToday.filter(t => effDone.has(t.id)).length} из {planToday.length}</span>
                  </h3>
                  <ul className={styles.list}>
                    {planToday.map(task => (
                      <Row key={task.id} task={task} done={effDone} auto={auto.get(task.id)} onToggle={toggle} />
                    ))}
                  </ul>
                </>
              )}
            </section>
            </div>

            {overdue.length > 0 && (<div className={styles.slot} style={{ order: 5 }}>
              <Collapsible
                title="Хвосты"
                meta={`${overdue.length} ${plural(overdue.length, 'задача', 'задачи', 'задач')} из прошлых дней`}
                tone="warn"
                items={overdue}
                limit={5}
                render={task => (
                  <Row key={task.id} task={task} done={effDone} auto={auto.get(task.id)} onToggle={toggle} note={ageNote(task.expected, today)} />
                )}
              />
            </div>)}

            {waiting.length > 0 && (<div className={styles.slot} style={{ order: 6 }}>
              <Collapsible
                title="Ждут чужого решения"
                meta={`${waiting.length} впереди`}
                items={waiting}
                limit={4}
                render={task => (
                  <Row key={task.id} task={task} done={effDone} auto={auto.get(task.id)} onToggle={toggle} note={ageNote(task.expected, today)} />
                )}
              />
            </div>)}
          </div>

          <div className={styles.col}>
            {dash.event && dash.event.info.date >= today && (
              <div className={styles.slot} style={{ order: 2 }}>
                <EventCard info={dash.event.info} guests={dash.event.guests} today={today} commsById={commsById} onStatus={setGuest} onSent={load} />
              </div>
            )}

            <div className={styles.slot} style={{ order: 2 }}>
              <ScoreCard today={scoreToday} scores={dash.scores} onOpen={() => setTabSaved('results')} />
            </div>

            <div className={styles.slot} style={{ order: 3 }}>
            <section className={styles.card} aria-label="Ждут ответа">
              <div className={styles.cardHead}>
                <h2>Ждут вашего ответа</h2>
                <button type="button" className={styles.linkBtn} onClick={() => setTabSaved('comms')}>Вся переписка</button>
              </div>
              {waitingMe.length === 0
                ? <p className={styles.hint}>{loaded ? 'Никто не ждёт — все отвечены.' : 'Загружаю…'}</p>
                : <ul className={styles.list}>{waitingMe.slice(0, 5).map(c => <CommRow key={c.chat_id} chat={c} compact onSent={load} onGoal={saveGoal} />)}</ul>}
              {waitingMe.length > 5 && (
                <button type="button" className={styles.linkBtn} onClick={() => setTabSaved('comms')}>
                  Ещё {waitingMe.length - 5}
                </button>
              )}
            </section>
            </div>

            <div className={styles.slot} style={{ order: 4 }}>
              <UpcomingCard upcoming={dash.upcoming} today={today} />
            </div>

            <div className={styles.slot} style={{ order: 7 }}>
              <Feed label={feed.label} steps={feed.steps} onReject={rejectStep} />
            </div>
          </div>
        </div>
      )}

      {tab === 'comms' && <CommsTab comms={dash.comms} loaded={loaded} onSent={load} onGoal={saveGoal} />}

      {tab === 'hq' && (
        <HqTab today={today} money={stats.money} deals={stats.deals} daysLeft={daysLeft} event={dash.event}
          upcoming={dash.upcoming} score={scoreToday} waiting={waitingMe.length} done={peopleDone}
          onToggle={togglePerson} onOpen={setTabSaved} />
      )}

      {tab === 'people' && <PeopleTab done={peopleDone} today={today} commsById={commsById} onToggle={togglePerson} />}

      {tab === 'plan' && (
        <div className={styles.weeks}>
          <p className={styles.hint}>Старт 15 сентября. Вылет 14 декабря. 12 сделок, 4 застройщика на фиксе.</p>
          {PLAN.map(week => (
            <Week
              key={week.n}
              week={week}
              done={effDone}
              auto={auto}
              today={today}
              open={openWeeks.has(week.n)}
              onToggleWeek={() => setOpenWeeks(cur => {
                const next = new Set(cur)
                if (next.has(week.n)) next.delete(week.n); else next.add(week.n)
                return next
              })}
              onToggleTask={toggle}
            />
          ))}
          <button
            type="button"
            className={`${styles.reset} ${armed ? styles.resetArmed : ''}`}
            onClick={reset}
            onBlur={() => setArmed(false)}
          >
            {armed ? 'Точно снять все галочки?' : 'Сбросить все галочки'}
          </button>
        </div>
      )}

      {tab === 'results' && (
        <div className={styles.grid}>
          <div className={styles.col}>
            <History scores={dash.scores} notes={dash.notes} />
          </div>
          <div className={styles.col}>
            <section className={styles.card} aria-label="Деньги">
              <div className={styles.cardHead}><h2>Деньги</h2><span className={styles.meta}>цель {fmt(PLAN_TARGET_USD)}</span></div>
              <p className={styles.big}>{fmt(stats.money)}</p>
              <div className={`${styles.thinBar} ${styles.goldBar}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс по деньгам">
                <i style={{ width: `${pct}%` }} />
              </div>
              <p className={styles.hint}>
                {nextLevel ? `До планки «${nextLevel.name}» — ${fmt(nextLevel.amount - stats.money)}` : 'Все планки взяты'}
              </p>
              <dl className={styles.stats}>
                <div><dt>задач закрыто</dt><dd>{stats.doneCount}</dd></div>
                <div><dt>{plural(stats.deals, 'сделка', 'сделки', 'сделок')} из {PLAN_DEALS_TOTAL}</dt><dd>{stats.deals}</dd></div>
                <div><dt>{plural(daysLeft, 'день', 'дня', 'дней')} до вылета</dt><dd>{daysLeft}</dd></div>
                <div><dt>{streak > 0 ? `${plural(streak, 'день', 'дня', 'дней')} подряд` : 'серии нет'}</dt><dd>{streak > 0 ? `🔥${streak}` : '—'}</dd></div>
              </dl>
            </section>

            <section className={styles.card} aria-label="Прокачка навыков">
              <div className={styles.cardHead}><h2>Прокачка</h2><span className={styles.meta}>{stats.xp.toLocaleString('ru-RU')} XP</span></div>
              <ul className={styles.list}>
                {SKILL_ORDER.map(sk => {
                  const xp = stats.bySkill[sk]
                  const { level, into, need } = levelOf(xp)
                  const { icon, name, hint, color } = SKILLS[sk]
                  return (
                    <li key={sk} className={styles.skill} style={{ '--sk': color } as React.CSSProperties}
                      title={`${hint}. Всего в плане ${SKILL_TOTALS[sk]} XP, набрано ${xp}`}>
                      <span aria-hidden="true">{icon}</span>
                      <div className={styles.skillBody}>
                        <div className={styles.skillTop}><b>{name}</b><span>ур. {level} · {into}/{need}</span></div>
                        <div className={styles.skillBar}><i style={{ width: `${(into / need) * 100}%` }} /></div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className={styles.card} aria-label="Достижения">
              <div className={styles.cardHead}><h2>Добыча</h2><span className={styles.meta}>{earned.size} из {ACHIEVEMENTS.length}</span></div>
              <div className={styles.awardGrid}>
                {ACHIEVEMENTS.map(a => (
                  <div key={a.id} className={`${styles.award} ${earned.has(a.id) ? styles.awardGot : ''}`} title={a.hint}>
                    <span aria-hidden="true">{a.icon}</span>
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      <p className={styles.footNote} role="status">
        {!loaded ? 'Загружаю…' : 'Переписка проверяется раз в час с 8:00 до 23:00. Секретарь: план в 8:00, пересборка в 13:00 и 17:00, итог в 21:00.'}
      </p>
    </div>
  )
}

// ─── Блоки ─────────────────────────────────────────────────────────────

const PRIORITY: Record<1 | 2 | 3, { label: string; cls: 'p1' | 'p2' | 'p3' }> = {
  1: { label: 'Срочно', cls: 'p1' },
  2: { label: 'Важно', cls: 'p2' },
  3: { label: 'Если успею', cls: 'p3' },
}

function AiRow({ task, chat, onToggle, onSent }: {
  task: AiTask
  chat?: CommChat
  onToggle: (id: number) => void
  onSent: () => void
}) {
  const done = task.status === 'done'
  const p = PRIORITY[task.priority] ?? PRIORITY[2]
  return (
    <li className={styles.item}>
      <label className={styles.task}>
        <input type="checkbox" checked={done} onChange={() => onToggle(task.id)} />
        <span className={styles.txt}>
          <span className={styles.taskTitle}>{task.title}</span>
          {task.detail && <span className={styles.detail}>{task.detail}</span>}
          <span className={styles.tags}>
            <span className={`${styles.prio} ${styles[p.cls]}`}>{p.label}</span>
            {chat?.goal
              ? <span className={styles.targetTag} title="Ваша цель с этим человеком">🎯 {chat.goal}</span>
              : task.goal && <span className={styles.goalTag}>{GOAL[task.goal]}</span>}
            {done && task.done_by === 'chat' && <span className={styles.autoOn}>💬 закрыто ответом в чате</span>}
            {!done && task.auto_close && <span className={styles.autoTag}>💬 закроется, когда напишешь</span>}
          </span>
        </span>
      </label>
      {task.chat_id != null && !done && (
        <Composer
          chatId={task.chat_id}
          chat={chat}
          initial={task.draft ? { text: task.draft, goal: task.goal ?? 'reply', why: '' } : null}
          onSent={onSent}
        />
      )}
    </li>
  )
}

const GOAL: Record<Draft['goal'], string> = { call: 'Цель: созвон', meeting: 'Цель: встреча', reply: 'Ответить' }

/**
 * Ссылка на чат в самом Telegram. Бот может написать человеку только в
 * течение суток после его последнего сообщения, поэтому основной путь —
 * личный чат: текст копируется, чат открывается, остаётся вставить.
 */
function tgHref(chatId: number, username: string | null | undefined): string {
  return username ? `https://t.me/${username}` : `tg://user?id=${chatId}`
}

/** Окно, в которое бот ещё может ответить от имени владельца. */
function botCanSend(chat?: CommChat): boolean {
  return !!chat?.last_in_ts && Date.now() - Date.parse(chat.last_in_ts) < 23.5 * 3_600_000
}

/**
 * Черновик сообщения человеку: готовый (от секретаря) или по кнопке
 * «Что написать?». Текст можно поправить, скопировать и открыть чат в
 * Telegram, а в окне 24 часов — отправить прямо отсюда.
 */
function Composer({ chatId, chat, initial, onSent }: {
  chatId: number
  chat?: CommChat
  initial: Draft | null
  onSent: () => void
}) {
  const [draft, setDraft] = useState<Draft | null>(initial)
  const [text, setText] = useState(initial?.text ?? '')
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<'idle' | 'loading' | 'sending' | 'copied' | 'sent' | 'error' | 'cap'>('idle')
  const [error, setError] = useState<string | null>(null)
  const href = tgHref(chatId, chat?.username)
  const canSend = botCanSend(chat)

  const ask = async () => {
    setState('loading'); setError(null)
    try {
      const r = await fetch('/api/plan/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId }),
      })
      if (r.status === 429) { setState('cap'); return }
      const j = await r.json() as { ok?: boolean; draft?: Draft }
      if (!r.ok || !j.draft) { setState('error'); setError('Секретарь не ответил, попробуй ещё раз'); return }
      setDraft(j.draft); setText(j.draft.text); setOpen(true); setState('idle')
    } catch { setState('error'); setError('Нет связи, попробуй ещё раз') }
  }

  const copyAndOpen = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* без буфера — хотя бы откроем чат */ }
    setState('copied')
    window.open(href, '_blank', 'noopener')
  }

  const send = async () => {
    setState('sending'); setError(null)
    try {
      const r = await fetch(`/api/admin/perepiska/${chatId}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      })
      const j = await r.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!r.ok || !j?.ok) { setState('error'); setError(j?.error ?? 'Telegram не принял сообщение — открой чат и отправь сам'); return }
      setState('sent')
      onSent()
    } catch { setState('error'); setError('Нет связи — открой чат и отправь сам') }
  }

  if (!draft || !open) {
    return (
      <div className={styles.composeBar}>
        {draft
          ? <button type="button" className={styles.linkBtn} onClick={() => setOpen(true)}>Черновик готов — показать</button>
          : <button type="button" className={styles.linkBtn} onClick={() => void ask()} disabled={state === 'loading'}>
              {state === 'loading' ? 'Пишу…' : 'Что написать?'}
            </button>}
        <a className={styles.linkBtn} href={href} target="_blank" rel="noopener">Открыть в Telegram</a>
        {state === 'cap' && <span className={styles.composeNote}>Лимит на ИИ на сегодня исчерпан</span>}
        {state === 'error' && error && <span className={styles.composeErr}>{error}</span>}
      </div>
    )
  }

  return (
    <div className={styles.compose}>
      {draft.why && (
        <div className={styles.composeHead}>
          <span className={styles.goalTag}>{GOAL[draft.goal]}</span>
          <span className={styles.composeNote}>{draft.why}</span>
        </div>
      )}
      <textarea
        className={styles.composeText}
        value={text}
        onChange={e => { setText(e.target.value); if (state === 'copied' || state === 'sent') setState('idle') }}
        rows={Math.min(10, Math.max(4, Math.ceil(text.length / 40)))}
        aria-label="Текст сообщения"
      />
      <div className={styles.composeBar}>
        <button type="button" className={styles.primaryBtn} onClick={() => void copyAndOpen()} disabled={!text.trim()}>
          {state === 'copied' ? 'Скопировано — вставь в чат' : 'Скопировать и открыть в Telegram'}
        </button>
        {canSend && (
          <button type="button" className={styles.ghostBtn} onClick={() => void send()} disabled={!text.trim() || state === 'sending' || state === 'sent'}>
            {state === 'sending' ? 'Отправляю…' : state === 'sent' ? 'Отправлено ✓' : 'Отправить отсюда'}
          </button>
        )}
        <button type="button" className={styles.linkBtn} onClick={() => void ask()} disabled={state === 'loading'}>
          {state === 'loading' ? 'Пишу…' : 'Другой вариант'}
        </button>
        <button type="button" className={styles.linkBtn} onClick={() => setOpen(false)}>Свернуть</button>
      </div>
      {!canSend && <p className={styles.composeNote}>Больше суток без сообщений от человека — Telegram не даст боту ответить. Отправь из своего чата.</p>}
      {state === 'cap' && <p className={styles.composeNote}>Лимит на ИИ на сегодня исчерпан.</p>}
      {state === 'error' && error && <p className={styles.composeErr}>{error}</p>}
    </div>
  )
}

/**
 * Как задачу видит переписка: «💬 3/10» — сколько набралось, «💬 Ольга,
 * 28 сен» — чем закрыта. Задачи без правила — без пометки.
 */
function AutoNote({ p, checked }: { p?: AutoProgress; checked: boolean }) {
  if (!p) return null
  if (!p.done) return <span className={styles.autoTag} title="Сколько набралось по переписке">💬 {p.have}/{p.need}</span>
  if (!checked) return <span className={styles.autoTag} title="Переписка закрыла задачу, но галочку сняли руками">💬 снято руками</span>
  const e = p.evidence.at(-1)
  const who = p.evidence.length > 1 ? `${p.evidence.length} шт.` : e?.contact ?? null
  return (
    <span className={styles.autoOn} title="Закрыто по переписке">
      💬 {who ? `${who}, ` : ''}{e ? dayMonth.format(new Date(`${e.day}T00:00:00Z`)) : 'по переписке'}
    </span>
  )
}

function Row({ task, done, auto, onToggle, note }: {
  task: PlanTask
  done: Set<string>
  auto?: AutoProgress
  onToggle: (taskId: string) => void
  note?: string
}) {
  return (
    <li className={styles.item}>
      <label className={styles.task}>
        <input type="checkbox" checked={done.has(task.id)} onChange={() => onToggle(task.id)} />
        <span className={styles.txt}>
          <span className={styles.taskTitle}>{task.text}</span>
          <span className={styles.tags}>
            {task.amount != null && <span className={styles.pay}>+{fmt(task.amount)}</span>}
            <span className={styles.skillTag}>{SKILLS[task.skill].name} +{task.xp}</span>
            <AutoNote p={auto} checked={done.has(task.id)} />
            {note != null && <span className={styles.age}>{note}</span>}
          </span>
        </span>
      </label>
    </li>
  )
}

/** Карточка со списком, где видны первые limit строк, остальное — по кнопке. */
function Collapsible<T>({ title, meta, items, limit, render, tone }: {
  title: string
  meta: string
  items: T[]
  limit: number
  render: (item: T) => React.ReactNode
  tone?: 'warn'
}) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, limit)
  return (
    <section className={`${styles.card} ${tone === 'warn' ? styles.warn : ''}`} aria-label={title}>
      <div className={styles.cardHead}><h2>{title}</h2><span className={styles.meta}>{meta}</span></div>
      <ul className={styles.list}>{shown.map(render)}</ul>
      {items.length > limit && (
        <button type="button" className={styles.linkBtn} onClick={() => setAll(v => !v)}>
          {all ? 'Свернуть' : `Показать все — ещё ${items.length - limit}`}
        </button>
      )}
    </section>
  )
}

function scoreTone(score: number): string {
  return score >= 70 ? styles.good : score >= 40 ? styles.mid : styles.low
}

function ScoreCard({ today, scores, onOpen }: { today: DayScore | null; scores: DayScore[]; onOpen: () => void }) {
  const avg = scores.length ? Math.round(scores.reduce((s, d) => s + d.score, 0) / scores.length) : null
  return (
    <section className={styles.card} aria-label="Эффективность">
      <div className={styles.cardHead}>
        <h2>Эффективность</h2>
        <button type="button" className={styles.linkBtn} onClick={onOpen}>По дням</button>
      </div>
      <div className={styles.scoreRow}>
        <p className={styles.big}>
          <span className={today ? scoreTone(today.score) : undefined}>{today ? today.score : '—'}</span>
          <span className={styles.of}> / 100 сегодня</span>
        </p>
        {avg !== null && <p className={styles.meta}>в среднем {avg} за {scores.length} {plural(scores.length, 'день', 'дня', 'дней')}</p>}
      </div>
      <Bars scores={scores} />
      {today && <Breakdown s={today} />}
    </section>
  )
}

function Bars({ scores }: { scores: DayScore[] }) {
  return (
    <div className={styles.bars} role="img" aria-label={`Оценки по дням: ${scores.map(s => s.score).join(', ')}`}>
      {scores.map(s => (
        <div key={s.day} className={styles.barCol} title={`${dayMonth.format(new Date(`${s.day}T00:00:00Z`))}: ${s.score}/100`}>
          <span className={styles.barTrack}>
            <span className={`${styles.barFill} ${scoreTone(s.score)}`} style={{ height: `${Math.max(4, s.score)}%` }} />
          </span>
          <span className={styles.barDay}>{weekdayShort.format(new Date(`${s.day}T00:00:00Z`)).slice(0, 2)}</span>
        </div>
      ))}
    </div>
  )
}

function Breakdown({ s }: { s: DayScore }) {
  const parts: Array<[string, string]> = [
    ['План квеста', s.plan ? `${s.plan.done} из ${s.plan.total}` : 'не было задач'],
    ['Задачи секретаря', s.ai ? `${s.ai.done} из ${s.ai.total}` : 'не ставились'],
    ['Результат', `${s.result.points} из ${s.result.target} · ${s.result.steps} ${plural(s.result.steps, 'шаг', 'шага', 'шагов')}`],
    ['Ответы за сутки', s.replies ? `${s.replies.answered} из ${s.replies.total}` : 'не писали'],
  ]
  return (
    <dl className={styles.breakdown}>
      {parts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  )
}

function History({ scores, notes }: { scores: DayScore[]; notes: DayNote[] }) {
  const byDay = new Map(notes.map(n => [n.day, n]))
  const list = [...scores].reverse()
  return (
    <section className={styles.card} aria-label="Дни">
      <div className={styles.cardHead}>
        <h2>Как проходили дни</h2>
        <span className={styles.meta}>{scores.length} {plural(scores.length, 'день', 'дня', 'дней')}</span>
      </div>
      <Bars scores={scores} />
      {list.length === 0 && <p className={styles.hint}>История появится с первым днём.</p>}
      <ul className={styles.days}>
        {list.map(s => {
          const n = byDay.get(s.day)
          return (
            <li key={s.day} className={styles.dayItem}>
              <div className={styles.dayHead}>
                <b>{weekdayLong.format(new Date(`${s.day}T00:00:00Z`))}</b>
                <span className={`${styles.scorePill} ${scoreTone(s.score)}`}>{s.score}</span>
              </div>
              {n?.review && <p className={styles.review}>{n.review}</p>}
              <Breakdown s={s} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function UpcomingCard({ upcoming, today }: { upcoming: Upcoming[]; today: string }) {
  // Встречи от бота плюс ближайшие дни квеста с делами.
  const next = PLAN.flatMap(w => w.days).filter(d => d.iso > today && d.tasks.some(t => !t.waiting)).slice(0, 2)
  return (
    <section className={styles.card} aria-label="Ближайшее">
      <div className={styles.cardHead}><h2>Ближайшее</h2></div>
      {upcoming.length === 0 && next.length === 0 && <p className={styles.hint}>Впереди пусто.</p>}
      {upcoming.length > 0 && (
        <ul className={styles.list}>
          {upcoming.slice(0, 6).map(u => (
            <li key={u.id} className={styles.meet}>
              <span className={styles.meetWhen}>{whenFmt.format(new Date(u.starts_at))}</span>
              <span className={styles.meetWhat}>
                <b>{u.topic ?? 'Встреча'}</b>
                <span>{[u.contact, u.place].filter(Boolean).join(' · ')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {next.map(d => (
        <div key={d.id}>
          <h3 className={styles.sub}>{d.label}<span>по плану</span></h3>
          <ul className={styles.plainList}>
            {d.tasks.filter(t => !t.waiting).map(t => <li key={t.id}>{t.text}</li>)}
          </ul>
        </div>
      ))}
    </section>
  )
}

const ROLE_LABEL: Record<string, string> = { agent: 'Агент', developer: 'Застройщик', client: 'Клиент' }

type GoalSaver = (chatId: number, goal: string) => Promise<boolean>

function CommRow({ chat, compact, onSent, onGoal }: { chat: CommChat; compact?: boolean; onSent: () => void; onGoal: GoalSaver }) {
  const waiting = chat.waiting_since != null
  return (
    <li className={styles.commItem}>
      <div className={styles.comm}>
        <span className={styles.avatar} aria-hidden="true">{chat.name.slice(0, 1).toUpperCase()}</span>
        <span className={styles.commBody}>
          <span className={styles.commTop}>
            <a className={styles.commName} href={tgHref(chat.chat_id, chat.username)} target="_blank" rel="noopener">{chat.name}</a>
            {chat.role && ROLE_LABEL[chat.role] && <span className={styles.roleTag}>{ROLE_LABEL[chat.role]}</span>}
            {!compact && chat.crm && <span className={styles.crmTag}>{chat.crm.title}</span>}
          </span>
          <span className={styles.commText}>{chat.last_dir === 'out' ? 'Вы: ' : ''}{chat.last_text || '—'}</span>
          <GoalEditor chat={chat} onGoal={onGoal} />
        </span>
        <span className={`${styles.commWhen} ${waiting ? styles.commWait : ''}`}>
          {waiting ? `ждёт ${since(chat.waiting_since!)}` : since(chat.last_ts)}
        </span>
      </div>
      <Composer chatId={chat.chat_id} chat={chat} initial={null} onSent={onSent} />
    </li>
  )
}

/**
 * Цель по человеку: «🎯 Подписать фикс». По клику — поле и готовые
 * варианты. Секретарь строит под неё план дня и черновики.
 */
function GoalEditor({ chat, onGoal }: { chat: CommChat; onGoal: GoalSaver }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(chat.goal ?? '')
  const [saving, setSaving] = useState(false)

  const save = async (goal: string) => {
    setSaving(true)
    const ok = await onGoal(chat.chat_id, goal)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={chat.goal ? styles.targetBtn : styles.targetAdd}
        onClick={() => { setValue(chat.goal ?? ''); setEditing(true) }}
        title={chat.goal ? 'Изменить цель' : 'Поставить цель'}
      >
        🎯 {chat.goal ?? 'Поставить цель'}
      </button>
    )
  }

  return (
    <form className={styles.goalForm} onSubmit={e => { e.preventDefault(); void save(value) }}>
      <input
        className={styles.goalInput}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Чего хотите добиться: подписать фикс до 15 октября…"
        maxLength={300}
        autoFocus
        aria-label={`Цель с ${chat.name}`}
      />
      <div className={styles.goalPresets}>
        {GOAL_PRESETS.map(g => (
          <button key={g} type="button" className={styles.presetChip} onClick={() => setValue(g)}>{g}</button>
        ))}
      </div>
      <div className={styles.composeBar}>
        <button type="submit" className={styles.primaryBtn} disabled={saving || !value.trim()}>{saving ? 'Сохраняю…' : 'Сохранить'}</button>
        {chat.goal && <button type="button" className={styles.linkBtn} onClick={() => void save('')} disabled={saving}>Убрать цель</button>}
        <button type="button" className={styles.linkBtn} onClick={() => setEditing(false)}>Отмена</button>
      </div>
    </form>
  )
}

const GUEST_GROUPS: Array<{ status: GuestStatus; title: string; short: string }> = [
  { status: 'yes', title: 'Придут', short: 'придут' },
  { status: 'interested', title: 'Думают', short: 'думают' },
  { status: 'invited', title: 'Без ответа', short: 'молчат' },
  { status: 'no', title: 'Не смогут', short: 'не смогут' },
]

const GUEST_LABEL: Record<GuestStatus, string> = { yes: 'Придёт', interested: 'Думает', invited: 'Не ответил', no: 'Не сможет' }

/**
 * Мероприятие: кого позвали и кто что ответил — по переписке, раз в час.
 * «Придут» раскрыты всегда, остальные группы — по кнопке.
 */
function EventCard({ info, guests, today, commsById, onStatus, onSent }: {
  info: EventInfo
  guests: EventGuest[]
  today: string
  commsById: Map<number, CommChat>
  onStatus: (chatId: number, status: GuestStatus) => void
  onSent: () => void
}) {
  const [open, setOpen] = useState<GuestStatus | null>(null)
  const by = (st: GuestStatus) => guests.filter(g => g.status === st).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const yes = by('yes')
  const heads = yes.reduce((n, g) => n + 1 + g.plus_ones, 0)
  const daysTo = Math.round((Date.parse(`${info.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  const when = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${info.date}T00:00:00Z`))

  return (
    <section className={`${styles.card} ${styles.eventCard}`} aria-label={info.title}>
      <div className={styles.cardHead}>
        <h2>🔥 {info.title}</h2>
        <span className={styles.meta}>{daysTo === 0 ? 'сегодня' : `через ${daysTo} ${plural(daysTo, 'день', 'дня', 'дней')}`}</span>
      </div>
      <p className={styles.hint}>{when}, {info.time} · {info.place}</p>

      <div className={styles.eventStats}>
        {GUEST_GROUPS.map(g => {
          const n = by(g.status).length
          return (
            <button key={g.status} type="button" aria-pressed={open === g.status || (g.status === 'yes' && open === null)}
              className={`${styles.eventStat} ${styles[`g_${g.status}`]}`}
              onClick={() => setOpen(cur => (cur === g.status ? null : g.status))}>
              <b>{g.status === 'yes' ? heads : n}</b>
              <span>{g.status === 'yes' && heads !== n ? `придут (${n} + ${heads - n})` : g.short}</span>
            </button>
          )
        })}
      </div>

      {guests.length === 0 && <p className={styles.hint}>Список появится, когда трекер прочитает переписку (раз в час).</p>}

      {GUEST_GROUPS.filter(g => g.status === 'yes' || open === g.status).map(g => {
        const list = by(g.status)
        if (g.status === 'yes' && open !== null && open !== 'yes' && list.length === 0) return null
        return (
          <div key={g.status}>
            <h3 className={styles.sub}>{g.title}<span>{list.length}</span></h3>
            {list.length === 0
              ? <p className={styles.hint}>{g.status === 'yes' ? 'Пока никто не подтвердил.' : 'Никого.'}</p>
              : (
                <ul className={styles.list}>
                  {list.map(guest => (
                    <GuestRow key={guest.chat_id} guest={guest} chat={commsById.get(guest.chat_id)} onStatus={onStatus} onSent={onSent} />
                  ))}
                </ul>
              )}
          </div>
        )
      })}
    </section>
  )
}

function GuestRow({ guest, chat, onStatus, onSent }: {
  guest: EventGuest
  chat?: CommChat
  onStatus: (chatId: number, status: GuestStatus) => void
  onSent: () => void
}) {
  return (
    <li className={styles.guest}>
      <div className={styles.guestTop}>
        <span className={styles.guestMain}>
          <a className={styles.commName} href={tgHref(guest.chat_id, guest.username)} target="_blank" rel="noopener">{guest.name}</a>
          {guest.plus_ones > 0 && <span className={styles.plusOne}>+{guest.plus_ones}</span>}
          {guest.note && <span className={styles.guestNote}>{guest.note}</span>}
          {guest.quote && <span className={styles.guestQuote}>«{guest.quote}»</span>}
        </span>
        <select
          className={styles.guestSelect}
          value={guest.status}
          onChange={e => onStatus(guest.chat_id, e.target.value as GuestStatus)}
          aria-label={`Статус: ${guest.name}`}
          title={guest.manual ? 'Поставлено вами' : 'Определено по переписке'}
        >
          {(Object.keys(GUEST_LABEL) as GuestStatus[]).map(st => <option key={st} value={st}>{GUEST_LABEL[st]}</option>)}
        </select>
      </div>
      {guest.status !== 'no' && <Composer chatId={guest.chat_id} chat={chat ?? undefined} initial={null} onSent={onSent} />}
    </li>
  )
}

type RoleFilter = 'all' | 'agent' | 'developer' | 'client'

function CommsTab({ comms, loaded, onSent, onGoal }: { comms: CommChat[]; loaded: boolean; onSent: () => void; onGoal: GoalSaver }) {
  const [role, setRole] = useState<RoleFilter>('all')
  const list = role === 'all' ? comms : comms.filter(c => c.role === role)
  const count = (r: RoleFilter) => (r === 'all' ? comms.length : comms.filter(c => c.role === r).length)
  // Сначала люди с целями — ради них всё и ведётся, дальше очереди ответов.
  const goals = list.filter(c => c.goal)
  const rest0 = list.filter(c => !c.goal)
  const waitMe = rest0.filter(c => c.waiting_since).sort((a, b) => a.waiting_since!.localeCompare(b.waiting_since!))
  const waitThem = rest0.filter(c => !c.waiting_since && c.last_dir === 'out' && Date.now() - Date.parse(c.last_ts) > 2 * 86_400_000)
  const shown = new Set([...goals, ...waitMe, ...waitThem].map(c => c.chat_id))
  const rest = list.filter(c => !shown.has(c.chat_id))
  const filters: Array<[RoleFilter, string]> = [['all', 'Все'], ['agent', 'Агенты'], ['developer', 'Застройщики'], ['client', 'Клиенты']]

  return (
    <div className={styles.commsWrap}>
      <div className={styles.chips} role="group" aria-label="Кто">
        {filters.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={role === key}
            className={`${styles.chip} ${role === key ? styles.chipOn : ''}`} onClick={() => setRole(key)}>
            {label} <span>{count(key)}</span>
          </button>
        ))}
      </div>
      {!loaded && <p className={styles.hint}>Загружаю переписку…</p>}
      {loaded && list.length === 0 && <p className={styles.hint}>За последний месяц переписки нет.</p>}
      {loaded && goals.length === 0 && list.length > 0 && (
        <p className={styles.hint}>Нажмите «🎯 Поставить цель» у человека — секретарь будет вести разговор к ней.</p>
      )}
      <CommGroup title="Ваши цели" hint="Секретарь ведёт разговор с каждым к вашей цели" items={goals} onSent={onSent} onGoal={onGoal} />
      <CommGroup title="Ждут вашего ответа" hint="Написали вам — ответа ещё нет" items={waitMe} tone="warn" onSent={onSent} onGoal={onGoal} />
      <CommGroup title="Ждёте вы" hint="Вы написали больше двух дней назад — ответа нет. Самое время напомнить о себе" items={waitThem} limit={10} onSent={onSent} onGoal={onGoal} />
      <CommGroup title="Остальные" hint="Последний месяц, свежие сверху" items={rest} limit={20} onSent={onSent} onGoal={onGoal} />
    </div>
  )
}

function CommGroup({ title, hint, items, tone, limit, onSent, onGoal }: {
  title: string
  hint: string
  items: CommChat[]
  tone?: 'warn'
  limit?: number
  onSent: () => void
  onGoal: GoalSaver
}) {
  const [all, setAll] = useState(false)
  if (items.length === 0) return null
  const shown = limit && !all ? items.slice(0, limit) : items
  return (
    <section className={`${styles.card} ${tone === 'warn' ? styles.warn : ''}`} aria-label={title}>
      <div className={styles.cardHead}><h2>{title}</h2><span className={styles.meta}>{items.length}</span></div>
      <p className={styles.hint}>{hint}</p>
      <ul className={styles.list}>{shown.map(c => <CommRow key={c.chat_id} chat={c} onSent={onSent} onGoal={onGoal} />)}</ul>
      {limit && items.length > limit && (
        <button type="button" className={styles.linkBtn} onClick={() => setAll(v => !v)}>
          {all ? 'Свернуть' : `Показать все — ещё ${items.length - limit}`}
        </button>
      )}
    </section>
  )
}

// ─── Штаб: главный экран ────────────────────────────────────────────

/** День по Бали для метки времени. */
function baliDayOf(ts: string): string {
  return new Date(Date.parse(ts) + 8 * 3_600_000).toISOString().slice(0, 10)
}

function HqTab({ today, money, deals, daysLeft, event, upcoming, score, waiting, done, onToggle, onOpen }: {
  today: string
  money: number
  deals: number
  daysLeft: number
  event: { info: EventInfo; guests: EventGuest[] } | null
  upcoming: Upcoming[]
  score: DayScore | null
  waiting: number
  done: Set<string>
  onToggle: (taskId: string) => void
  onOpen: (tab: Tab) => void
}) {
  // Обещания со сроком: сколько уже наступило и сколько из них сдержано.
  const promises = PEOPLE.flatMap(p => p.tasks.filter(t => t.who === 'me' && t.due).map(t => ({ ...t, person: p })))
  const dueNow = promises.filter(t => t.due! <= today)
  const kept = dueNow.filter(t => done.has(t.id)).length
  const late = dueNow.filter(t => !done.has(t.id) && t.due! < today).length
  const burning = dueNow.filter(t => !done.has(t.id)).length
  const nextPromises = promises.filter(t => !done.has(t.id)).sort((a, b) => a.due!.localeCompare(b.due!)).slice(0, 8)

  const guests = event?.guests ?? []
  const yes = guests.filter(g => g.status === 'yes').reduce((n, g) => n + 1 + g.plus_ones, 0)
  const maybe = guests.filter(g => g.status === 'interested').length
  const meetingsToday = upcoming.filter(u => baliDayOf(u.starts_at) === today).length

  const main = FOCUS.filter(f => f.level === 'main')
  const second = FOCUS.filter(f => f.level === 'second')
  const focusDone = FOCUS.filter(f => done.has(f.id)).length

  const eventTarget = PROJECTS.find(p => p.event)?.event?.target ?? 15
  const badges: Array<{ icon: string; name: string; hint: string; on: boolean }> = [
    { icon: '🎯', name: 'Фокус дня', hint: 'Три главные задачи закрыты', on: main.every(f => done.has(f.id)) },
    { icon: '🤝', name: 'Слово держу', hint: 'Все обещания со сроком на сегодня выполнены', on: dueNow.length > 0 && burning === 0 },
    { icon: '📭', name: 'Никто не ждёт', hint: 'Ответили всем, кто написал', on: waiting === 0 },
    { icon: '🏡', name: 'Полный дом', hint: `${eventTarget}+ гостей подтвердили встречу`, on: yes >= eventTarget },
    { icon: '💰', name: 'Первая сделка', hint: 'Сделка закрыта и отмечена в плане', on: deals >= 1 },
    { icon: '🏗', name: 'Третий фикс', hint: 'Ещё один застройщик на ежемесячной оплате', on: QUARTER.fix.have >= 3 },
  ]

  return (
    <div className={styles.grid}>
      <div className={styles.col}>
        <section className={`${styles.card} ${styles.hero}`} aria-label="Фокус дня">
          <div className={styles.cardHead}>
            <h2>Фокус дня</h2>
            <span className={styles.meta}>{focusDone} из {FOCUS.length}</span>
          </div>
          <span className={styles.thinBar}><i style={{ width: `${(focusDone / FOCUS.length) * 100}%` }} /></span>
          <p className={styles.sub}>Главное <span>без этого день не удался</span></p>
          <ul className={styles.list}>{main.map(f => <FocusRow key={f.id} item={f} done={done} today={today} onToggle={onToggle} />)}</ul>
          <p className={styles.sub}>Второстепенное <span>если останется время</span></p>
          <ul className={styles.list}>{second.map(f => <FocusRow key={f.id} item={f} done={done} today={today} onToggle={onToggle} />)}</ul>
        </section>

        <section className={styles.card} aria-label="Проекты">
          <div className={styles.cardHead}><h2>Проекты</h2><span className={styles.meta}>{PROJECTS.length}</span></div>
          <ul className={styles.list}>
            {PROJECTS.map(p => <ProjectRow key={p.key} project={p} today={today} yes={yes} maybe={maybe} />)}
          </ul>
        </section>

        <section className={styles.card} aria-label="Разбор работы">
          <div className={styles.cardHead}><h2>Разбор работы</h2><span className={styles.meta}>по переписке за {REVIEW.period}</span></div>
          <ReviewList title="Что получается" tone="good" items={REVIEW.good} />
          <ReviewList title="Что мешает" tone="bad" items={REVIEW.bad} />
          <ReviewList title="Что улучшить" tone="improve" items={REVIEW.improve} />
        </section>
      </div>

      <div className={styles.col}>
        <section className={styles.card} aria-label="Цели квартала">
          <div className={styles.cardHead}><h2>Цели до Гоа</h2><span className={styles.meta}>{daysLeft} {plural(daysLeft, 'день', 'дня', 'дней')}</span></div>
          <Goal label="Деньги" value={fmt(money)} of={fmt(PLAN_TARGET_USD)} pct={money / PLAN_TARGET_USD} />
          <Goal label="Сделки" value={String(deals)} of={String(PLAN_DEALS_TOTAL)} pct={deals / PLAN_DEALS_TOTAL} />
          <Goal label="Застройщики на фиксе" value={String(QUARTER.fix.have)} of={String(QUARTER.fix.target)} pct={QUARTER.fix.have / QUARTER.fix.target} note={QUARTER.fix.note} />
        </section>

        <section className={styles.card} aria-label="Сегодня в цифрах">
          <div className={styles.cardHead}><h2>Сегодня в цифрах</h2></div>
          <div className={styles.kpis}>
            <Kpi value={score ? String(score.score) : '—'} label="оценка дня" />
            <Kpi value={String(waiting)} label="ждут ответа" tone={waiting > 0 ? 'bad' : 'good'} onClick={() => onOpen('comms')} />
            <Kpi value={String(burning)} label="обещаний горит" tone={burning > 0 ? 'bad' : 'good'} onClick={() => onOpen('people')} />
            <Kpi value={String(meetingsToday)} label={plural(meetingsToday, 'встреча', 'встречи', 'встреч')} />
          </div>
          <p className={styles.hint}>
            Слово держу: {dueNow.length ? `${kept} из ${dueNow.length} обещаний со сроком выполнены` : 'обещаний со сроком пока нет'}
            {late > 0 ? `, ${late} ${plural(late, 'просрочено', 'просрочено', 'просрочено')}` : ''}
          </p>
          {dueNow.length > 0 && <span className={styles.thinBar}><i style={{ width: `${(kept / dueNow.length) * 100}%` }} /></span>}
        </section>

        <section className={styles.card} aria-label="Обещания">
          <div className={styles.cardHead}>
            <h2>Кому что обещали</h2>
            <button type="button" className={styles.linkBtn} onClick={() => onOpen('people')}>Все по людям</button>
          </div>
          {nextPromises.length === 0 && <p className={styles.hint}>Все обещания со сроком выполнены</p>}
          <ul className={styles.list}>
            {nextPromises.map(t => {
              const d = dueLabel(t.due!, today)
              return (
                <li key={t.id}>
                  <label className={styles.task}>
                    <input type="checkbox" checked={done.has(t.id)} onChange={() => onToggle(t.id)} />
                    <span className={styles.txt}>
                      <span className={styles.taskTitle}><b>{t.person.name}:</b> {t.text}</span>
                      <span className={styles.tags}><span className={d.late ? styles.dueLate : styles.due}>{d.text}</span></span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={styles.card} aria-label="Значки">
          <div className={styles.cardHead}><h2>Значки</h2><span className={styles.meta}>{badges.filter(b => b.on).length} из {badges.length}</span></div>
          <ul className={styles.badges}>
            {badges.map(b => (
              <li key={b.name} className={b.on ? styles.badgeOn : styles.badgeOff} title={b.hint}>
                <span aria-hidden="true">{b.icon}</span>
                <b>{b.name}</b>
                <em>{b.hint}</em>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.footNote}>Штаб собран по переписке на {dayMonth.format(new Date(`${HQ_AS_OF}T00:00:00Z`))} Цифры обновляются сами, фокус и разбор — по просьбе «обнови штаб»</p>
      </div>
    </div>
  )
}

function FocusRow({ item, done, today, onToggle }: { item: typeof FOCUS[number]; done: Set<string>; today: string; onToggle: (id: string) => void }) {
  const due = item.due && !done.has(item.id) ? dueLabel(item.due, today) : null
  return (
    <li>
      <label className={styles.task}>
        <input type="checkbox" checked={done.has(item.id)} onChange={() => onToggle(item.id)} />
        <span className={styles.txt}>
          <span className={styles.taskTitle}>{item.text}</span>
          <span className={styles.detail}>{item.why}</span>
          {due && <span className={styles.tags}><span className={due.late ? styles.dueLate : styles.due}>{due.text}</span></span>}
        </span>
      </label>
    </li>
  )
}

function ProjectRow({ project, today, yes, maybe }: { project: Project; today: string; yes: number; maybe: number }) {
  const stagesDone = project.stages.filter(s => s.done).length
  const next = project.stages.find(s => !s.done)
  const days = project.date ? Math.round((Date.parse(`${project.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) : null
  return (
    <li className={styles.project}>
      <div className={styles.projectHead}>
        <b>{project.title}</b>
        {days != null && <span className={days <= 2 ? styles.dueLate : styles.due}>{days < 0 ? 'прошло' : days === 0 ? 'сегодня' : `через ${days} ${plural(days, 'день', 'дня', 'дней')}`}</span>}
      </div>
      <p className={styles.detail}>{project.goal}</p>
      <div className={styles.projectBar}>
        <span className={styles.thinBar}><i style={{ width: `${(stagesDone / project.stages.length) * 100}%` }} /></span>
        <span className={styles.meta}>этап {Math.min(stagesDone + 1, project.stages.length)} из {project.stages.length}</span>
      </div>
      {project.event && (
        <p className={styles.projectGuests}>
          Гости: <b>{yes}</b> подтвердили из цели {project.event.target}{maybe > 0 ? `, ещё ${maybe} думают` : ''}
        </p>
      )}
      {next && <p className={styles.personNext}><b>Сейчас:</b> {next.text}</p>}
      <p className={styles.detail}>{project.now}</p>
    </li>
  )
}

function Goal({ label, value, of, pct, note }: { label: string; value: string; of: string; pct: number; note?: string }) {
  return (
    <div className={styles.goal}>
      <div className={styles.goalHead}><span>{label}</span><b>{value} <em>из {of}</em></b></div>
      <span className={styles.thinBar}><i style={{ width: `${Math.min(100, pct * 100)}%` }} /></span>
      {note && <p className={styles.goalNote}>{note}</p>}
    </div>
  )
}

function Kpi({ value, label, tone, onClick }: { value: string; label: string; tone?: 'good' | 'bad'; onClick?: () => void }) {
  const cls = `${styles.kpi} ${tone === 'bad' ? styles.kpiBad : tone === 'good' ? styles.kpiGood : ''}`
  const body = <><b>{value}</b><span>{label}</span></>
  return onClick
    ? <button type="button" className={cls} onClick={onClick}>{body}</button>
    : <div className={cls}>{body}</div>
}

function ReviewList({ title, tone, items }: { title: string; tone: 'good' | 'bad' | 'improve'; items: string[] }) {
  const cls = tone === 'good' ? styles.revGood : tone === 'bad' ? styles.revBad : styles.revImprove
  return (
    <>
      <p className={styles.sub}>{title}</p>
      <ul className={`${styles.review} ${cls}`}>{items.map(t => <li key={t}>{t}</li>)}</ul>
    </>
  )
}

// ─── По людям: договорённости из переписки ──────────────────────────

const KIND_LABEL: Record<PersonKind, string> = {
  agent: 'Агент', developer: 'Застройщик', client: 'Клиент', team: 'Команда', other: 'Другое',
}

type KindFilter = 'all' | 'agent' | 'developer' | 'client' | 'team'

const KIND_FILTERS: Array<[KindFilter, string]> = [
  ['all', 'Все'], ['agent', 'Агенты'], ['developer', 'Застройщики'], ['client', 'Клиенты'], ['team', 'Команда и прочие'],
]

function kindMatches(filter: KindFilter, kind: PersonKind): boolean {
  if (filter === 'all') return true
  if (filter === 'team') return kind === 'team' || kind === 'other'
  return filter === kind
}

function tgLink(chat: number | null, username: string | null): string | null {
  if (username) return `https://t.me/${username}`
  return chat != null ? `tg://user?id=${chat}` : null
}

/** «сегодня», «до 2 окт.», «просрочено 3 дн» — от дня по Бали. */
function dueLabel(due: string, today: string): { text: string; late: boolean } {
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  if (days < 0) return { text: `просрочено ${-days} ${plural(-days, 'день', 'дня', 'дней')}`, late: true }
  if (days === 0) return { text: 'сегодня', late: true }
  if (days === 1) return { text: 'завтра', late: false }
  return { text: `до ${dayMonth.format(new Date(`${due}T00:00:00Z`))}`, late: false }
}

function PeopleTab({ done, today, commsById, onToggle }: {
  done: Set<string>
  today: string
  commsById: Map<number, CommChat>
  onToggle: (taskId: string) => void
}) {
  const [kind, setKind] = useState<KindFilter>('all')
  const list = PEOPLE.filter(p => kindMatches(kind, p.kind))
  const open = (p: Person) => p.tasks.filter(t => !done.has(t.id))
  const earliest = (p: Person) => open(p).filter(t => t.due).map(t => t.due!).sort()[0] ?? '9999'

  // Горит — есть моё обещание со сроком сегодня или раньше. Дальше мои
  // обещания без срока или с запасом, потом — где ход за человеком.
  const burning = list.filter(p => open(p).some(t => t.due && t.due <= today))
    .sort((a, b) => earliest(a).localeCompare(earliest(b)))
  const burnSet = new Set(burning)
  const mine = list.filter(p => !burnSet.has(p) && open(p).some(t => t.who === 'me'))
    .sort((a, b) => earliest(a).localeCompare(earliest(b)))
  const theirs = list.filter(p => open(p).length > 0 && open(p).every(t => t.who === 'them'))
  const finished = list.filter(p => open(p).length === 0)

  const silent = SILENT.filter(s => kindMatches(kind, s.kind))
  const closed = CLOSED.filter(c => kindMatches(kind, c.kind))

  const all = PEOPLE.flatMap(p => p.tasks)
  const myOpen = all.filter(t => t.who === 'me' && !done.has(t.id)).length
  const theirOpen = all.filter(t => t.who === 'them' && !done.has(t.id)).length
  const count = (f: KindFilter) => PEOPLE.filter(p => kindMatches(f, p.kind)).length

  return (
    <div className={styles.commsWrap}>
      <p className={styles.peopleIntro}>
        Разобрал всю переписку по {dayMonth.format(new Date(`${PEOPLE_AS_OF}T00:00:00Z`))} включительно, вместе с голосовыми.
        {' '}<b>{myOpen}</b> {plural(myOpen, 'обещание', 'обещания', 'обещаний')} за вами, <b>{theirOpen}</b> ждём от людей.
      </p>
      <div className={styles.chips} role="group" aria-label="Кто">
        {KIND_FILTERS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={kind === key}
            className={`${styles.chip} ${kind === key ? styles.chipOn : ''}`} onClick={() => setKind(key)}>
            {label} <span>{count(key)}</span>
          </button>
        ))}
      </div>
      <PeopleGroup title="Горит" hint="Срок сегодня или уже прошёл — ваш или человека" items={burning} tone="warn"
        done={done} today={today} commsById={commsById} onToggle={onToggle} />
      <PeopleGroup title="Обещали вы" hint="Что вы сказали, что сделаете. Сначала — у чего ближе срок" items={mine}
        done={done} today={today} commsById={commsById} onToggle={onToggle} />
      <PeopleGroup title="Ждёте вы" hint="Ход за человеком. Если молчит дольше пары дней — напомнить" items={theirs}
        done={done} today={today} commsById={commsById} onToggle={onToggle} />
      <PeopleGroup title="Всё закрыто" hint="Все договорённости выполнены" items={finished} limit={0}
        done={done} today={today} commsById={commsById} onToggle={onToggle} />

      {silent.length > 0 && (
        <section className={styles.card} aria-label="Молчат">
          <div className={styles.cardHead}><h2>Молчат после вашего сообщения</h2><span className={styles.meta}>{silent.length}</span></div>
          <p className={styles.hint}>Написали первым — ответа нет. Дожать одним сообщением или отпустить</p>
          <ul className={styles.nameList}>
            {silent.map(s => (
              <li key={s.chat}>
                <a href={tgLink(s.chat, s.username)!} target="_blank" rel="noopener">{s.name}</a>
                <span>{s.sent}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {closed.length > 0 && <ClosedCard items={closed} />}
    </div>
  )
}

function PeopleGroup({ title, hint, items, tone, limit, done, today, commsById, onToggle }: {
  title: string
  hint: string
  items: Person[]
  tone?: 'warn'
  /** 0 — свёрнуто целиком, пока не нажмут. */
  limit?: number
  done: Set<string>
  today: string
  commsById: Map<number, CommChat>
  onToggle: (taskId: string) => void
}) {
  const [all, setAll] = useState(false)
  if (items.length === 0) return null
  const shown = limit != null && !all ? items.slice(0, limit) : items
  return (
    <section className={`${styles.card} ${tone === 'warn' ? styles.warn : ''}`} aria-label={title}>
      <div className={styles.cardHead}><h2>{title}</h2><span className={styles.meta}>{items.length}</span></div>
      <p className={styles.hint}>{hint}</p>
      {shown.length > 0 && (
        <ul className={styles.list}>
          {shown.map(p => <PersonRow key={p.tasks[0]?.id ?? p.name} person={p} done={done} today={today}
            chat={p.chat != null ? commsById.get(p.chat) : undefined} onToggle={onToggle} />)}
        </ul>
      )}
      {limit != null && items.length > limit && (
        <button type="button" className={styles.linkBtn} onClick={() => setAll(v => !v)}>
          {all ? 'Свернуть' : limit === 0 ? `Показать — ${items.length}` : `Показать все — ещё ${items.length - limit}`}
        </button>
      )}
    </section>
  )
}

function PersonRow({ person, chat, done, today, onToggle }: {
  person: Person
  chat?: CommChat
  done: Set<string>
  today: string
  onToggle: (taskId: string) => void
}) {
  const href = tgLink(person.chat, person.username)
  // Открытые сверху: сначала всё со сроком, потом мои без срока, потом чужие.
  const rank = (t: PersonTask) => (done.has(t.id) ? 3 : t.due ? 0 : t.who === 'me' ? 1 : 2)
  const tasks = [...person.tasks].sort((a, b) => rank(a) - rank(b) || (a.due ?? '').localeCompare(b.due ?? ''))
  const waiting = chat?.waiting_since != null
  return (
    <li className={styles.commItem}>
      <div className={styles.comm}>
        <span className={styles.avatar} aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>
        <span className={styles.commBody}>
          <span className={styles.commTop}>
            {href
              ? <a className={styles.commName} href={href} target="_blank" rel="noopener">{person.name}</a>
              : <b>{person.name}</b>}
            <span className={styles.roleTag}>{KIND_LABEL[person.kind]}</span>
          </span>
          <span className={styles.personAbout}>{person.about}</span>
        </span>
        {chat && (
          <span className={`${styles.commWhen} ${waiting ? styles.commWait : ''}`}>
            {waiting ? `ждёт ${since(chat.waiting_since!)}` : since(chat.last_ts)}
          </span>
        )}
      </div>
      <p className={styles.personStatus}>{person.status}</p>
      <p className={styles.personNext}><b>Следующий шаг:</b> {person.next}</p>
      {person.draft && <DraftBox text={person.draft} href={href} />}
      <ul className={styles.personTasks}>
        {tasks.map(t => {
          const due = t.due && !done.has(t.id) ? dueLabel(t.due, today) : null
          return (
            <li key={t.id}>
              <label className={styles.task}>
                <input type="checkbox" checked={done.has(t.id)} onChange={() => onToggle(t.id)} />
                <span className={styles.txt}>
                  <span className={styles.taskTitle}>{t.text}</span>
                  <span className={styles.tags}>
                    <span className={t.who === 'me' ? styles.whoMe : styles.whoThem}>{t.who === 'me' ? 'За вами' : 'Ждём'}</span>
                    {due && <span className={due.late ? styles.dueLate : styles.due}>{due.text}</span>}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </li>
  )
}

/** Готовый текст: скопировать и сразу открыть чат в Telegram. */
function DraftBox({ text, href }: { text: string; href: string | null }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true) } catch { setCopied(false) }
    if (href) window.open(href, '_blank', 'noopener')
    window.setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className={styles.personDraft}>
      <p className={styles.personDraftText}>{text}</p>
      <button type="button" className={styles.ghostBtn} onClick={() => void copy()}>
        {copied ? 'Скопировано' : href ? 'Скопировать и открыть чат' : 'Скопировать'}
      </button>
    </div>
  )
}

function ClosedCard({ items }: { items: typeof CLOSED }) {
  const [open, setOpen] = useState(false)
  return (
    <section className={styles.card} aria-label="Закрыто">
      <div className={styles.cardHead}><h2>Разговор закрыт</h2><span className={styles.meta}>{items.length}</span></div>
      <p className={styles.hint}>Задач нет — но видно, что никто не потерян</p>
      {open && (
        <ul className={styles.nameList}>
          {items.map(c => (
            <li key={c.chat}>
              <a href={tgLink(c.chat, c.username)!} target="_blank" rel="noopener">{c.name}</a>
              <span>{c.why}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={styles.linkBtn} onClick={() => setOpen(v => !v)}>
        {open ? 'Свернуть' : `Показать — ${items.length}`}
      </button>
    </section>
  )
}

/** Лента шагов из переписки: что трекер увидел сам. Любой шаг можно не засчитать. */
function Feed({ label, steps, onReject }: {
  label: string | null
  steps: PlanStep[]
  onReject: (id: number, rejected: boolean) => void
}) {
  // Одинаковых шагов бывает десятки за день (касания, приглашения) —
  // от трёх и больше они свёрнуты в строку со счётчиком.
  const groups = useMemo(() => {
    const byKind = new Map<StepKind, PlanStep[]>()
    for (const s of steps) {
      const list = byKind.get(s.kind)
      if (list) list.push(s); else byKind.set(s.kind, [s])
    }
    return [...byKind].sort((a, b) => a[1][0].ts.localeCompare(b[1][0].ts))
  }, [steps])
  return (
    <section className={styles.card} aria-label="Из переписки">
      <div className={styles.cardHead}><h2>Засчитано по переписке</h2><span className={styles.meta}>{label ?? 'пока пусто'}</span></div>
      {steps.length === 0 && (
        <p className={styles.hint}>Трекер читает переписку раз в час и сам отмечает шаги: встречи, зумы, договоры, брони.</p>
      )}
      <ul className={styles.list}>
        {groups.map(([kind, list]) => (list.length >= 3 || kind === 'ping'
          ? <StepGroup key={kind} kind={kind} steps={list} onReject={onReject} />
          : list.map(s => <StepRow key={s.id} step={s} onReject={onReject} />)))}
      </ul>
    </section>
  )
}

function StepGroup({ kind, steps, onReject }: {
  kind: StepKind
  steps: PlanStep[]
  onReject: (id: number, rejected: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const live = steps.filter(s => !s.rejected).length
  return (
    <>
      <li>
        <button type="button" className={styles.stepGroup} onClick={() => setOpen(v => !v)} aria-expanded={open}>
          <span aria-hidden="true">{STEP_KINDS[kind].icon}</span>
          <span className={styles.stepText}><b>{STEP_KINDS[kind].label}</b> · {live}</span>
          <span className={styles.meta}>{open ? 'свернуть' : 'кто'}</span>
        </button>
      </li>
      {open && steps.map(s => <StepRow key={s.id} step={s} onReject={onReject} />)}
    </>
  )
}

function StepRow({ step, onReject }: { step: PlanStep; onReject: (id: number, rejected: boolean) => void }) {
  const kind = STEP_KINDS[step.kind]
  return (
    <li className={`${styles.step} ${step.rejected ? styles.stepOff : ''}`}>
      <span aria-hidden="true">{kind.icon}</span>
      <span className={styles.stepText}>
        <b>{kind.label}</b>{step.contact && <> · {step.contact}</>}
        {step.note && <em>{step.note}</em>}
      </span>
      <span className={styles.meta}>{timeFmt.format(new Date(step.ts))}</span>
      <button
        type="button"
        className={styles.xBtn}
        onClick={() => onReject(step.id, !step.rejected)}
        title={step.rejected ? 'Вернуть в счёт' : 'Не засчитывать'}
        aria-label={step.rejected ? 'Вернуть в счёт' : 'Не засчитывать'}
      >
        {step.rejected ? '↺' : '✕'}
      </button>
    </li>
  )
}

function Week({ week, done, auto, today, open, onToggleWeek, onToggleTask }: {
  week: PlanWeek
  done: Set<string>
  auto: Map<string, AutoProgress>
  today: string
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
    <section className={`${styles.week} ${complete ? styles.weekDone : ''}`}>
      <button type="button" className={styles.whead} onClick={onToggleWeek} aria-expanded={open} aria-controls={bodyId}>
        <span className={styles.wnum}>{week.n}</span>
        <span className={styles.wtitle}><b>{week.title}</b><em>{week.dates}</em></span>
        <span className={styles.wcount}>{count}/{tasks.length}</span>
        <span className={`${styles.chev} ${open ? styles.chevOpen : ''}`} aria-hidden="true">›</span>
      </button>
      {open && (
        <div className={styles.wbody} id={bodyId}>
          {week.days.filter(d => d.tasks.some(t => !t.waiting)).map(day => (
            <div key={day.id} className={`${styles.day} ${day.iso === today ? styles.dayToday : ''}`}>
              <h3 className={styles.sub}>{day.label}{day.iso === today && <span>сегодня</span>}</h3>
              <ul className={styles.list}>
                {day.tasks.filter(t => !t.waiting).map(task => (
                  <Row key={task.id} task={task} done={done} auto={auto.get(task.id)} onToggle={onToggleTask} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const CONFETTI_COLORS = ['#0f7a5c', '#c98a1c', '#d24b7a', '#2f7fc1', '#7d5bc4']

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
            left: `${b.left}%`, background: b.color, width: b.size, height: b.size * 1.6,
            animationDelay: `${b.delay}ms`, '--drift': `${b.drift}px`, '--spin': `${b.spin}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

/** Насколько событие разошлось с плановой датой. */
function ageNote(expected: string, today: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(expected)) / 86_400_000)
  if (days > 0) return `${days} ${plural(days, 'день', 'дня', 'дней')} как ждёт`
  if (days === 0) return 'по плану сегодня'
  return `по плану ${dayMonth.format(new Date(`${expected}T00:00:00Z`))}`
}
