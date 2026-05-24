// Admin index for the per-complex price-list parser. Mirrors
// /admin/visualizations: list of every published ЖК, sorted with
// configured-parser rows on top.

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { listComplexesWithParserStatus } from '@/lib/complex-parsers'
import { ParsersBrowser } from './_browser'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Парсеры · Balinsky Admin' }

export default async function ParsersAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  let items: Awaited<ReturnType<typeof listComplexesWithParserStatus>> = []
  let tableMissing = false
  try {
    items = await listComplexesWithParserStatus()
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (/complex_parsers/.test(msg) || /relation/.test(msg)) tableMissing = true
    else throw e
  }
  const withParser = items.filter(i => i.parser).length

  return (
    <AdminThemeShell
      title="Парсеры прайсов"
      description={`Парсер прайс-листа на каждый ЖК — Google Sheets / CSV → Airtable «Юниты Виллы». ${withParser} из ${items.length} комплексов уже подключены.`}
    >
      {tableMissing && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-[var(--ax-fg)]">
          <div className="font-semibold mb-1">Миграция 033 не применена</div>
          <div className="text-[var(--ax-fg-soft)]">
            Сейчас редактор не сможет ничего сохранять. Открой <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noopener noreferrer" className="underline text-[#1F8B5F]">Supabase SQL Editor</a> и выполни <code className="font-mono">migrations/033_complex_parsers.sql</code>. После этого обнови страницу.
          </div>
        </div>
      )}
      <ParsersBrowser items={items} />
    </AdminThemeShell>
  )
}
