// Per-complex visualisation editor.
//
// Server component loads the full payload (header, layers, hotspots,
// candidate units) once and hands it to the client editor. All
// mutations go through /api/admin/visualizations/* — the editor
// re-fetches its own state on save instead of re-rendering from
// the server, so this page is just the initial-data shell.

import { redirect, notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import {
  getComplexHeader, listLayers, listHotspots, listUnitsForComplex, isVizTablesMissing,
} from '@/lib/complex-visualizations'
import { VisualizationEditor } from './_editor'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Редактор визуализации · Balinsky Admin' }

export default async function VisualizationEditorPage({ params }: { params: Promise<{ complexId: string }> }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { complexId } = await params
  const decoded = decodeURIComponent(complexId)

  const header = await getComplexHeader(decoded)
  if (!header) notFound()
  const [layers, units] = await Promise.all([
    listLayers(decoded),
    listUnitsForComplex(decoded),
  ])
  const hotspots = layers.length > 0 ? await listHotspots(layers.map(l => l.id)) : []
  const tablesMissing = isVizTablesMissing()

  return (
    <AdminThemeShell
      title={header.name}
      description={`Редактор интерактивного плана. Загрузите фото панорамы, нарисуйте кликабельные зоны и привяжите каждую к следующему слою или конкретному юниту. ${units.length} юнитов в каталоге этого ЖК.`}
    >
      {tablesMissing && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          <div className="font-semibold mb-1">Миграция 019 не применена — сохранение не сработает</div>
          <div className="text-[var(--ax-fg-soft)]">
            Открой <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer" className="underline text-[#1F8B5F]">Supabase SQL Editor</a> и применить миграцию из <code className="font-mono">migrations/019_complex_visualizations.sql</code>. Плюс создай Storage bucket <code className="font-mono">viz-photos</code> (Public). После этого обнови страницу.
          </div>
        </div>
      )}
      <VisualizationEditor
        complexId={decoded}
        complexSlug={header.slug}
        complexName={header.name}
        initialLayers={layers}
        initialHotspots={hotspots}
        units={units}
      />
    </AdminThemeShell>
  )
}
