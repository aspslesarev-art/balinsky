// Трекер рынка застройщиков: сколько объёма в продаже, что ушло, что
// вернулось и как двигались цены. Данные собирает /api/cron/market-scan.

import { requireAdmin } from '@/lib/admin-auth'
import { loadMarketReport, type EventRow } from '@/lib/market/report'
import { LoginForm } from '../_login'
import { MarketShell } from './_shell'
import { StockTable } from './_stock-table'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function MarketPage() {
  const ok = await requireAdmin()
  if (!ok) return <LoginForm />

  const r = await loadMarketReport()

  return (
    <MarketShell>
        <header>
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">Прайсы застройщиков</div>
          <h1 className="text-[24px] font-semibold tracking-tight">Трекер рынка</h1>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="В продаже" value={`${r.totals.available} шт`} sub={usd(r.totals.availableValueUsd)} />
          <Kpi label="Продано за сегодня" value={`${r.soldCounts.today} шт`} sub={`за 7 дней: ${r.soldCounts.week}`} />
          <Kpi label="Продано за 30 дней" value={`${r.soldCounts.month} шт`} sub={`всего продано: ${r.totals.sold}`} />
          <Kpi label="Под наблюдением" value={`${r.totals.tracked} юнитов`} sub={`бронь: ${r.totals.reserved}, статус неясен: ${r.totals.unknown}`} />
        </section>

        <Panel title="Вернулось в продажу" hint="юнит был продан или забронирован, а потом снова появился свободным">
          {r.returned.length ? <EventTable rows={r.returned} /> : <Empty>за последний месяц таких не было</Empty>}
        </Panel>

        <Panel title="Движение цен" hint="за последние 30 дней">
          {r.priceMoves.length ? <EventTable rows={r.priceMoves} showPrice /> : <Empty>цены не менялись</Empty>}
        </Panel>

        <Panel title="Ушло с рынка" hint="переходы в «продано» за последние 30 дней">
          {r.recentSold.length ? <EventTable rows={r.recentSold} /> : <Empty>продаж пока не зафиксировано</Empty>}
        </Panel>

        <Panel title="Объём по комплексам" hint="фильтры по застройщику и комплексу, сортировка — клик по заголовку; название комплекса ведёт в подробный отчёт">
          <StockTable rows={r.stock} />
        </Panel>

        <Panel title="Источники" hint={`${r.health.ok} собираются, ${r.health.error} с ошибкой, ${r.health.pending} ещё не опрошены`}>
          <div className="flex flex-wrap gap-2 mb-4">
            {r.coverage.map(c => (
              <span key={c.kind} className="text-[12px] px-2 py-1 rounded-lg border border-[var(--ax-border)] text-[var(--ax-fg-muted)]">
                {c.kind}: {c.scanned}/{c.count}
              </span>
            ))}
          </div>
          {r.health.problems.length ? (
            <div className="space-y-2">
              {r.health.problems.map((p, i) => (
                <div key={i} className="text-[12px] border-t border-[var(--ax-border)] pt-2">
                  <span className={p.last_status === 'error' ? 'text-red-500' : 'text-amber-500'}>
                    {p.last_status === 'error' ? '✗' : '!'}
                  </span>{' '}
                  <a href={p.source_url} target="_blank" rel="noreferrer" className="underline">
                    {p.developer} / {p.complex}
                  </a>{' '}
                  <span className="text-[var(--ax-fg-muted)]">{p.last_error}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>все источники разбираются без замечаний</Empty>
          )}
        </Panel>
    </MarketShell>
  )
}

const KIND_LABEL: Record<string, string> = {
  sold: 'продан',
  reserved: 'бронь',
  returned: 'вернулся в продажу',
  listed: 'появился',
  price_up: 'цена выросла',
  price_down: 'цена упала',
  gone: 'пропал из прайса',
}

function EventTable({ rows, showPrice = false }: { rows: EventRow[]; showPrice?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="text-[var(--ax-fg-muted)] text-left">
          <tr>
            <Th>Дата</Th><Th>Комплекс</Th><Th>Юнит</Th><Th>Событие</Th>
            {showPrice ? <><Th right>Было</Th><Th right>Стало</Th><Th right>Δ</Th></> : <Th right>Цена</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={i} className="border-t border-[var(--ax-border)]">
              <Td>{e.d}</Td>
              <Td>
                <span className="text-[var(--ax-fg-muted)]">{e.developer}</span> / {e.complex}
              </Td>
              <Td>{e.unit_key}{e.area_m2 ? <span className="text-[var(--ax-fg-muted)]"> · {e.area_m2} м²</span> : null}</Td>
              <Td>{KIND_LABEL[e.kind] ?? e.kind}</Td>
              {showPrice ? (
                <>
                  <Td right>{money(e.old_price)}</Td>
                  <Td right>{money(e.new_price)}</Td>
                  <Td right>
                    <span className={Number(e.price_change_pct) > 0 ? 'text-red-500' : 'text-emerald-500'}>
                      {e.price_change_pct !== null ? `${e.price_change_pct > 0 ? '+' : ''}${e.price_change_pct}%` : '—'}
                    </span>
                  </Td>
                </>
              ) : (
                <Td right>{money(e.new_price ?? e.old_price)}</Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint ? <div className="text-[12px] text-[var(--ax-fg-muted)]">{hint}</div> : null}
      </div>
      {children}
    </section>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-4">
      <div className="text-[12px] text-[var(--ax-fg-muted)]">{label}</div>
      <div className="text-[20px] font-semibold tracking-tight">{value}</div>
      {sub ? <div className="text-[12px] text-[var(--ax-fg-muted)] mt-0.5">{sub}</div> : null}
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`font-normal pb-2 ${right ? 'text-right' : ''}`}>{children}</th>
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`py-1.5 ${right ? 'text-right tabular-nums' : ''}`}>{children}</td>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-[var(--ax-fg-muted)]">{children}</div>
}

function usd(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)} млн`
  return `$${Math.round(n).toLocaleString('ru-RU')}`
}

function money(n: number | null): string {
  return n ? `$${Math.round(Number(n)).toLocaleString('ru-RU')}` : '—'
}
