import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { logMessage } from '@/lib/bot-storage'
import { uploadChatMedia, type ChatMediaKind } from '@/lib/chat-media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

async function getChatType(chatId: number): Promise<string | null> {
  const { data } = await sb.from('bot_chats').select('chat_type').eq('chat_id', chatId).maybeSingle()
  return data?.chat_type ?? null
}

// Manager-side send: text-only goes through sendMessage; voice notes go
// through sendVoice; everything else through sendDocument (lets the user
// receive the original file with its original filename, including images
// in lossless quality, instead of Telegram re-compressing photos).
//
// Multipart payload:
//   - kind: 'text' | 'voice' | 'document'  (default: 'text')
//   - text: optional caption / message body
//   - file: Blob for voice/document
//   - duration: optional integer seconds for voice
export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'token_missing' }, { status: 500 })

  const { chatId } = await params
  const id = Number(chatId)
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400 })

  // Assistant chats route inside the website only — there's no Telegram
  // chat_id behind them. Skip the Telegram call entirely and log the
  // message; the visitor's ConsultantWidget polls /api/chat/inbound to
  // pull manager replies in real time.
  const chatType = await getChatType(id)
  const isAssistant = chatType === 'assistant'
  if (isAssistant) {
    return await sendAssistantText(req, id)
  }

  const ct = req.headers.get('content-type') ?? ''
  if (ct.startsWith('application/json')) {
    return await sendText(req, id, token)
  }
  if (!ct.startsWith('multipart/')) {
    return NextResponse.json({ ok: false, error: 'unsupported_content_type' }, { status: 415 })
  }

  let form: FormData
  try { form = await req.formData() }
  catch { return NextResponse.json({ ok: false, error: 'bad_form' }, { status: 400 }) }

  const kind = (form.get('kind') as string | null)?.trim() || 'text'
  const text = ((form.get('text') as string | null) ?? '').trim()
  const fileEntry = form.get('file')
  const duration = Number(form.get('duration')) || null

  if (kind === 'text') return await sendTextRaw(id, token, text)
  if (!(fileEntry instanceof Blob) || fileEntry.size === 0) {
    return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 })
  }

  const file = fileEntry
  const filename = (file as File).name || (kind === 'voice' ? 'voice.ogg' : 'file.bin')
  const mime = file.type || (kind === 'voice' ? 'audio/ogg' : 'application/octet-stream')
  const buf = Buffer.from(await file.arrayBuffer())

  // 1) Forward to Telegram. sendVoice requires OGG/Opus — browsers other
  //    than Firefox give us webm/Opus or mp4/AAC, which Telegram rejects.
  //    Fall back to sendAudio so the message at least lands.
  const buildForm = (field: string, fname: string, fmime: string) => {
    const f = new FormData()
    f.set('chat_id', String(id))
    if (text) f.set('caption', text)
    if (kind === 'voice' && duration) f.set('duration', String(duration))
    f.set(field, new Blob([buf], { type: fmime }), fname)
    return f
  }
  const callTg = async (endpoint: string, body: FormData) => {
    const r = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, { method: 'POST', body })
    return await r.json().catch(() => null) as
      | { ok?: boolean; result?: { message_id?: number; voice?: { duration?: number }; audio?: { duration?: number }; document?: { mime_type?: string } }; description?: string } | null
  }

  let tgEndpoint = kind === 'voice' ? 'sendVoice' : 'sendDocument'
  let tgJson = await callTg(tgEndpoint, buildForm(
    kind === 'voice' ? 'voice' : 'document', filename, mime,
  ))

  if (kind === 'voice' && !tgJson?.ok) {
    // Common case on Chrome/Safari — webm/mp4 isn't a valid voice file.
    // Use sendAudio with the original bytes so the recipient still hears it.
    tgEndpoint = 'sendAudio'
    tgJson = await callTg('sendAudio', buildForm('audio', filename, mime))
  }

  if (!tgJson?.ok) {
    return NextResponse.json({ ok: false, error: 'telegram_failed', detail: tgJson?.description ?? null }, { status: 502 })
  }

  // 2) Mirror into our Storage so the admin UI can render it
  const mediaKind: ChatMediaKind =
    tgEndpoint === 'sendVoice' ? 'voice'
    : tgEndpoint === 'sendAudio' ? 'audio'
    : 'document'
  const mediaUrl = await uploadChatMedia({
    kind: mediaKind, chatId: id, filename, buf, contentType: mime,
  })

  await logMessage({
    chat_id: id,
    direction: 'out',
    source: 'manager',
    text: text || null,
    tg_message_id: tgJson.result?.message_id ?? null,
    media_type: mediaKind,
    media_url: mediaUrl,
    media_filename: filename,
    media_mime: mime,
    media_duration: mediaKind === 'voice' || mediaKind === 'audio'
      ? (tgJson.result?.voice?.duration ?? tgJson.result?.audio?.duration ?? duration ?? null)
      : null,
    media_size: file.size,
  })

  return NextResponse.json({ ok: true })
}

// Manager → visitor on a website assistant chat. We accept JSON or
// multipart text body; voice / files aren't supported yet for
// assistant chats since the widget UI doesn't render them.
async function sendAssistantText(req: Request, id: number) {
  let text = ''
  const ct = req.headers.get('content-type') ?? ''
  if (ct.startsWith('application/json')) {
    try { const body = await req.json() as { text?: string }; text = (body.text ?? '').trim() }
    catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  } else if (ct.startsWith('multipart/')) {
    try { const form = await req.formData(); text = ((form.get('text') as string | null) ?? '').trim() }
    catch { return NextResponse.json({ ok: false, error: 'bad_form' }, { status: 400 }) }
  } else {
    return NextResponse.json({ ok: false, error: 'unsupported_content_type' }, { status: 415 })
  }
  if (!text) return NextResponse.json({ ok: false, error: 'empty_text' }, { status: 400 })
  await logMessage({
    chat_id: id,
    direction: 'out',
    source: 'manager',
    text,
  })
  return NextResponse.json({ ok: true })
}

async function sendText(req: Request, id: number, token: string) {
  let body: { text?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  return await sendTextRaw(id, token, (body.text ?? '').trim())
}

async function sendTextRaw(id: number, token: string, text: string) {
  if (!text) return NextResponse.json({ ok: false, error: 'empty_text' }, { status: 400 })
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  const j = await r.json().catch(() => null) as
    | { ok?: boolean; result?: { message_id?: number }; description?: string } | null
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
