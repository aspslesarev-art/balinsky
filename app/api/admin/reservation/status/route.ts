import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const ALLOWED = new Set(['pending', 'invoice_sent', 'paid', 'cancelled', 'expired'])

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  let body: { id?: string; status?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const id = body.id?.trim()
  const status = body.status?.trim()
  if (!id || !status || !ALLOWED.has(status)) {
    return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 })
  }
  const { error } = await sb
    .from('reservations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('[admin/reservation/status]', error.message)
    return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
