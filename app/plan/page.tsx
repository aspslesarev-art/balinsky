import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { hasPlanAccess } from '@/lib/plan/access'
import { PLAN, PLAN_DEADLINE, PLAN_GOAL_USD } from '@/lib/plan/data'
import { PlanClient } from './_client'

// Личный трекер квартального плана. Виден только владельцу (lib/plan/access.ts),
// сам план лежит константой в lib/plan/data.ts, галочки — в Supabase.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'План',
  robots: { index: false, follow: false, nocache: true },
}

const BALI_OFFSET_MS = 8 * 3600_000

/** Полных дней до дедлайна по Бали; ноль, если дата уже прошла. */
function daysUntil(deadline: string): number {
  const today = new Date(Date.now() + BALI_OFFSET_MS).toISOString().slice(0, 10)
  const diff = Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)
  return Math.max(0, Math.round(diff / 86_400_000))
}

export default async function PlanPage() {
  if (!(await hasPlanAccess())) redirect('/admin')

  return (
    <main className="min-w-0 bg-[var(--color-bg)] py-12">
      <div className="mx-auto grid max-w-[880px] gap-12 px-4 sm:px-6">
        <header>
          <div className="text-[13px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Личный трекер
          </div>
          <h1 className="mt-1 text-[32px] font-semibold tracking-tight text-[var(--color-text)]">
            План квартала
          </h1>
        </header>

        <PlanClient plan={PLAN} goalUsd={PLAN_GOAL_USD} daysLeft={daysUntil(PLAN_DEADLINE)} />
      </div>
    </main>
  )
}
