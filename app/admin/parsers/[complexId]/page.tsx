import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { createClient } from '@supabase/supabase-js'
import { getParser } from '@/lib/complex-parsers'
import { getParserModule } from '@/lib/parsers/_registry'
import { ParserEditor } from './_editor'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Парсер ЖК · Balinsky Admin' }

type Params = Promise<{ complexId: string }>

function firstString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

export default async function ParserPage({ params }: { params: Params }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { complexId } = await params
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: complex } = await sb.from('raw_complexes').select('airtable_id, data, slug').eq('airtable_id', complexId).maybeSingle()
  if (!complex) notFound()
  const name = firstString((complex.data as Record<string, unknown>)['Project']) ?? complex.airtable_id
  const district = firstString((complex.data as Record<string, unknown>)['Location 2']) ?? firstString((complex.data as Record<string, unknown>)['Location'])

  const parser = await getParser(complexId).catch(() => null)
  const mod = getParserModule(complexId)

  return (
    <AdminThemeShell
      title={`Парсер: ${name}`}
      description={`${district ?? '—'} · slug: ${complex.slug ?? '—'} · airtable_id: ${complexId}`}
    >
      <Link href="/admin/parsers" className="inline-block mb-4 text-[12.5px] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] no-underline">← К списку парсеров</Link>
      <ParserEditor complexId={complexId} complexName={name} initial={parser} parserLabel={mod?.label ?? null} />
    </AdminThemeShell>
  )
}
