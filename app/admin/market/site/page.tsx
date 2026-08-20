// Цены на сайте из прайсов застройщиков: какие объявления связаны с
// юнитами, что автообновление уже поменяло и что ждёт руки.

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { loadSiteReport } from '@/lib/market/site-report'
import { LoginForm } from '../../_login'
import { MarketShell } from '../_shell'
import { LinkedTable, PendingTable } from './_link-table'
import { SyncButton } from './_sync-button'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const usd = (n: number | null) => (n === null ? '—' : `$${n.toLocaleString('ru-RU')}`)

export default async function MarketSitePage() {
  const ok = await requireAdmin()
  if (!ok) return <LoginForm />

  const r = await loadSiteReport()
  const applied = r.log.filter(l => l.outcome === 'applied')
  // Надбавка в ноль означает, что цена каталога равна прайсу. Если прайс
  // застройщика без мебели, такая цена на сайте занижена — сам этого
  // отличить трекер не может, поэтому просто показываем счётчик.
  const noMarkup = r.linked.filter(l => l.ratio !== null && Math.abs(l.ratio - 1) < 0.005).length
  const held = r.log.filter(l => l.outcome.startsWith('skipped'))
  const sold = r.log.filter(l => l.outcome === 'unit_sold')

  return (
    <MarketShell>
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">Трекер рынка</div>
          <h1 className="text-[24px] font-semibold tracking-tight">Цены на сайте</h1>
        </div>
        <div className="flex items-center gap-3">
          <SyncButton />
          <Link href="/admin/market" className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
            ← к трекеру
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Связано с прайсом" value={`${r.totals.linked}`} sub={`объявлений в комплексах трекера: ${r.totals.inTrackedComplexes}`} />
        <Kpi label="Проверено сегодня" value={`${r.totals.checkedToday}`} sub="на карточке стоит сегодняшняя дата сверки" />
        <Kpi label="Ждёт человека" value={`${held.length}`} sub="цена уехала больше чем на четверть" />
        <Kpi label="Цена ровно по прайсу" value={`${noMarkup}`} sub="надбавка 0% — проверьте, есть ли в прайсе мебель" />
      </section>

      <Panel title="Ждут пары" hint="объявления в комплексах, которые трекер видит, но конкретный юнит не определился сам: в комплексе несколько одинаковых по площади. Выбор сохраняется сразу.">
        <PendingTable rows={r.pending} />
      </Panel>

      <Panel
        title="Связанные объявления"
        hint="Синхронизируется не цена прайса, а её изменение: объекты каталога продаются меблированными, а прайс застройщика бывает и без мебели, и в рассрочку. Надбавка запоминается при связывании и её можно поправить — прайс подорожал на 3%, объявление подорожает на те же 3% вместе с надбавкой. Один юнит может стоять в каталоге несколькими объявлениями (другая комплектация, перепродажа от инвестора) — это нормально, у каждого своя цена. «выкл» оставляет объявление на ручной цене — например, когда цену ставит не застройщик."
      >
        <LinkedTable rows={r.linked} />
      </Panel>

      <Panel title="Что менялось" hint="журнал автообновления">
        {r.log.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[var(--ax-fg-muted)] text-left">
                <tr className="border-b border-[var(--ax-border)]">
                  <th className="py-2 pr-3">когда</th>
                  <th className="py-2 pr-3">объявление</th>
                  <th className="py-2 pr-3 text-right">было</th>
                  <th className="py-2 pr-3 text-right">стало</th>
                  <th className="py-2">что</th>
                </tr>
              </thead>
              <tbody>
                {r.log.map((l, i) => (
                  <tr key={i} className="border-b border-[var(--ax-border)]">
                    <td className="py-2 pr-3 text-[var(--ax-fg-muted)]">{new Date(l.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-2 pr-3">{l.listingId}</td>
                    <td className="py-2 pr-3 text-right">{usd(l.oldPrice)}</td>
                    <td className="py-2 pr-3 text-right">{usd(l.newPrice)}</td>
                    <td className="py-2 text-[var(--ax-fg-muted)]">{outcomeLabel(l.outcome)}{l.note ? ` — ${l.note}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[13px] text-[var(--ax-fg-muted)]">автообновление ещё ничего не меняло</div>
        )}
      </Panel>

      {sold.length > 0 && (
        <Panel title="Юниты ушли из продажи" hint="объявление на сайте остаётся как есть — снимать его с публикации автомату не поручено">
          <ul className="text-[13px] space-y-1">
            {sold.slice(0, 20).map((l, i) => (
              <li key={i} className="text-[var(--ax-fg-muted)]">{l.listingId} — {l.note}</li>
            ))}
          </ul>
        </Panel>
      )}
    </MarketShell>
  )
}

function outcomeLabel(v: string): string {
  if (v === 'applied') return 'цена обновлена'
  if (v === 'skipped_big_change') return 'отложено'
  if (v === 'skipped_bad_ratio') return 'надбавка вне границ — пара под вопросом'
  if (v === 'unit_sold') return 'юнит ушёл из продажи'
  return v
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-bg-soft)] p-4">
      <div className="text-[12px] text-[var(--ax-fg-muted)] mb-1">{label}</div>
      <div className="text-[20px] font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-[12px] text-[var(--ax-fg-muted)] mt-1">{sub}</div>}
    </div>
  )
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-bg-soft)] p-4 sm:p-5">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <div className="text-[12px] text-[var(--ax-fg-muted)] mt-0.5">{hint}</div>}
      </div>
      {children}
    </section>
  )
}
