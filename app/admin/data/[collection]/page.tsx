import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import type { RecordRow } from '@/lib/admin/adapters/types'
import { loadQualityReport, hasQualityReport } from '@/lib/admin/data-quality'
import { DataGridScreen } from './_grid'
import { DataTabs } from './_tabs'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Базы · Balinsky Admin' }

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>
  // `?open=<id>` — переход из вкладки «Проблемы» сразу в карточку записи.
  searchParams: Promise<{ open?: string }>
}) {
  if (!(await requireAdmin())) redirect('/admin')
  const { collection } = await params
  const { open } = await searchParams
  const cfg = getCollection(collection)
  if (!cfg) notFound()

  // Счётчик на вкладке считается тем же сканом, что и сама вкладка, и живёт в
  // кэше с тегом коллекции — то есть обновляется на первой же правке.
  const counts = hasQualityReport(cfg.key) ? (await loadQualityReport(cfg)).counts : null

  let rows: RecordRow[] = []
  let total = 0
  let loadError: string | null = null
  try {
    const res = await adapterFor(cfg).list(cfg, { sort: cfg.defaultSort, page: 0, pageSize: 50 })
    rows = res.rows
    total = res.total
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'load_failed'
  }

  return (
    <AdminThemeShell
      title={cfg.label}
      description={`${total} ${total === 1 ? 'запись' : 'записей'}`}
      fullWidth
      compact
      back={{ href: '/admin/data', label: 'Все базы' }}
      filters={<DataTabs collection={cfg.key} active="grid" counts={counts} />}
    >
      {loadError ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          Ошибка загрузки: <span className="font-mono">{loadError}</span>
        </div>
      ) : (
        <DataGridScreen cfg={cfg} initialRows={rows} total={total} openId={open ?? null} />
      )}
    </AdminThemeShell>
  )
}
