import { NextResponse } from 'next/server'
import { handleStart, fallbackReply } from '@/lib/telegram-handlers'
import { logMessage, upsertChat } from '@/lib/bot-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TgUser = { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string }
type TgMessage = {
  message_id: number
  chat: { id: number; type?: string }
  from?: TgUser
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
  const startPayload = startMatch ? (startMatch[1] ?? '').trim() || null : null

  // Log inbound + bump chat metadata.
  try {
    await upsertChat({
      chat_id: msg.chat.id,
      username: msg.from?.username ?? null,
      first_name: msg.from?.first_name ?? null,
      last_name: msg.from?.last_name ?? null,
      language_code: msg.from?.language_code ?? null,
    }, text)
    await logMessage({
      chat_id: msg.chat.id,
      direction: 'in',
      source: 'user',
      text,
      start_payload: startPayload,
      tg_message_id: msg.message_id,
    })
  } catch (err) {
    console.error('[telegram] log inbound failed:', err)
  }

  const reply = startMatch ? await handleStart(startPayload) : fallbackReply()

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: msg.chat.id,
        text: reply.text,
        parse_mode: reply.parseMode ?? 'HTML',
        disable_web_page_preview: true,
      }),
    })
    const j = await r.json().catch(() => null) as { result?: { message_id?: number } } | null
    await logMessage({
      chat_id: msg.chat.id,
      direction: 'out',
      source: 'bot',
      text: reply.text,
      tg_message_id: j?.result?.message_id ?? null,
    })
  } catch (err) {
    console.error('[telegram] sendMessage failed:', err)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const ok = !!process.env.TELEGRAM_BOT_TOKEN
  return NextResponse.json({ ok, hint: ok ? 'webhook handler ready' : 'set TELEGRAM_BOT_TOKEN' })
}
