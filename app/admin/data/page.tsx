// Admin "Базы" — собственный Airtable поверх Supabase. Index page lists every
// configured collection; each links to its data grid.

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { listCollections } from '@/lib/admin/collections'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Базы · Balinsky Admin' }

export default async function DataAdmin() {
  if (!(await requireAdmin())) redirect('/admin')
  const collections = listCollections()

  return (
    <AdminThemeShell
      title="Базы данных"
      description="Свой Airtable поверх Supabase — управление каталогом и контентом прямо здесь."
    >
      {collections.length === 0 ? (
        <div className="text-[13px] text-[var(--ax-fg-muted)]">Коллекции ещё не настроены.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {collections.map(c => (
            <a
              key={c.key}
              href={`/admin/data/${c.key}`}
              className="block rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-4 no-underline hover:bg-[var(--ax-hover)] transition-colors"
            >
              <div className="text-[15px] font-semibold text-[var(--ax-fg)]">{c.label}</div>
              <div className="mt-1 text-[12px] text-[var(--ax-fg-faint)] font-mono">
                {c.table ?? c.bucket ?? c.key}
              </div>
            </a>
          ))}
        </div>
      )}
    </AdminThemeShell>
  )
}
