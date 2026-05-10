// Admin index for the interactive ЖК visualisation feature.
// Lists every published complex with its viz status — visualised
// ones first, then the rest. Click any row → editor for that complex.

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { listComplexesWithStatus, isVizTablesMissing } from '@/lib/complex-visualizations'
import { VisualizationsBrowser } from './_browser'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Визуализации · Balinsky Admin' }

export default async function VisualizationsAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  const all = await listComplexesWithStatus()
  const tablesMissing = isVizTablesMissing()
  const visualisedCount = all.filter(c => c.layerCount > 0).length

  return (
    <AdminThemeShell
      title="Визуализации ЖК"
      description={`Интерактивный план каждого ЖК — фото с кликабельными зонами, drill-down до конкретного юнита. ${visualisedCount} из ${all.length} комплексов уже размечены.`}
    >
      {tablesMissing && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          <div className="font-semibold mb-1">Миграция 019 не применена — режим только для чтения</div>
          <div className="text-[var(--ax-fg-soft)]">
            Сейчас редактор не сможет сохранять. Открой <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer" className="underline text-[#1F8B5F]">Supabase SQL Editor</a> и применить SQL из <code className="font-mono">migrations/019_complex_visualizations.sql</code>. Также создай Storage bucket <code className="font-mono">viz-photos</code> (Public). Потом обнови страницу.
          </div>
        </div>
      )}
      <VisualizationsBrowser items={all} />
    </AdminThemeShell>
  )
}
