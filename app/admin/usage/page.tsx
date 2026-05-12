// Admin-only Azure OpenAI spend dashboard.
//   - Today / Yesterday / MTD / 30d totals
//   - Straight-line month-end projection from MTD burn rate
//   - Per-feature breakdown (chat-web, chat-tg, embed, transcribe…)
//   - Per-day spend for the last 30 days (text bars, no chart libs)

import { requireAdmin } from '@/lib/admin-auth'
import { loadUsageSummary } from '@/lib/usage-tracker'
import { LoginForm } from '../_login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AZURE_BUDGET = 1000  // total credit grant — adjust if Microsoft tops up

export default async function UsagePage() {
  const ok = await requireAdmin()
  if (!ok) return <LoginForm />

  const u = await loadUsageSummary()
  const remaining = Math.max(0, AZURE_BUDGET - u.last30days)
  const daysOfCreditLeft = u.last30days > 0
    ? Math.round((remaining / u.last30days) * 30)
    : null

  const maxDayCost = Math.max(...u.byDay.map(d => d.cost), 0.0001)

  return (
    <div className="min-h-screen bg-[var(--ax-bg)] text-[var(--ax-fg)] p-6 sm:p-10">
      <main className="max-w-[1100px] mx-auto space-y-8">
        <header>
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">Расходы на Azure OpenAI</div>
          <h1 className="text-[24px] font-semibold tracking-tight">Burn rate</h1>
        </header>

        {/* TOTALS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Сегодня" value={u.today} />
          <KpiCard label="Вчера" value={u.yesterday} />
          <KpiCard label="Этот месяц" value={u.thisMonth} sub={`прогноз: ${formatUsd(u.projectedMonthEnd)}`} />
          <KpiCard label="30 дней" value={u.last30days} />
        </section>

        {/* CREDIT GAUGE */}
        <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-0.5">Бюджет Azure</div>
              <div className="text-[18px] font-semibold">
                {formatUsd(remaining)} <span className="text-[13px] text-[var(--ax-fg-muted)] font-normal">из {formatUsd(AZURE_BUDGET)}</span>
              </div>
            </div>
            {daysOfCreditLeft != null && (
              <div className="text-[13px] text-[var(--ax-fg-muted)]">
                При текущем темпе хватит ещё на <b className="text-[var(--ax-fg)]">{daysOfCreditLeft} дн.</b>
              </div>
            )}
          </div>
          <div className="h-2 bg-[var(--ax-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1F8B5F]"
              style={{ width: `${Math.min(100, Math.round((u.last30days / AZURE_BUDGET) * 100))}%` }}
            />
          </div>
        </section>

        {/* BY FEATURE */}
        <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-3">По фичам (последние 30 дней)</div>
          {u.byFeature.length === 0 ? (
            <div className="text-[13px] text-[var(--ax-fg-faint)] py-2">Пока пусто. Запросы появятся как только Балина обработает первый чат.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[var(--ax-fg-muted)] border-b border-[var(--ax-border-soft)]">
                  <th className="py-2 font-medium">Фича</th>
                  <th className="py-2 font-medium text-right">Запросов</th>
                  <th className="py-2 font-medium text-right">Стоимость</th>
                  <th className="py-2 font-medium text-right">Доля</th>
                </tr>
              </thead>
              <tbody>
                {u.byFeature.map(f => (
                  <tr key={f.feature} className="border-b border-[var(--ax-border-soft)] last:border-0">
                    <td className="py-2 font-mono text-[12.5px]">{f.feature}</td>
                    <td className="py-2 text-right">{f.calls.toLocaleString('ru-RU')}</td>
                    <td className="py-2 text-right font-medium">{formatUsd(f.cost)}</td>
                    <td className="py-2 text-right text-[var(--ax-fg-muted)]">
                      {u.last30days > 0 ? `${Math.round((f.cost / u.last30days) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* BY DAY */}
        <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-3">По дням</div>
          {u.byDay.length === 0 ? (
            <div className="text-[13px] text-[var(--ax-fg-faint)]">Нет данных.</div>
          ) : (
            <ul className="space-y-1">
              {u.byDay.slice(-30).reverse().map(d => (
                <li key={d.date} className="flex items-center gap-3 text-[12.5px]">
                  <span className="font-mono w-[90px] text-[var(--ax-fg-muted)]">{d.date}</span>
                  <div className="flex-1 h-2 bg-[var(--ax-hover)] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1F8B5F]" style={{ width: `${Math.min(100, (d.cost / maxDayCost) * 100)}%` }} />
                  </div>
                  <span className="font-medium w-[80px] text-right">{formatUsd(d.cost)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="text-[11.5px] text-[var(--ax-fg-faint)]">
          Цены захардкожены в lib/usage-tracker.ts. Если Azure поменяет тарифы — обнови таблицу.
          Запись в balina_usage идёт fire-and-forget после каждого вызова Azure.
        </div>
      </main>
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-4">
      <div className="text-[11.5px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">{label}</div>
      <div className="text-[22px] font-semibold tracking-tight">{formatUsd(value)}</div>
      {sub && <div className="text-[11.5px] text-[var(--ax-fg-muted)] mt-0.5">{sub}</div>}
    </div>
  )
}

function formatUsd(n: number): string {
  if (n === 0) return '$0'
  if (n < 0.01) return '<$0.01'
  if (n < 1) return `$${n.toFixed(2)}`
  if (n < 100) return `$${n.toFixed(2)}`
  return `$${Math.round(n).toLocaleString('en-US')}`
}
