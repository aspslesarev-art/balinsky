import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { getCollection } from '@/lib/admin/collections'
import { adapterFor } from '@/lib/admin/adapters'
import type { RecordRow } from '@/lib/admin/adapters/types'
import { DataGridScreen } from './_grid'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Базы · Balinsky Admin' }

export default async function CollectionPage({ params }: { params: Promise<{ collection: string }> }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { collection } = await params
  const cfg = getCollection(collection)
  if (!cfg) notFound()

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
      description={`${total} ${total === 1 ? 'запись' : 'записей'} · ${cfg.table ?? cfg.bucket ?? cfg.key}`}
      fullWidth
      back={{ href: '/admin/data', label: 'Все базы' }}
    >
      {loadError ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          Ошибка загрузки: <span className="font-mono">{loadError}</span>
        </div>
      ) : (
        <DataGridScreen cfg={cfg} initialRows={rows} total={total} />
      )}
    </AdminThemeShell>
  )
}
