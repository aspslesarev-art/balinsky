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

  // Source-of-truth warning while Airtable sync is still overwriting Supabase.
  const syncOn = process.env.SYNC_DISABLED !== '1'

  return (
    <AdminThemeShell
      title={cfg.label}
      description={`${total} ${total === 1 ? 'запись' : 'записей'} · ${cfg.table ?? cfg.bucket ?? cfg.key}`}
      fullWidth
      back={{ href: '/admin/data', label: 'Все базы' }}
    >
      {syncOn && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12.5px] text-[var(--ax-fg)] leading-snug">
          <span className="font-semibold">Airtable пока главный.</span>{' '}
          Правки и созданные здесь строки могут быть перезаписаны/удалены следующим синком.
          Полноценное редактирование — после установки <code className="font-mono">SYNC_DISABLED=1</code>.
        </div>
      )}
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
