// Журнал обхода прайсов: когда трекер обновлялся в последний раз и что в
// работе парсеров выглядит странно.
//
// «Странно» — это не список ошибок разбора (он и так виден в «Источниках»),
// а то, что по одной строке отчёта не заметно: тик, который оборвался;
// сутки без обновлений; прайс, который вчера разбирался, а сегодня нет;
// сотня юнитов, пропавшая разом.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sbAdmin } from './apply'

// Прогон укладывается в минуты; всё, что висит дольше, — оборвавшийся тик.
const STUCK_RUN_MIN = 20
// Расписание — раз в сутки, окно 01:00–04:00 UTC. Сутки с запасом.
const SILENCE_HOURS = 30
// Источник опрашивается раз в 20 часов, двое суток — уже пропуск.
const SOURCE_STALE_HOURS = 48
// Сколько событий одного вида за день по одному комплексу считаем не
// рынком, а сменившимся прайсом.
const BURST_MIN = 25
// Сколько юнитов должны разом уехать по цене больше чем на четверть,
// чтобы это перестало быть похоже на реальную переоценку.
const SHARP_PRICE_MIN = 3
const BURST_DAYS = 14
// Тик, в котором упали все источники, тревожен только когда их было
// заметно много: в конце ночного окна в очереди остаётся пара прайсов, и
// их падение — обычная поломка двух источников, а не трекера.
const DEAD_RUN_MIN_FAILED = 5
// Сколько прогонов показываем в таблице.
const RUNS_LIMIT = 20
// Сколько однотипных проблем перечисляем поимённо, прежде чем свернуть
// остальные в счётчик.
const NAMED_LIMIT = 5

export type ScanRun = {
  id: number
  started_at: string
  finished_at: string | null
  sources_ok: number
  sources_failed: number
  sources_skipped: number
  units_seen: number
  events_written: number
  note: string | null
}

export type Anomaly = {
  level: 'error' | 'warn' | 'info'
  title: string
  detail: string
  when: string | null
}

export type ScanLog = {
  lastRunAt: string | null
  lastFinishedAt: string | null
  lastSourceScanAt: string | null
  isRunning: boolean
  sources: { total: number; ok: number; error: number; pending: number }
  runs: ScanRun[]
  anomalies: Anomaly[]
}

type SourceState = {
  developer: string
  complex: string
  last_scan_at: string | null
  last_ok_at: string | null
  last_status: string | null
  last_units: number | null
}

type EventDay = {
  d: string
  kind: string
  developer: string
  complex: string
  n: number
  sharp_price: number
  known_before: boolean
}

type StockRow = { developer: string; complex: string; unknown: number; total: number }

function hoursSince(iso: string | null): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : (Date.now() - t) / 3600_000
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10)
}

export async function loadScanLog(sb: SupabaseClient = sbAdmin()): Promise<ScanLog> {
  const [runs, sources, events, stock] = await Promise.all([
    loadRuns(sb),
    loadSources(sb),
    loadEventDays(sb),
    loadStock(sb),
  ])

  const last = runs[0] ?? null
  const scanTimes = sources.map(s => s.last_scan_at).filter((v): v is string => !!v).sort()
  const lastSourceScanAt = scanTimes.length ? scanTimes[scanTimes.length - 1] : null
  const isRunning = !!last && !last.finished_at && (hoursSince(last.started_at) ?? 0) * 60 < STUCK_RUN_MIN

  return {
    lastRunAt: last?.started_at ?? null,
    lastFinishedAt: runs.find(r => r.finished_at)?.finished_at ?? null,
    lastSourceScanAt,
    isRunning,
    sources: {
      total: sources.length,
      ok: sources.filter(s => s.last_status === 'ok').length,
      error: sources.filter(s => s.last_status === 'error').length,
      pending: sources.filter(s => !s.last_status).length,
    },
    runs,
    anomalies: findAnomalies(runs, sources, events, stock),
  }
}

async function loadRuns(sb: SupabaseClient): Promise<ScanRun[]> {
  const { data } = await sb
    .from('market_scan_runs')
    .select('id, started_at, finished_at, sources_ok, sources_failed, sources_skipped, units_seen, events_written, note')
    .order('started_at', { ascending: false })
    .limit(RUNS_LIMIT)
  return (data ?? []) as ScanRun[]
}

async function loadSources(sb: SupabaseClient): Promise<SourceState[]> {
  const { data } = await sb
    .from('market_sources')
    .select('developer, complex, last_scan_at, last_ok_at, last_status, last_units')
    .eq('active', true)
  return (data ?? []) as SourceState[]
}

async function loadEventDays(sb: SupabaseClient): Promise<EventDay[]> {
  const { data } = await sb
    .from('market_event_daily')
    .select('d, kind, developer, complex, n, sharp_price, known_before')
    .gte('d', daysAgo(BURST_DAYS))
    .order('d', { ascending: false })
  return (data ?? []) as EventDay[]
}

async function loadStock(sb: SupabaseClient): Promise<StockRow[]> {
  const { data } = await sb.from('market_current_stock').select('developer, complex, unknown, total')
  return (data ?? []) as StockRow[]
}

function findAnomalies(runs: ScanRun[], sources: SourceState[], events: EventDay[], stock: StockRow[]): Anomaly[] {
  const out = [
    ...runAnomalies(runs),
    ...sourceAnomalies(sources),
    ...eventAnomalies(events),
    ...statusAnomalies(stock),
  ]
  const rank = { error: 0, warn: 1, info: 2 }
  return out.sort((a, b) => rank[a.level] - rank[b.level] || String(b.when).localeCompare(String(a.when)))
}

function runAnomalies(runs: ScanRun[]): Anomaly[] {
  const out: Anomaly[] = []
  const last = runs[0]

  const stuck = runs.filter(r => !r.finished_at && (hoursSince(r.started_at) ?? 0) * 60 >= STUCK_RUN_MIN)
  if (stuck.length) {
    out.push({
      level: 'error',
      title: `Прогон оборвался${stuck.length > 1 ? ` (таких ${stuck.length})` : ''}`,
      detail: 'Тик начался, но не закрылся: функция упала или её сняли по таймауту. Обычно обход занимает меньше минуты.',
      when: stuck[0].started_at,
    })
  }

  const silence = hoursSince(last?.started_at ?? null)
  if (!last) {
    out.push({ level: 'error', title: 'Обходов не было ни разу', detail: 'Журнал пуст — расписание ни разу не сработало.', when: null })
  } else if (silence !== null && silence >= SILENCE_HOURS) {
    out.push({
      level: 'error',
      title: `Обновлений нет ${Math.round(silence)} ч`,
      detail: 'Расписание тикает каждую ночь. Тишина дольше суток означает, что cron в Vercel не отрабатывает.',
      when: last.started_at,
    })
  }

  const dead = runs.filter(r => r.finished_at && r.sources_ok === 0 && r.sources_failed >= DEAD_RUN_MIN_FAILED)
  if (dead.length) {
    out.push({
      level: 'error',
      title: `Тик без единого разобранного прайса${dead.length > 1 ? ` (таких ${dead.length})` : ''}`,
      detail: `В прогоне ${dead[0].sources_failed} источников подряд отдали ошибку. Так выглядит упавшая сеть или исчерпанный лимит модели.`,
      when: dead[0].started_at,
    })
  }

  const skipped = runs.filter(r => r.sources_skipped > 0)
  if (skipped.length) {
    const total = skipped.reduce((s, r) => s + r.sources_skipped, 0)
    out.push({
      level: 'warn',
      title: `Тик не успел обойти ${plural(total, 'источник', 'источника', 'источников')}`,
      detail: 'Обход упёрся в бюджет времени и оставил очередь следующему прогону. Разово это норма, регулярно — сигнал поднять частоту тиков.',
      when: skipped[0].started_at,
    })
  }

  return out
}

function sourceAnomalies(sources: SourceState[]): Anomaly[] {
  const out: Anomaly[] = []

  const stale = sources.filter(s => {
    const h = hoursSince(s.last_scan_at)
    return h === null || h >= SOURCE_STALE_HOURS
  })
  if (stale.length) {
    out.push({
      level: 'warn',
      title: `${plural(stale.length, 'источник', 'источника', 'источников')} давно не опрашивались`,
      detail: `Не попадали в обход больше ${Math.round(SOURCE_STALE_HOURS / 24)} суток: ${names(stale)}.`,
      when: null,
    })
  }

  // Источник, который раньше разбирался, а теперь нет, — это регресс:
  // либо застройщик переделал прайс, либо сломался адаптер. Такое видно
  // только по дате последнего удачного разбора.
  const broke = sources
    .filter(s => s.last_status === 'error' && s.last_ok_at)
    .sort((a, b) => String(b.last_ok_at).localeCompare(String(a.last_ok_at)))
  for (const s of broke.slice(0, NAMED_LIMIT)) {
    out.push({
      level: 'error',
      title: `${s.developer} / ${s.complex}: перестал разбираться`,
      detail: 'Раньше прайс читался, теперь отдаёт ошибку — скорее всего, у застройщика изменился файл. Текст ошибки в «Источниках».',
      when: s.last_ok_at,
    })
  }

  const neverOk = sources.filter(s => s.last_status === 'error' && !s.last_ok_at)
  if (neverOk.length) {
    out.push({
      level: 'warn',
      title: `${plural(neverOk.length, 'источник', 'источника', 'источников')} не разбирались ни разу`,
      detail: `Для них ещё нет рабочего разбора — это не поломка, а незакрытое покрытие: ${names(neverOk)}.`,
      when: null,
    })
  }

  const empty = sources.filter(s => s.last_status === 'ok' && (s.last_units ?? 0) === 0)
  if (empty.length) {
    out.push({
      level: 'warn',
      title: `${plural(empty.length, 'прайс', 'прайса', 'прайсов')} разобрались вхолостую`,
      detail: `Разбор прошёл без ошибки, но не отдал ни одного юнита: ${names(empty)}.`,
      when: null,
    })
  }

  return out
}

function eventAnomalies(events: EventDay[]): Anomaly[] {
  const out: Anomaly[] = []
  // Первый обход прайса — это всегда сотня «появившихся» юнитов сразу.
  // Поимённо такие строки только заслоняют настоящие странности, поэтому
  // сводим их в одну.
  const firstScans = events.filter(e => e.kind === 'listed' && !e.known_before && e.n >= BURST_MIN)
  if (firstScans.length) {
    out.push({
      level: 'info',
      title: `Трекер впервые обошёл ${plural(firstScans.length, 'прайс', 'прайса', 'прайсов')}`,
      detail: `За две недели в трекер завели ${plural(firstScans.reduce((n, e) => n + e.n, 0), 'юнит', 'юнита', 'юнитов')} по новым источникам — массовое «появление» в такие дни ожидаемо.`,
      when: firstScans[0].d,
    })
  }

  for (const e of events) {
    const who = `${e.developer} / ${e.complex}`

    if (e.sharp_price >= SHARP_PRICE_MIN) {
      out.push({
        level: 'warn',
        title: `${who}: ${plural(e.sharp_price, 'юнит', 'юнита', 'юнитов')} сменили цену больше чем на четверть`,
        detail: 'Разом такие скачки бывают не от рынка, а от разбора: сдвинулась колонка или прайс перешёл в другую валюту.',
        when: e.d,
      })
    }

    if (e.n < BURST_MIN) continue

    if (e.kind === 'listed' && e.known_before) {
      out.push({
        level: 'warn',
        title: `${who}: разом появилось ${plural(e.n, 'юнит', 'юнита', 'юнитов')}`,
        detail: 'Комплекс отслеживался и раньше, значит в прайсе сменились номера юнитов: старые считаются пропавшими, новые заводятся заново, история по ним обнуляется.',
        when: e.d,
      })
    } else if (e.kind === 'gone') {
      out.push({
        level: 'warn',
        title: `${who}: разом пропало ${plural(e.n, 'юнит', 'юнита', 'юнитов')}`,
        detail: 'Столько юнитов не исчезает из прайса за день по-настоящему. Обычно это урезанный или переделанный файл застройщика.',
        when: e.d,
      })
    } else if (e.kind === 'sold' || e.kind === 'reserved' || e.kind === 'returned') {
      out.push({
        level: 'warn',
        title: `${who}: ${plural(e.n, 'юнит', 'юнита', 'юнитов')} сменили статус разом (${e.kind === 'sold' ? 'продано' : e.kind === 'reserved' ? 'бронь' : 'вернулись в продажу'})`,
        detail: 'Проверьте прайс: массовый переход чаще означает перекрашенную легенду в таблице, чем реальную сделку.',
        when: e.d,
      })
    }
  }

  return out
}

function statusAnomalies(stock: StockRow[]): Anomaly[] {
  const blind = stock.filter(r => Number(r.total) >= 5 && Number(r.unknown) / Number(r.total) >= 0.5)
  if (!blind.length) return []
  return [{
    level: 'warn',
    title: `${plural(blind.length, 'комплекс', 'комплекса', 'комплексов')} без распознанного статуса`,
    detail: `У большинства юнитов не понять, свободны они или проданы, — такие комплексы выпадают из аналитики: ${names(blind)}.`,
    when: null,
  }]
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return `${n} ${many}`
  if (mod10 === 1) return `${n} ${one}`
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`
  return `${n} ${many}`
}

function names(rows: Array<{ developer: string; complex: string }>): string {
  const head = rows.slice(0, NAMED_LIMIT).map(r => `${r.developer} / ${r.complex}`).join(', ')
  return rows.length > NAMED_LIMIT ? `${head} и ещё ${rows.length - NAMED_LIMIT}` : head
}
