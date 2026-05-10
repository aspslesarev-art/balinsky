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
  getComplexHeader, listLayers, listHotspots, listUnitsForComplex,
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

  return (
    <AdminThemeShell
      title={header.name}
      description={`Редактор интерактивного плана. Загрузите фото панорамы, нарисуйте кликабельные зоны и привяжите каждую к следующему слою или конкретному юниту. ${units.length} юнитов в каталоге этого ЖК.`}
    >
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
