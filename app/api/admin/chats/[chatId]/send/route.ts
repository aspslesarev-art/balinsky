import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { logMessage } from '@/lib/bot-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'token_missing' }, { status: 500 })

  const { chatId } = await params
  const id = Number(chatId)
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400 })

  let body: { text?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const text = (body.text ?? '').trim()
  if (!text) return NextResponse.json({ ok: false, error: 'empty_text' }, { status: 400 })

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  const j = await r.json().catch(() => null) as { ok?: boolean; result?: { message_id?: number }; description?: string } | null
  if (!j?.ok) {
    return NextResponse.json({ ok: false, error: 'telegram_failed', detail: j?.description ?? null }, { status: 502 })
  }

  await logMessage({
    chat_id: id,
    direction: 'out',
    source: 'manager',
    text,
    tg_message_id: j?.result?.message_id ?? null,
  })

  return NextResponse.json({ ok: true })
}
