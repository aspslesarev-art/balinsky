'use client'

// Дашборд раздела «Агенты»: отчётность по работе с агентами за период.
//
// Воронка: кому написал Андрей → кто написал ему → сколько состоялось
// диалогов (писали обе стороны) → встречи и зумы → брони → сделки. Плюс
// рассылка знакомства: сколько ушло и сколько ответили.
//
// Текста переписки здесь нет и не будет: Мак Андрея присылает только
// счётчики сообщений по дням. Поэтому под периодом видно, когда Мак
// присылал цифры последний раз, — если он выключен, цифры отстают.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Video, Users } from 'lucide-react'
import { STATUSES, TOUCH_PERIODS, hasDeals, plural, usdShort, type AgentStatus, type TouchPeriodKey, type TouchRow, type TouchStats } from '@/lib/agents/types'

// Тот же набор оттенков, что у колонок доски: точка у имени значит то же самое в обоих видах.
const STATUS_TINT: Record<AgentStatus, string> = {
  new:         'rgba(148,163,184,0.55)',
  contact:     'rgba(224,169,59,0.75)',
  to_schedule: 'rgba(224,169,59,0.95)',
  scheduled:   'rgba(79,192,141,0.65)',
  met:         'rgba(79,192,141,0.9)',
  working:     '#1F8B5F',
  lost:        'rgba(248,113,113,0.7)',
}

const KIND_LABEL: Record<NonNullable<TouchRow['kind']>, string> = {
  agent: 'карточка',
  brokers: 'Брокеры Бали',
  outreach: 'рассылка',
}

function dayLabel(day: string): string {
  return new Date(day + 'T00:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function ago(iso: string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} ${plural(min, ['минуту', 'минуты', 'минут'])} назад`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} ${plural(h, ['час', 'часа', 'часов'])} назад`
  const d = Math.round(h / 24)
  return `${d} ${plural(d, ['день', 'дня', 'дней'])} назад`
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

export function AgentsDashboard({ onOpen }: { onOpen: (id: string) => void; onInbox?: () => void }) {
  const [period, setPeriod] = useState<TouchPeriodKey>('today')
  const [stats, setStats] = useState<TouchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: TouchPeriodKey) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/admin/agents/dashboard?p=${p}`, { cache: 'no-store' })
      if (r.status === 401) { window.location.href = '/admin'; return }
      const j = await r.json() as { ok: boolean; stats?: TouchStats }
      if (!j.ok || !j.stats) throw new Error()
      setStats(j.stats)
    } catch {
      setError('Не удалось загрузить отчёт — попробуйте обновить')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [load, period])

  const meta = TOUCH_PERIODS.find(p => p.key === period)!
  const f = stats?.funnel
  const max = stats?.rows[0]?.total ?? 1
  const stale = stats?.syncedAt ? Date.now() - Date.parse(stats.syncedAt) > 2 * 3600_000 : true

  return (
    <div className="flex flex-col gap-6">
      {/* Период */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-[var(--ax-border)] p-0.5">
          {TOUCH_PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={`px-3 py-1.5 rounded-md text-[13px] transition-colors duration-[120ms] ${
                period === p.key
                  ? 'bg-[var(--ax-panel)] text-[var(--ax-fg)]'
                  : 'text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
              } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="hidden sm:block text-[11.5px] text-[var(--ax-fg-faint)]">{meta.note}</span>
        <button
          type="button"
          onClick={() => load(period)}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] disabled:opacity-50 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Обновить
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-[13px] bg-[var(--ax-error-bg)] border border-[var(--ax-error-border)] text-[var(--ax-error-fg)]">
          {error}
        </div>
      )}

      {!stats || !f ? (
        <div className="py-24 flex items-center justify-center gap-2 text-[13px] text-[var(--ax-fg-muted)]">
          {!error && <><Loader2 size={14} className="animate-spin" /> Собираю отчёт…</>}
        </div>
      ) : (
        <>
          <p className={`-mt-3 text-[11.5px] ${stale ? 'text-[var(--ax-error-fg)]' : 'text-[var(--ax-fg-faint)]'}`}>
            {stats.syncedAt
              ? <>Цифры переписки с Мака: {ago(stats.syncedAt)}{stale && ' — Мак давно не присылал данные, проверьте, что он включён'}</>
              : 'Мак ещё не присылал цифры переписки'}
          </p>

          {/* Воронка */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold text-[var(--ax-fg)]">Воронка</h2>
            <ol className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              <Step label="Я написал" value={f.wroteChats} sub={`${f.wroteMsgs} ${plural(f.wroteMsgs, ['сообщение', 'сообщения', 'сообщений'])}`} />
              <Step label="Мне написали" value={f.gotChats} sub={`${f.gotMsgs} ${plural(f.gotMsgs, ['сообщение', 'сообщения', 'сообщений'])}`} />
              <Step label="Диалогов" value={f.dialogs} sub={`писали обе стороны · ${pct(f.dialogs, f.wroteChats)} от написанных`} accent />
              <Step label="Звонки" value={f.calls} sub={`${f.callsMin} мин в Телеграме`} />
              <Step label="Встречи и зумы" value={f.meetings} sub={stats.calendar === 'ok' ? `из них зумов: ${f.zooms}` : stats.calendar === 'not_connected' ? 'календарь не подключён' : 'календарь не ответил'} />
              <Step label="Брони" value={f.reservations} sub="подтверждённые" />
              <Step label="Сделки" value={f.deals} sub="оплаченные брони" accent />
            </ol>
          </section>

          {/* Рассылка */}
          <section className="rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] p-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <h2 className="text-[13px] font-semibold text-[var(--ax-fg)] w-full sm:w-auto">Рассылка знакомства</h2>
            <span className="text-[13px] text-[var(--ax-fg-soft)]">ушло <b className="text-[var(--ax-fg)] tabular-nums">{f.outreachSent}</b></span>
            <span className="text-[13px] text-[var(--ax-fg-soft)]">ответили <b className="text-[var(--ax-fg)] tabular-nums">{f.outreachReplied}</b> <span className="text-[var(--ax-fg-faint)]">({pct(f.outreachReplied, f.outreachSent)})</span></span>
            <span className="text-[11.5px] text-[var(--ax-fg-faint)]">ответы считаются по сообщениям, отправленным за период</span>
          </section>

          {/* Встречи */}
          {stats.meetings.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold text-[var(--ax-fg)]">Встречи в календаре</h2>
              <ul className="rounded-xl border border-[var(--ax-border-soft)] divide-y divide-[var(--ax-border-soft)]">
                {stats.meetings.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                    {m.zoom ? <Video size={14} className="shrink-0 text-[#4FC08D]" /> : <Users size={14} className="shrink-0 text-[var(--ax-fg-muted)]" />}
                    <span className="min-w-0 flex-1 text-[13.5px] text-[var(--ax-fg)] truncate">{m.title}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-[var(--ax-fg-muted)]">
                      {new Date(m.start).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Кто и сколько */}
          {stats.rows.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)] max-w-[52ch] mx-auto leading-relaxed">
              {period === 'today' ? 'Сегодня переписки с агентами ещё не было.' : 'За этот период переписки с агентами не было.'}
            </p>
          ) : (
            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold text-[var(--ax-fg)]">Кто и сколько · {stats.rows.length}</h2>
              <div className="rounded-xl border border-[var(--ax-border-soft)] overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 bg-[var(--ax-chat-bg)] text-[11.5px] text-[var(--ax-fg-muted)]">
                  <span className="shrink-0 w-1.5" aria-hidden />
                  <span className="flex-1">С кем</span>
                  <span className="hidden sm:block shrink-0 w-24 lg:w-40" aria-hidden />
                  <span className="shrink-0 w-10 text-right">я</span>
                  <span className="shrink-0 w-12 text-right">мне</span>
                  <span className="shrink-0 w-12 text-right">всего</span>
                </div>
                <ul className="divide-y divide-[var(--ax-border-soft)]">
                  {stats.rows.map(r => {
                    const inner = (
                      <>
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full"
                          style={{ background: r.status ? STATUS_TINT[r.status] : 'var(--ax-border)' }}
                          title={r.status ? STATUSES.find(s => s.id === r.status)?.label : 'без карточки'} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] text-[var(--ax-fg)] truncate">{r.name}</span>
                          <span className="block text-[11.5px] truncate">
                            <span className="text-[var(--ax-fg-faint)]">
                              {[r.agency, r.kind && r.kind !== 'agent' ? KIND_LABEL[r.kind] : null, period === 'today' ? null : dayLabel(r.last_day)].filter(Boolean).join(' · ')}
                            </span>
                            {hasDeals(r) && r.deals_volume_usd != null && (
                              <span className="text-[#4FC08D]"> · {usdShort(r.deals_volume_usd)}</span>
                            )}
                          </span>
                        </span>
                        <span className="hidden sm:block shrink-0 w-24 lg:w-40 h-1.5 rounded-full bg-[var(--ax-hover)] overflow-hidden">
                          <span className="block h-full bg-[#1F8B5F]" style={{ width: `${Math.max(6, (r.total / max) * 100)}%` }} />
                        </span>
                        <span className="shrink-0 w-10 text-right text-[13px] tabular-nums text-[var(--ax-fg-soft)]">{r.outgoing}</span>
                        <span className="shrink-0 w-12 text-right text-[13px] tabular-nums text-[var(--ax-fg-soft)]">{r.incoming}</span>
                        <span className="shrink-0 w-12 text-right text-[13px] font-medium tabular-nums text-[var(--ax-fg)]">{r.total}</span>
                      </>
                    )
                    const cls = 'w-full flex items-center gap-3 px-3 py-2.5 text-left'
                    return (
                      <li key={r.chat_id}>
                        {r.agent_id ? (
                          <button type="button" onClick={() => onOpen(r.agent_id!)}
                            className={`${cls} hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#4FC08D]`}>
                            {inner}
                          </button>
                        ) : (
                          <div className={cls}>{inner}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Step({ label, value, sub, accent = false }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <li className="rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] p-4 list-none min-w-0">
      <div className="text-[11.5px] uppercase tracking-wide text-[var(--ax-fg-faint)]">{label}</div>
      <div className={`mt-2 text-[22px] font-semibold tracking-tight tabular-nums ${accent ? 'text-[#1F8B5F]' : 'text-[var(--ax-fg)]'}`}>
        {value.toLocaleString('ru-RU')}
      </div>
      <div className="mt-0.5 text-[11.5px] text-[var(--ax-fg-muted)] leading-snug">{sub}</div>
    </li>
  )
}
