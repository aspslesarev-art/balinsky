import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { getCollection } from '@/lib/admin/collections'
import { loadQualityReport, hasQualityReport } from '@/lib/admin/data-quality'
import { DataTabs } from '../_tabs'
import { IssuesReport } from './_report'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Проблемы · Balinsky Admin' }

export default async function IssuesPage({ params }: { params: Promise<{ collection: string }> }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { collection } = await params
  const cfg = getCollection(collection)
  if (!cfg || !hasQualityReport(cfg.key)) notFound()

  const report = await loadQualityReport(cfg)

  return (
    <AdminThemeShell
      title={cfg.label}
      description="Проблемы"
      compact
      back={{ href: '/admin/data', label: 'Все базы' }}
      filters={<DataTabs collection={cfg.key} active="issues" counts={report.counts} />}
    >
      <IssuesReport report={report} collection={cfg.key} />
    </AdminThemeShell>
  )
}
