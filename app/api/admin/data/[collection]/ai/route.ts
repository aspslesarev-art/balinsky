// Admin-only: generate content for one field via Azure. Body: { field, row }.
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { generateField } from '@/lib/admin/ai-generate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { field?: string; row?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const field = (body.field ?? '').trim()
  if (!field) return NextResponse.json({ ok: false, error: 'no_field' }, { status: 400 })

  try {
    const text = await generateField(field, body.row ?? {})
    return NextResponse.json({ ok: true, text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'generate_failed'
    const status = msg === 'no_prompt' ? 400 : 500
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}
