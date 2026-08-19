import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { loadMarketUnits } from '@/lib/market/units-report'
import { LoginForm } from '../../_login'
import { MarketShell } from '../_shell'
import { MarketUnits } from '../_market-units'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Все юниты рынка одной таблицей — чтобы искать поперёк застройщиков:
// «двушки до $200k, которые подешевели», «что вернулось в продажу» и т.п.

export default async function MarketUnitsPage() {
  const ok = await requireAdmin()
  if (!ok) return <LoginForm />

  const { units, trackingSince } = await loadMarketUnits()

  return (
    <MarketShell>
      <header>
        <Link href="/admin/market" className="text-[12px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
          ← Рынок
        </Link>
        <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mt-2 mb-1">
          Все застройщики
        </div>
        <h1 className="text-[24px] font-semibold tracking-tight">Юниты рынка</h1>
        {trackingSince && (
          <div className="text-[12px] text-[var(--ax-fg-muted)] mt-1">
            Наблюдение с {trackingSince}. Колонка «Δ цены» показывает сдвиг с первого зафиксированного
            изменения — у юнитов, которые с тех пор не двигались, там прочерк.
          </div>
        )}
      </header>

      <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
        <MarketUnits units={units} />
      </section>
    </MarketShell>
  )
}
