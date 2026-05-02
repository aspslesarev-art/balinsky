import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listAllTags, listChatsByTag, logMessage } from '@/lib/bot-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET — list all tags with counts (for the broadcast UI dropdown).
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const tags = await listAllTags()
  return NextResponse.json({ ok: true, tags })
}

// POST { tag, text } — send `text` to every chat tagged with `tag`.
// Pace at ~25 msg/s to stay under Telegram's 30 msg/s global limit; per-chat
// 1 msg/s is automatically respected because we hit each chat once.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'token_missing' }, { status: 500 })

  let body: { tag?: string; text?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const tag = (body.tag ?? '').trim()
  const text = (body.text ?? '').trim()
  if (!tag) return NextResponse.json({ ok: false, error: 'tag_required' }, { status: 400 })
  if (!text) return NextResponse.json({ ok: false, error: 'text_required' }, { status: 400 })

  const chats = await listChatsByTag(tag)
  if (!chats.length) return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0 })

  let sent = 0
  let failed = 0
  const errors: { chat_id: number; error: string }[] = []

  for (const c of chats) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: c.chat_id,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })
      const j = await r.json().catch(() => null) as { ok?: boolean; result?: { message_id?: number }; description?: string } | null
      if (!j?.ok) {
        failed++
        errors.push({ chat_id: c.chat_id, error: j?.description ?? 'unknown' })
        continue
      }
      sent++
      await logMessage({
        chat_id: c.chat_id,
        direction: 'out',
        source: 'manager',
        text,
        tg_message_id: j?.result?.message_id ?? null,
      })
    } catch (err) {
      failed++
      errors.push({ chat_id: c.chat_id, error: err instanceof Error ? err.message : String(err) })
    }
    // 40 ms gap → ~25 msg/s, comfortably under Telegram's 30/s global cap.
    await new Promise(r => setTimeout(r, 40))
  }

  return NextResponse.json({ ok: true, sent, failed, total: chats.length, errors: errors.slice(0, 20) })
}
