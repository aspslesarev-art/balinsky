import { NextResponse } from 'next/server'
import { handleStart, fallbackReply } from '@/lib/telegram-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Telegram Bot API webhook handler. Configured via setWebhook with a secret
// token; we verify it on each call so random POSTs can't trigger replies.

type TgMessage = {
  message_id: number
  chat: { id: number; type?: string }
  from?: { id: number; username?: string; first_name?: string }
  text?: string
  date?: number
}
type TgUpdate = {
  update_id: number
  message?: TgMessage
  edited_message?: TgMessage
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'token_missing' }, { status: 500 })

  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret) {
    const got = req.headers.get('x-telegram-bot-api-secret-token')
    if (got !== expectedSecret) return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: TgUpdate
  try { update = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const msg = update.message ?? update.edited_message
  if (!msg?.chat?.id) return NextResponse.json({ ok: true })

  const text = (msg.text ?? '').trim()
  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/)

  let reply
  if (startMatch) {
    const payload = (startMatch[1] ?? '').trim() || null
    reply = await handleStart(payload)
  } else {
    reply = fallbackReply()
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: msg.chat.id,
      text: reply.text,
      parse_mode: reply.parseMode ?? 'HTML',
      disable_web_page_preview: true,
    }),
  }).catch(err => console.error('[telegram] sendMessage failed:', err))

  return NextResponse.json({ ok: true })
}

// Helpful for sanity-checking from a browser.
export async function GET() {
  const ok = !!process.env.TELEGRAM_BOT_TOKEN
  return NextResponse.json({ ok, hint: ok ? 'webhook handler ready' : 'set TELEGRAM_BOT_TOKEN' })
}
