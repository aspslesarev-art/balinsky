// Admin index for ad banners. CRUD happens directly against
// public.ad_banners (migration 020). Раньше тут была статистика из
// ad_banner_stats — таблица никогда не была создана, статистика не
// используется. UI рендерит '—' для CTR/прогресса (stats: {}).

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { loadAllBanners, isBannersTableMissing } from '@/lib/banners'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { BannersEditor } from './_editor'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Реклама · Balinsky Admin' }

export default async function AdsAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  const banners = await loadAllBanners()
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

      <BannersEditor initialBanners={banners} stats={{}} />
    </AdminThemeShell>
  )
}
