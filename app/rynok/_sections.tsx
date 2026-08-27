import type { EventRow, MarketReport, StockRow } from '@/lib/market/report'

// Показ закрытого отчёта о движении рынка. Только раскладка: все выборки
// уже посчитаны в lib/market/report.ts.
//
// Вёрстка строчная, а не табличная: то же самое в таблице на телефоне
// уезжает в горизонтальную прокрутку, а список переносится сам.

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function day(d: string): string {
  const [, m, dd] = d.split('-')
  const mi = Number(m) - 1
  return MONTHS[mi] ? `${Number(dd)} ${MONTHS[mi]}` : d
}

function money(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  if (!v) return '—'
  return `$${Math.round(v).toLocaleString('ru-RU')}`
}

function bigMoney(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)} млн`
  return money(n)
}

export function Card({
  title,
  hint,
  count,
  children,
}: {
  title: string
  hint?: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white ring-1 ring-[var(--color-border)]">
      <div className="flex flex-wrap items-baseline gap-x-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
        <h2 className="text-[17px] font-semibold text-[#111827]">{title}</h2>
        {count != null && (
          <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-primary-pressed)]">
            {count}
          </span>
        )}
        {hint ? <p className="w-full text-[13px] text-[var(--color-text-muted)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-[14px] text-[var(--color-text-muted)] sm:px-5">{children}</p>
}

export function Kpis({ r }: { r: MarketReport }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="В продаже сейчас" value={`${r.totals.available}`} unit="юнитов" sub={`на ${bigMoney(r.totals.availableValueUsd)}`} />
      <Kpi label="Ушло с рынка" value={`${r.soldCounts.week}`} unit="за неделю" sub={`за месяц: ${r.soldCounts.month}`} />
      <Kpi label="Движение цен" value={`${r.priceMoves.length}`} unit="за месяц" sub={priceDirection(r.priceMoves)} />
      <Kpi label="Под наблюдением" value={`${r.totals.tracked}`} unit="юнитов" sub={`в брони: ${r.totals.reserved}`} />
    </div>
  )
}

function priceDirection(rows: EventRow[]): string {
  const up = rows.filter(e => e.kind === 'price_up').length
  const down = rows.length - up
  if (!rows.length) return 'цены стояли'
  return `вверх ${up}, вниз ${down}`
}

function Kpi({ label, value, unit, sub }: { label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-[var(--color-border)]">
      <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold tabular-nums tracking-tight text-[#111827]">{value}</span>
        <span className="text-[13px] text-[var(--color-text-muted)]">{unit}</span>
      </div>
      {sub ? <div className="text-[13px] text-[var(--color-text-muted)]">{sub}</div> : null}
    </div>
  )
}

function Where({ e }: { e: EventRow }) {
  return (
    <span className="min-w-0 flex-1 basis-[240px]">
      <span className="font-medium text-[#111827]">{e.complex}</span>
      <span className="text-[var(--color-text-muted)]"> · {e.developer}</span>
      <span className="block text-[13px] text-[var(--color-text-muted)]">
        {e.unit_key}
        {e.area_m2 ? ` · ${e.area_m2} м²` : ''}
        {' · '}
        {day(e.d)}
      </span>
    </span>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--color-border)] px-4 py-3 first:border-t-0 sm:px-5">
      {children}
    </li>
  )
}

/** «Вернулось в продажу» и «Ушло с рынка» — событие плюс цена. */
export function EventFeed({ rows }: { rows: EventRow[] }) {
  return (
    <ul>
      {rows.map((e, i) => (
        <Row key={i}>
          <Where e={e} />
          <span className="text-right text-[15px] font-medium tabular-nums text-[#111827]">
            {money(e.new_price ?? e.old_price)}
          </span>
        </Row>
      ))}
    </ul>
  )
}

/** «Движение цен» — было → стало и величина сдвига. */
export function PriceFeed({ rows }: { rows: EventRow[] }) {
  return (
    <ul>
      {rows.map((e, i) => {
        const pct = e.price_change_pct
        const up = Number(pct) > 0
        return (
          <Row key={i}>
            <Where e={e} />
            <span className="text-[14px] tabular-nums text-[var(--color-text-muted)]">
              <span className="line-through">{money(e.old_price)}</span>
              {' → '}
              <span className="font-medium text-[#111827]">{money(e.new_price)}</span>
            </span>
            <span
              className={`min-w-14 shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-center text-[13px] font-medium tabular-nums ${
                up ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {pct !== null ? `${up ? '+' : ''}${pct}%` : '—'}
            </span>
          </Row>
        )
      })}
    </ul>
  )
}

/** Объём по комплексам: сколько свободно и на какую сумму. */
export function StockList({ rows }: { rows: StockRow[] }) {
  return (
    <ul>
      {rows.map((s, i) => (
        <Row key={i}>
          <span className="min-w-0 flex-1 basis-[240px]">
            <span className="font-medium text-[#111827]">{s.complex}</span>
            <span className="text-[var(--color-text-muted)]"> · {s.developer}</span>
            <span className="block text-[13px] text-[var(--color-text-muted)]">
              свободно {s.available} из {s.total}
              {s.reserved ? ` · в брони ${s.reserved}` : ''}
              {s.sold ? ` · продано ${s.sold}` : ''}
            </span>
          </span>
          <span className="text-right text-[15px] font-medium tabular-nums text-[#111827]">
            {bigMoney(Number(s.available_value_usd ?? 0))}
          </span>
        </Row>
      ))}
    </ul>
  )
}
