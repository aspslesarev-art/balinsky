// Журнал обхода прайсов и разбор странностей: когда трекер обновлялся и
// что в работе парсеров не похоже на рынок.

import type { Anomaly, ScanLog, ScanRun } from '@/lib/market/scan-log'

// Время показываем по Бали: расписание тика тоже ночное по Бали, иначе
// «обновлено в 02:31» читается как середина рабочего дня.
const TZ = 'Asia/Makassar'

export function ScanStatusLine({ log }: { log: ScanLog }) {
  const last = log.lastSourceScanAt ?? log.lastRunAt
  const alarm = log.anomalies.filter(a => a.level === 'error').length
  const warn = log.anomalies.filter(a => a.level === 'warn').length

  return (
    <div className="text-[12px] text-[var(--ax-fg-muted)]">
      Обновлено: <span className="text-[var(--ax-fg)]">{fmtDateTime(last)}</span>
      {last ? ` (${ago(last)})` : null}
      {log.isRunning ? ' · обход идёт прямо сейчас' : null}
      {' · '}прайсов {log.sources.ok} из {log.sources.total}
      {log.sources.error ? `, с ошибкой ${log.sources.error}` : null}
      {log.sources.pending ? `, ещё не опрошены ${log.sources.pending}` : null}
      {alarm || warn ? (
        <>
          {' · '}
          <span className={alarm ? 'text-red-500' : 'text-amber-500'}>
            странностей: {alarm + warn}
          </span>
        </>
      ) : (
        <span className="text-emerald-600"> · странностей нет</span>
      )}
    </div>
  )
}

export function AnomalyList({ items }: { items: Anomaly[] }) {
  if (!items.length) {
    return (
      <div className="text-[13px] text-[var(--ax-fg-muted)]">
        Ничего необычного: тики отрабатывают по расписанию, прайсы читаются, массовых движений в юнитах нет.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {items.map((a, i) => (
        <div key={i} className="text-[13px] border-t border-[var(--ax-border)] pt-2 first:border-t-0 first:pt-0">
          <div className="flex items-baseline gap-2">
            <span className={MARK_CLASS[a.level]}>{MARK[a.level]}</span>
            <span className="font-medium">{a.title}</span>
            {a.when ? <span className="text-[12px] text-[var(--ax-fg-muted)]">{fmtDay(a.when)}</span> : null}
          </div>
          <div className="text-[12px] text-[var(--ax-fg-muted)] pl-5">{a.detail}</div>
        </div>
      ))}
    </div>
  )
}

export function RunsTable({ runs }: { runs: ScanRun[] }) {
  if (!runs.length) return <div className="text-[13px] text-[var(--ax-fg-muted)]">Обходов ещё не было.</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="text-[var(--ax-fg-muted)] text-left">
          <tr>
            <Th>Начало</Th>
            <Th>Длилось</Th>
            <Th right>Прайсов</Th>
            <Th right>Ошибок</Th>
            <Th right>Не успел</Th>
            <Th right>Юнитов</Th>
            <Th right>Событий</Th>
            <Th>Запуск</Th>
          </tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.id} className="border-t border-[var(--ax-border)]">
              <Td>{fmtDateTime(r.started_at)}</Td>
              <Td>{duration(r)}</Td>
              <Td right>{r.sources_ok}</Td>
              <Td right>
                <span className={r.sources_failed ? 'text-red-500' : 'text-[var(--ax-fg-muted)]'}>{r.sources_failed || '—'}</span>
              </Td>
              <Td right>
                <span className={r.sources_skipped ? 'text-amber-500' : 'text-[var(--ax-fg-muted)]'}>{r.sources_skipped || '—'}</span>
              </Td>
              <Td right>{r.units_seen}</Td>
              <Td right>{r.events_written || '—'}</Td>
              <Td>
                <span className="text-[var(--ax-fg-muted)]">{r.note ?? 'по расписанию'}</span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MARK: Record<Anomaly['level'], string> = { error: '✗', warn: '!', info: 'i' }
const MARK_CLASS: Record<Anomaly['level'], string> = {
  error: 'text-red-500',
  warn: 'text-amber-500',
  info: 'text-[var(--ax-fg-muted)]',
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`font-normal pb-2 ${right ? 'text-right' : ''}`}>{children}</th>
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`py-1.5 ${right ? 'text-right tabular-nums' : ''}`}>{children}</td>
}

function duration(r: ScanRun): string {
  if (!r.finished_at) return 'не закрылся'
  const ms = Date.parse(r.finished_at) - Date.parse(r.started_at)
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 60_000) return `${Math.round(ms / 1000)} с`
  return `${Math.floor(ms / 60_000)} мин ${Math.round((ms % 60_000) / 1000)} с`
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return 'никогда'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ,
    })
  } catch { return iso }
}

function fmtDay(d: string): string {
  try {
    return new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  } catch { return d }
}

function ago(iso: string): string {
  const min = (Date.now() - Date.parse(iso)) / 60_000
  if (!Number.isFinite(min)) return ''
  if (min < 2) return 'только что'
  if (min < 60) return `${Math.round(min)} мин назад`
  if (min < 48 * 60) return `${Math.round(min / 60)} ч назад`
  return `${Math.round(min / 1440)} дн назад`
}
