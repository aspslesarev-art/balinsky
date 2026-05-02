import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { setBotDisabled } from '@/lib/bot-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { chatId } = await params
  const id = Number(chatId)
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400 })
  let body: { disabled?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  if (typeof body.disabled !== 'boolean') return NextResponse.json({ ok: false, error: 'bad_body' }, { status: 400 })
  await setBotDisabled(id, body.disabled)
  return NextResponse.json({ ok: true, disabled: body.disabled })
}
