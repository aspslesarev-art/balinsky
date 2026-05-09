import { NextResponse } from 'next/server'
import { handleStart, fallbackReply, handleSubscriptionCommand, handleDeleteCommand } from '@/lib/telegram-handlers'
import { replyAsBalina } from '@/lib/balina-telegram'
import { logMessage, upsertChat, getChat, shouldBotAutoReply, addChatTags } from '@/lib/bot-storage'
import { handleReservationCallback } from '@/lib/telegram-reservation'
import { refreshChatAvatar } from '@/lib/chat-avatars'
import { uploadChatMedia, downloadTelegramFile, type ChatMediaKind } from '@/lib/chat-media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TgUser = { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string }
type TgFile = { file_id: string; file_size?: number; mime_type?: string; file_name?: string; duration?: number }
type TgChatType = 'private' | 'group' | 'supergroup' | 'channel'
type TgMessage = {
  message_id: number
  chat: { id: number; type?: TgChatType; title?: string }
  from?: TgUser
  text?: string
  caption?: string
  date?: number
  voice?: TgFile
  audio?: TgFile
  document?: TgFile
  video?: TgFile
  video_note?: TgFile
  sticker?: TgFile & { emoji?: string }
  photo?: Array<TgFile & { width: number; height: number }>
}
type TgCallbackQuery = {
  id: string
  from?: TgUser
  message?: { message_id: number; chat: { id: number }; text?: string }
  data?: string
}
type TgUpdate = {
  update_id: number
  message?: TgMessage
  edited_message?: TgMessage
  callback_query?: TgCallbackQuery
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

  // Reservation confirm/cancel taps come in as callback_query — they share
  // the bot but bypass the chat handover/auto-reply pipeline below.
  if (update.callback_query?.data?.startsWith('rsv:')) {
    await handleReservationCallback(token, update.callback_query)
    return NextResponse.json({ ok: true, callback: true })
  }

  const msg = update.message ?? update.edited_message
  if (!msg?.chat?.id) return NextResponse.json({ ok: true })

  const text = (msg.text ?? msg.caption ?? '').trim()
  const startMatch = (msg.text ?? '').trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/)
  const startPayload = startMatch ? (startMatch[1] ?? '').trim() || null : null

  // Detect media. Photos come as size-graded array — pick the largest.
  const media = detectMedia(msg)
  let mediaUrl: string | null = null
  let mediaFilename: string | null = null
  let mediaMime: string | null = null
  let mediaDuration: number | null = null
  let mediaSize: number | null = null
  if (media) {
    const dl = await downloadTelegramFile(token, media.file.file_id)
    if (dl) {
      mediaFilename = media.file.file_name ?? defaultFilename(media.kind, media.file)
      mediaMime = media.file.mime_type ?? dl.mime
      mediaSize = media.file.file_size ?? dl.buf.length
      mediaDuration = media.file.duration ?? null
      mediaUrl = await uploadChatMedia({
        kind: media.kind, chatId: msg.chat.id,
        filename: mediaFilename, buf: dl.buf, contentType: mediaMime,
      })
    }
  }

  // Compose a list-preview line for upsertChat — same logic the storage
  // layer uses for outbound media. In groups the speaker varies, so we
  // prefix with their first name to keep the list readable.
  const chatType = (msg.chat.type ?? 'private') as 'private' | 'group' | 'supergroup' | 'channel'
  const isGroupKind = chatType !== 'private'
  const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ').trim() || msg.from?.username || null
  const bodyPreview = text || (media ? mediaPreview(media.kind, mediaFilename, mediaDuration) : '')
  const previewText = isGroupKind && senderName && bodyPreview
    ? `${senderName}: ${bodyPreview}`
    : bodyPreview

  // Log inbound + bump chat metadata.
  try {
    await upsertChat({
      chat_id: msg.chat.id,
      // For groups Telegram sends `chat.title` and per-message `from`. We
      // store the chat-level title separately and leave first/last blank
      // since they belong to whoever spoke last, not the chat itself.
      username: isGroupKind ? null : msg.from?.username ?? null,
      first_name: isGroupKind ? null : msg.from?.first_name ?? null,
      last_name: isGroupKind ? null : msg.from?.last_name ?? null,
      language_code: msg.from?.language_code ?? null,
      chat_type: chatType,
      title: msg.chat.title ?? null,
    }, previewText)
    await logMessage({
      chat_id: msg.chat.id,
      direction: 'in',
      source: 'user',
      text: text || null,
      start_payload: startPayload,
      tg_message_id: msg.message_id,
      media_type: media?.kind ?? null,
      media_url: mediaUrl,
      media_filename: mediaFilename,
      media_mime: mediaMime,
      media_duration: mediaDuration,
      media_size: mediaSize,
      sender_id: isGroupKind ? msg.from?.id ?? null : null,
      sender_name: isGroupKind ? senderName : null,
    })
    // Refresh the cached profile photo (throttled to 24h inside the
    // helper). Awaited so it actually fires on serverless. Skip in groups
    // — getUserProfilePhotos only returns useful data for private chats.
    if (!isGroupKind) {
      await refreshChatAvatar(token, msg.chat.id)
    }
  } catch (err) {
    console.error('[telegram] log inbound failed:', err)
  }

  // In groups the bot is a passive logger — never auto-replies, never
  // greets. Manager-side sends from /admin still flow through unchanged.
  if (isGroupKind) {
    return NextResponse.json({ ok: true, kind: chatType })
  }

  // Handover: if the manager is actively in this chat (replied within the
  // last 10 min) or has hard-paused the bot, skip the auto-reply entirely.
  // Inbound message is still logged above so the manager sees it.
  const chatRow = await getChat(msg.chat.id)
  if (!shouldBotAutoReply(chatRow)) {
    return NextResponse.json({ ok: true, handover: true })
  }

  // Four handler tiers in priority order:
  //   1. /start <payload> — deep-link from the site (manager / rental
  //      / event / saved-search subscribe).
  //   2. /мои /стоп /subs /stop — saved-search management commands.
  //   3. /удалить_<id> — emitted by /мои listing inline-style.
  //   4. Free-form text or voice → Balina (the AI consultant). She
  //      sends her own reply messages (text + photo cards) and we
  //      short-circuit out of the boilerplate path below.
  const startResult = startMatch ? await handleStart(startPayload, msg.chat.id) : null
  let commandReply = null
  if (!startResult && text) {
    commandReply = (await handleSubscriptionCommand(text, msg.chat.id))
                ?? (await handleDeleteCommand(text, msg.chat.id))
  }

  if (!startResult && !commandReply) {
    // Voice messages come as `msg.voice` (file_id + duration); we
    // download + Whisper-transcribe inside replyAsBalina. Plain
    // text uses `text` directly. Anything else (sticker, document
    // without caption, etc.) falls through to the boilerplate.
    const voiceFileId = msg.voice?.file_id ?? null
    if (text || voiceFileId) {
      const lang: 'ru' | 'en' = (msg.from?.language_code ?? '').startsWith('en') ? 'en' : 'ru'
      const balina = await replyAsBalina({
        chatId: msg.chat.id, token, lang,
        userText: text || undefined,
        voiceFileId,
      }).catch(err => { console.error('[telegram] balina failed:', err); return { handled: false } })
      if (balina.handled) {
        return NextResponse.json({ ok: true, balina: true })
      }
    }
  }

  const reply = startResult?.reply ?? commandReply ?? fallbackReply()
  if (startResult?.tags?.length) {
    try { await addChatTags(msg.chat.id, startResult.tags) }
    catch (err) { console.error('[telegram] addChatTags failed:', err) }
  }

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

function detectMedia(msg: TgMessage): { kind: ChatMediaKind; file: TgFile } | null {
  if (msg.voice)      return { kind: 'voice',      file: msg.voice }
  if (msg.audio)      return { kind: 'audio',      file: msg.audio }
  if (msg.video_note) return { kind: 'video_note', file: msg.video_note }
  if (msg.video)      return { kind: 'video',      file: msg.video }
  if (msg.document)   return { kind: 'document',   file: msg.document }
  if (msg.sticker)    return { kind: 'sticker',    file: msg.sticker }
  // Photos arrive as ascending-size variants. Largest gives us best-quality
  // for downstream display; the bucket cache controls bandwidth on read.
  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b))
    return { kind: 'photo', file: largest }
  }
  return null
}

function defaultFilename(kind: ChatMediaKind, _file: TgFile): string {
  switch (kind) {
    case 'voice':      return 'voice.ogg'
    case 'audio':      return 'audio.mp3'
    case 'photo':      return 'photo.jpg'
    case 'video':      return 'video.mp4'
    case 'video_note': return 'video_note.mp4'
    case 'sticker':    return 'sticker.webp'
    default:           return 'file.bin'
  }
}

function mediaPreview(kind: ChatMediaKind, filename: string | null, duration: number | null): string {
  switch (kind) {
    case 'voice': return duration != null
      ? `🎙️ Голосовое ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
      : '🎙️ Голосовое'
    case 'audio':       return '🎵 Аудио'
    case 'photo':       return '🖼️ Фото'
    case 'video':       return '🎬 Видео'
    case 'video_note':  return '🎬 Кружок'
    case 'sticker':     return '🤩 Стикер'
    case 'document':    return `📎 ${filename ?? 'файл'}`
    default:            return ''
  }
}
