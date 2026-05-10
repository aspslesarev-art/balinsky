// Admin index for ad banners. Used to be Airtable-backed; now CRUD
// happens directly here against public.ad_banners (migration 020).
// Stats keep coming from ad_banner_stats (impressions / clicks /
// auto_disabled flag set by the impression endpoint).

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { loadAllBanners, isBannersTableMissing } from '@/lib/banners'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { BannersEditor } from './_editor'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Реклама · Balinsky Admin' }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type StatRow = {
  banner_id: string
  impressions_count: number
  clicks_count: number
  last_impression_at: string | null
  last_click_at: string | null
  auto_disabled: boolean
}

async function loadStats(): Promise<Record<string, StatRow>> {
  const { data } = await sb.from('ad_banner_stats').select('*')
  const out: Record<string, StatRow> = {}
  for (const r of (data ?? []) as StatRow[]) out[r.banner_id] = r
  return out
}

export default async function AdsAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  const [banners, stats] = await Promise.all([loadAllBanners(), loadStats()])
  const tableMissing = isBannersTableMissing()

  return (
    <AdminThemeShell
      title="Рекламные баннеры"
      description={`${banners.length} ${banners.length === 1 ? 'баннер' : 'баннеров'}. Управляются прямо здесь — никакой синхронизации с Airtable не нужно.`}
    >
      {tableMissing && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          <div className="font-semibold mb-1">Миграция 020 не применена</div>
          <div className="text-[var(--ax-fg-soft)]">
            Открой <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer" className="underline text-[#1F8B5F]">Supabase SQL Editor</a> и применить SQL из <code className="font-mono">migrations/020_ad_banners.sql</code>. После этого создание / редактирование заработает.
          </div>
        </div>
      )}

      <BannersEditor initialBanners={banners} stats={stats} />
    </AdminThemeShell>
  )
}
