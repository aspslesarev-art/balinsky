import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
import { cdnBucketBase } from './photo-cdn'
const PUBLIC_BASE = cdnBucketBase('chat-media')

export type ChatMediaKind = 'voice' | 'audio' | 'photo' | 'document' | 'video' | 'sticker' | 'video_note'

// Stores `buf` under chat-media/<kind>/<chatId>/<filename> and returns the
// public URL. We segment by kind + chat so the bucket stays browsable in
// the Storage UI and trivial to GC by chat.
export async function uploadChatMedia(opts: {
  kind: ChatMediaKind
  chatId: number
  filename: string
  buf: Buffer
  contentType: string
}): Promise<string | null> {
  const safeName = opts.filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'file'
  const key = `${opts.kind}/${opts.chatId}/${Date.now()}-${safeName}`
  const { error } = await sb.storage.from('chat-media').upload(key, opts.buf, {
    contentType: opts.contentType, upsert: false, cacheControl: '604800',
  })
  if (error) {
    console.error('[chat-media] upload', key, error.message)
    return null
  }
  return `${PUBLIC_BASE}/${key}`
}

// Pulls a Telegram-side file (via getFile + /file/) and returns the bytes.
// Returns null on any failure — caller handles fallback.
export async function downloadTelegramFile(token: string, fileId: string): Promise<{ buf: Buffer; mime: string } | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
    const j = await r.json().catch(() => null) as { ok?: boolean; result?: { file_path?: string } } | null
    const path = j?.ok ? j.result?.file_path : null
    if (!path) return null
    const dl = await fetch(`https://api.telegram.org/file/bot${token}/${path}`)
    if (!dl.ok) return null
    const buf = Buffer.from(await dl.arrayBuffer())
    return { buf, mime: dl.headers.get('content-type') ?? 'application/octet-stream' }
  } catch (e) {
    console.error('[chat-media] download', fileId, e)
    return null
  }
}
