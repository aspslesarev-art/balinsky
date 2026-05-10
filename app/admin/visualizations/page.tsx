// Admin index for the interactive ЖК visualisation feature.
// Lists every published complex with its viz status — visualised
// ones first, then the rest. Click any row → editor for that complex.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { listComplexesWithStatus, isVizTablesMissing } from '@/lib/complex-visualizations'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Визуализации · Balinsky Admin' }

export default async function VisualizationsAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  const all = await listComplexesWithStatus()
  const tablesMissing = isVizTablesMissing()
  const visualised = all.filter(c => c.layerCount > 0)
  const empty = all.filter(c => c.layerCount === 0)

  return (
    <AdminThemeShell
      title="Визуализации ЖК"
      description={`Интерактивный план каждого ЖК — фото с кликабельными зонами, drill-down до конкретного юнита. ${visualised.length} из ${all.length} комплексов уже размечены.`}
    >
      {tablesMissing && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          <div className="font-semibold mb-1">Миграция 019 не применена — режим только для чтения</div>
          <div className="text-[var(--ax-fg-soft)]">
            Сейчас редактор не сможет сохранять. Открой <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer" className="underline text-[#1F8B5F]">Supabase SQL Editor</a> и применить SQL из <code className="font-mono">migrations/019_complex_visualizations.sql</code>. Также создай Storage bucket <code className="font-mono">viz-photos</code> (Public). Потом обнови страницу.
          </div>
        </div>
      )}
      <div className="space-y-8">
        <Section title={`Размечено (${visualised.length})`} items={visualised} />
        <Section title={`Без визуализации (${empty.length})`} items={empty} />
      </div>
    </AdminThemeShell>
  )
}

function Section({ title, items }: { title: string; items: { airtableId: string; slug: string; name: string; layerCount: number; hotspotCount: number }[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="text-[15px] font-semibold mb-3 text-[var(--ax-fg)]">{title}</h2>
      <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)] overflow-hidden">
        {items.map(c => (
          <Link
            key={c.airtableId}
            href={`/admin/visualizations/${encodeURIComponent(c.airtableId)}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium truncate">{c.name}</div>
              <div className="text-[11.5px] text-[var(--ax-fg-faint)] font-mono mt-0.5">{c.slug}</div>
            </div>
            <div className="text-[12px] text-[var(--ax-fg-muted)] tabular-nums shrink-0">
              {c.layerCount > 0
                ? `${c.layerCount} слоёв · ${c.hotspotCount} зон`
                : 'не создана'}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
