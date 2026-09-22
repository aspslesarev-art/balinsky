'use client'

// Дашборд раздела «Агенты»: сколько касаний было с каждым агентом.
//
// Касание = одно сообщение в переписке бота, в любую сторону. Поэтому в
// строке агента стоят оба числа: сколько написали мы и сколько он —
// «поговорили» и «я написал в пустоту» выглядят на доске одинаково, а
// это очень разные дни.
//
// Данные грузятся при открытии вкладки и при смене периода, а не вместе
// с доской: за 30 дней это несколько тысяч сообщений, и платить за них
// при каждом заходе в раздел незачем.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Inbox } from 'lucide-react'
import { STATUSES, TOUCH_PERIODS, type AgentStatus, type TouchStats } from '@/lib/agents/types'

// Тот же набор оттенков, что у колонок доски: точка у имени должна
// значить то же самое в обоих видах.
const STATUS_TINT: Record<AgentStatus, string> = {
  new:         'rgba(148,163,184,0.55)',
  contact:     'rgba(224,169,59,0.75)',
  to_schedule: 'rgba(224,169,59,0.95)',
  scheduled:   'rgba(79,192,141,0.65)',
  met:         'rgba(79,192,141,0.9)',
  working:     '#1F8B5F',
  lost:        'rgba(248,113,113,0.7)',
}

// «1 касание / 2 касания / 5 касаний» — числа тут на виду, и неверное
// окончание читается как опечатка.
function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

function timeOrDay(iso: string, days: number): string {
  const d = new Date(iso)
  return days === 1
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function AgentsDashboard({ onOpen, onInbox }: { onOpen: (id: string) => void; onInbox: () => void }) {
  const [days, setDays] = useState(1)
  const [stats, setStats] = useState<TouchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (d: number) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/admin/agents/dashboard?days=${d}`, { cache: 'no-store' })
      if (r.status === 401) { window.location.href = '/admin'; return }
      const j = await r.json() as { ok: boolean; stats?: TouchStats }
      if (!j.ok || !j.stats) throw new Error()
      setStats(j.stats)
    } catch {
      setError('Не удалось посчитать касания — попробуйте обновить')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(days) }, [load, days])

  const period = TOUCH_PERIODS.find(p => p.days === days)!
  const max = stats?.rows[0]?.total ?? 1

  return (
    <div className="flex flex-col gap-6">
      {/* Период */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-[var(--ax-border)] p-0.5">
          {TOUCH_PERIODS.map(p => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 rounded-md text-[13px] transition-colors duration-[120ms] ${
                days === p.days
                  ? 'bg-[var(--ax-panel)] text-[var(--ax-fg)]'
                  : 'text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
              } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="hidden sm:block text-[11.5px] text-[var(--ax-fg-faint)]">{period.note}</span>
        <button
          type="button"
          onClick={() => load(days)}
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

      {!stats ? (
        <div className="py-24 flex items-center justify-center gap-2 text-[13px] text-[var(--ax-fg-muted)]">
          {!error && <><Loader2 size={14} className="animate-spin" /> Считаю касания…</>}
        </div>
      ) : (
        <>
          {/* Итоги периода */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Касаний" value={stats.totals.touches} sub="сообщений в переписке" />
            <Tile label="Агентов" value={stats.totals.agents} sub="с кем был разговор" accent />
            <Tile label="Мы написали" value={stats.totals.outgoing} sub="исходящих" />
            <Tile label="Нам ответили" value={stats.totals.incoming} sub="входящих" />
          </div>

          {/* Кто и сколько */}
          {stats.rows.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--ax-fg-muted)] max-w-[52ch] mx-auto leading-relaxed">
              {days === 1
                ? 'Сегодня переписки с агентами ещё не было.'
                : 'За этот период переписки с агентами не было.'}
            </p>
          ) : (
            <section className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold text-[var(--ax-fg)]">Кто и сколько</h2>
              <div className="rounded-xl border border-[var(--ax-border-soft)] overflow-hidden">
                {/* Шапка: три числа без подписей читались как ребус */}
                <div className="flex items-center gap-3 px-3 py-2 bg-[var(--ax-chat-bg)] text-[11.5px] text-[var(--ax-fg-muted)]">
                  <span className="shrink-0 w-1.5" aria-hidden />
                  <span className="flex-1">Агент</span>
                  <span className="hidden sm:block shrink-0 w-24 lg:w-40" aria-hidden />
                  <span className="shrink-0 w-10 text-right">мы</span>
                  <span className="shrink-0 w-12 text-right">агент</span>
                  <span className="shrink-0 w-12 text-right">всего</span>
                </div>
                <ul className="divide-y divide-[var(--ax-border-soft)]">
                  {stats.rows.map(r => (
                    <li key={r.agent_id}>
                      <button
                        type="button"
                        onClick={() => onOpen(r.agent_id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#4FC08D]"
                      >
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: STATUS_TINT[r.status] }}
                          title={STATUSES.find(s => s.id === r.status)?.label} />

                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] text-[var(--ax-fg)] truncate">{r.name}</span>
                          <span className="block text-[11.5px] text-[var(--ax-fg-faint)] truncate">
                            {[r.agency, timeOrDay(r.last_ts, days)].filter(Boolean).join(' · ')}
                          </span>
                        </span>

                        {/* Полоска: длина относительно самого активного разговора */}
                        <span className="hidden sm:block shrink-0 w-24 lg:w-40 h-1.5 rounded-full bg-[var(--ax-hover)] overflow-hidden">
                          <span className="block h-full bg-[#1F8B5F]" style={{ width: `${Math.max(6, (r.total / max) * 100)}%` }} />
                        </span>

                        <span className="shrink-0 w-10 text-right text-[13px] tabular-nums text-[var(--ax-fg-soft)]">{r.outgoing}</span>
                        <span className="shrink-0 w-12 text-right text-[13px] tabular-nums text-[var(--ax-fg-soft)]">{r.incoming}</span>
                        <span className="shrink-0 w-12 text-right text-[13px] font-medium tabular-nums text-[var(--ax-fg)]">{r.total}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Разговоры, которых нет в воронке */}
          {stats.unlinked.chats > 0 && (
            <section className="rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-chat-bg)] p-3">
              <p className="text-[12.5px] text-[var(--ax-fg-soft)] leading-relaxed max-w-[68ch]">
                Ещё {stats.unlinked.touches} {plural(stats.unlinked.touches, ['касание', 'касания', 'касаний'])} —
                в {stats.unlinked.chats} {plural(stats.unlinked.chats, ['переписке', 'переписках', 'переписках'])} без карточки агента
                {stats.unlinked.names.length > 0 && <>: {stats.unlinked.names.join(', ')}{stats.unlinked.chats > stats.unlinked.names.length ? ' и другие' : ''}</>}.
              </p>
              <button
                type="button"
                onClick={onInbox}
                className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] border border-[var(--ax-border)] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4FC08D]"
              >
                <Inbox size={13} />
                Открыть входящие
              </button>
            </section>
          )}

          {stats.truncated && (
            <p className="text-[11.5px] text-[var(--ax-fg-faint)]">
              Сообщений за период слишком много — показан не весь объём.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Tile({ label, value, sub, accent = false }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--ax-border-soft)] bg-[var(--ax-panel)] p-4">
      <div className="text-[11.5px] uppercase tracking-wide text-[var(--ax-fg-faint)]">{label}</div>
      <div className={`mt-2 text-[22px] font-semibold tracking-tight tabular-nums ${accent ? 'text-[#1F8B5F]' : 'text-[var(--ax-fg)]'}`}>
        {value.toLocaleString('ru-RU')}
      </div>
      <div className="mt-0.5 text-[11.5px] text-[var(--ax-fg-muted)]">{sub}</div>
    </div>
  )
}
