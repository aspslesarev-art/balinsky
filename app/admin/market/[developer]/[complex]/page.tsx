import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { loadComplexReport, type SalesDay } from '@/lib/market/complex-report'
import { LoginForm } from '../../../_login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Подробный отчёт по одному комплексу: когда и что продавалось, по какой
// цене, и как двигались цены по каждому юниту.

const DAYS = 60

export default async function ComplexPage({
  params,
}: {
  params: Promise<{ developer: string; complex: string }>
}) {
  const ok = await requireAdmin()
  if (!ok) return <LoginForm />

  const { developer, complex } = await params
  const report = await loadComplexReport(decodeURIComponent(developer), decodeURIComponent(complex), { days: DAYS })
  if (!report) notFound()

  const sold30 = countSold(report.salesByDay, 30)
  const sold7 = countSold(report.salesByDay, 7)

  return (
    <div className="min-h-screen bg-[var(--ax-bg)] text-[var(--ax-fg)] p-6 sm:p-10">
      <main className="max-w-[1200px] mx-auto space-y-8">
        <header>
          <Link href="/admin/market" className="text-[12px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
            ← Рынок
          </Link>
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mt-2 mb-1">{report.developer}</div>
          <h1 className="text-[24px] font-semibold tracking-tight">{report.complex}</h1>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="В продаже" value={`${report.totals.available} шт`} sub={usd(report.totals.availableValueUsd)} />
          <Kpi label="Бронь" value={`${report.totals.reserved} шт`} />
          <Kpi label="Продано всего" value={`${report.totals.sold} шт`} sub={usd(report.totals.soldValueUsd)} />
          <Kpi label="Продано за 30 дней" value={`${sold30} шт`} sub={`за 7 дней: ${sold7}`} />
        </section>

        <Panel
          title="Продажи по дням"
          hint={`столбик — сколько юнитов ушло в этот день. Считаются только продажи, случившиеся при наблюдении: трекер видит комплекс с ${report.trackingSince}, всё проданное до этой даты пришло уже со статусом «продан»`}
        >
          <SalesChart days={report.salesByDay} since={report.trackingSince} />
        </Panel>

        <Panel title="Что продано" hint="переходы в «продано» с ценой, по которой юнит стоял последним">
          {report.soldEvents.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-[var(--ax-fg-muted)] text-left">
                  <tr><Th>Дата</Th><Th>Юнит</Th><Th>Тип</Th><Th right>Площадь</Th><Th right>Цена</Th></tr>
                </thead>
                <tbody>
                  {report.soldEvents.map((e, i) => (
                    <tr key={i} className="border-t border-[var(--ax-border)]">
                      <Td>{e.d}</Td>
                      <Td>{e.unit_key}</Td>
                      <Td className="text-[var(--ax-fg-muted)]">{e.unit_type ?? '—'}</Td>
                      <Td right>{e.area_m2 ? `${e.area_m2} м²` : '—'}</Td>
                      <Td right>{money(e.old_price ?? e.new_price)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>с начала наблюдения ({report.trackingSince}) продаж не зафиксировано</Empty>
          )}
        </Panel>

        <Panel title="Как менялись цены" hint="юниты, у которых цена двигалась; показаны все шаги">
          {report.priceTracks.length ? (
            <div className="space-y-2">
              {report.priceTracks.map(t => (
                <div key={t.unit_key} className="border-t border-[var(--ax-border)] pt-2 text-[13px] flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{t.unit_key}</span>
                  <span className="text-[11px] text-[var(--ax-fg-muted)]">{STATUS_LABEL[t.status] ?? t.status}</span>
                  {t.changes.map((c, i) => (
                    <span key={i} className="text-[var(--ax-fg-muted)] tabular-nums">
                      {i === 0 && <>{money(c.from)} → </>}
                      <span className={pct(c.from, c.to) > 0 ? 'text-red-500' : 'text-emerald-500'}>
                        {money(c.to)}
                      </span>
                      <span className="text-[11px]"> ({c.d}{fmtPct(c.from, c.to)})</span>
                      {i < t.changes.length - 1 && ' → '}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <Empty>цены не менялись</Empty>
          )}
        </Panel>

        <Panel title="Прочие движения" hint="бронь, возврат в продажу, исчезновение из прайса">
          {report.otherEvents.length ? (
            <div className="space-y-1 text-[13px]">
              {report.otherEvents.map((e, i) => (
                <div key={i} className="border-t border-[var(--ax-border)] pt-1.5">
                  <span className="text-[var(--ax-fg-muted)]">{e.d}</span> · {e.unit_key} — {KIND_LABEL[e.kind] ?? e.kind}
                  {e.old_status && e.new_status ? (
                    <span className="text-[var(--ax-fg-muted)]"> ({STATUS_LABEL[e.old_status] ?? e.old_status} → {STATUS_LABEL[e.new_status] ?? e.new_status})</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <Empty>ничего не происходило</Empty>
          )}
        </Panel>

        <Panel title="Все юниты" hint={`${report.units.length} шт по последнему срезу`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[var(--ax-fg-muted)] text-left">
                <tr><Th>Юнит</Th><Th>Тип</Th><Th right>Спален</Th><Th right>Площадь</Th><Th>Статус</Th><Th right>Цена</Th><Th right>$/м²</Th></tr>
              </thead>
              <tbody>
                {report.units.map(u => (
                  <tr key={u.id} className="border-t border-[var(--ax-border)]">
                    <Td>{u.unit_key}</Td>
                    <Td className="text-[var(--ax-fg-muted)]">{u.unit_type ?? '—'}</Td>
                    <Td right>{u.bedrooms ?? '—'}</Td>
                    <Td right>{u.area_m2 ? `${u.area_m2} м²` : '—'}</Td>
                    <Td>
                      <span className={STATUS_COLOR[u.status] ?? ''}>{STATUS_LABEL[u.status] ?? u.status}</span>
                      {u.returned_count > 0 && (
                        <span className="text-[11px] text-amber-500"> · возвращался {u.returned_count}×</span>
                      )}
                    </Td>
                    <Td right>{money(u.price_usd)}</Td>
                    <Td right className="text-[var(--ax-fg-muted)]">{u.price_per_m2 ? `$${Math.round(Number(u.price_per_m2)).toLocaleString('ru-RU')}` : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Источники">
          <div className="space-y-1 text-[12px]">
            {report.sources.map((s, i) => (
              <div key={i} className="border-t border-[var(--ax-border)] pt-1.5">
                <a href={s.source_url} target="_blank" rel="noreferrer" className="underline">{s.source_kind}</a>
                <span className="text-[var(--ax-fg-muted)]"> · обновлён {s.last_scan_at?.slice(0, 16).replace('T', ' ') ?? 'никогда'}</span>
                {s.last_error && <span className="text-amber-500"> · {s.last_error}</span>}
              </div>
            ))}
          </div>
        </Panel>
      </main>
    </div>
  )
}

// Столбики: день без продаж остаётся пустым местом, чтобы паузы читались
// так же ясно, как всплески.
function SalesChart({ days, since }: { days: SalesDay[]; since: string }) {
  const max = Math.max(...days.map(d => d.sold), 1)
  const total = days.reduce((s, d) => s + d.sold, 0)

  if (!total) {
    return (
      <Empty>
        с начала наблюдения ({since}) ни один юнит не переходил в «продано». Столбики появятся,
        как только это случится
      </Empty>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-[3px] h-[140px]">
        {days.map(d => (
          <div key={d.d} className="flex-1 flex flex-col justify-end h-full group relative">
            {d.sold > 0 && (
              <>
                <div className="text-[10px] text-center text-[var(--ax-fg-muted)] mb-0.5">{d.sold}</div>
                <div
                  className="w-full bg-emerald-500/70 rounded-sm min-h-[3px]"
                  style={{ height: `${(d.sold / max) * 100}%` }}
                />
              </>
            )}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap text-[11px] bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded px-1.5 py-0.5 z-10">
              {d.d}: {d.sold ? `${d.sold} шт · ${usd(d.valueUsd)}` : 'нет продаж'}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-[var(--ax-fg-muted)] mt-1.5">
        <span>{days[0]?.d}</span>
        <span>всего за период: {total} шт</span>
        <span>{days[days.length - 1]?.d}</span>
      </div>
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  available: 'в продаже',
  reserved: 'бронь',
  sold: 'продан',
  unknown: 'статус неясен',
}

const STATUS_COLOR: Record<string, string> = {
  available: 'text-emerald-500',
  reserved: 'text-amber-500',
  sold: 'text-[var(--ax-fg-muted)]',
}

const KIND_LABEL: Record<string, string> = {
  reserved: 'ушёл в бронь',
  returned: 'вернулся в продажу',
  gone: 'пропал из прайса',
}

function countSold(days: SalesDay[], lastN: number): number {
  return days.slice(-lastN).reduce((s, d) => s + d.sold, 0)
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

function Td({ children, right, className = '' }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`py-1.5 ${right ? 'text-right tabular-nums' : ''} ${className}`}>{children}</td>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-[var(--ax-fg-muted)]">{children}</div>
}

function pct(from: number | null, to: number | null): number {
  if (!from || !to) return 0
  return ((to - from) / from) * 100
}

function fmtPct(from: number | null, to: number | null): string {
  const p = pct(from, to)
  if (!p) return ''
  return `, ${p > 0 ? '+' : ''}${p.toFixed(1)}%`
}

function usd(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)} млн`
  return `$${Math.round(n).toLocaleString('ru-RU')}`
}

function money(n: number | null): string {
  return n ? `$${Math.round(Number(n)).toLocaleString('ru-RU')}` : '—'
}
