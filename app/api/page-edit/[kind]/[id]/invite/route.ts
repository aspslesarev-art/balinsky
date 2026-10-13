import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { adminSb } from '@/lib/admin/sb'
import { DEV_KEY_FIELD, devToken, newDevKey } from '@/lib/page-edit/dev-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/page-edit/developer/<id>/invite — только команда. Новая личная
// ссылка для застройщика; прежние ссылки и входы по ним перестают работать.
export async function POST(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { kind, id } = await params
  if (kind !== 'developer') return NextResponse.json({ error: 'developer_only' }, { status: 400 })
  const sb = adminSb()
  const { data, error } = await sb.from('raw_developers').select('data').eq('airtable_id', id).maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const key = newDevKey()
  const next = { ...((data as { data: Record<string, unknown> }).data ?? {}), [DEV_KEY_FIELD]: key }
  const { error: upErr } = await sb.from('raw_developers').update({ data: next }).eq('airtable_id', id)
  if (upErr) {
    console.error('[page-edit] invite:', upErr.message)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  const origin = new URL(req.url).origin
  return NextResponse.json({ url: `${origin}/api/page-edit/dev-login?t=${encodeURIComponent(devToken(id, key))}` })
}
