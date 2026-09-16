import { createClient } from '@supabase/supabase-js'

// Telegram Business переписка владельца (бот-наблюдатель из репо
// tg-business-observer пишет её в tg_messages / tg_meetings). Здесь — чтение
// для /admin/perepiska и отправка от имени владельца через тот же бот.
// Токен бота — TG_BUSINESS_BOT_TOKEN (НЕ TELEGRAM_BOT_TOKEN: тот у Балины).

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Приватный бакет: файл лежит тут только пока уходит в Telegram, потом удаляется.
export const OUTBOX_BUCKET = 'tg-business-outbox'

export type TgChat = {
  chat_id: number
  contact: string | null
  last_ts: string
  last_text: string | null
  last_direction: 'in' | 'out'
  last_media_type: string | null
  message_count: number
  meeting_count: number
}

export type TgMessage = {
  id: number
  direction: 'in' | 'out'
  text: string | null
  voice_transcript: string | null
  is_voice: boolean
  media_type: string | null
  file_name: string | null
  has_file: boolean
  sent_by: string | null
  ts: string
}

export type TgMeeting = {
  id: number
  status: 'agreed' | 'scheduled' | 'cancelled'
  topic: string | null
  starts_at: string | null
  place: string | null
}

export async function listTgChats(): Promise<TgChat[]> {
  const { data, error } = await sb.rpc('tg_chat_list')
  if (error) throw new Error(error.message)
  return ((data ?? []) as TgChat[]).sort((a, b) => b.last_ts.localeCompare(a.last_ts))
}

export async function listTgMessages(chatId: number, limit = 300): Promise<TgMessage[]> {
  const { data, error } = await sb
    .from('tg_messages')
    .select('id,direction,text,voice_transcript,is_voice,media_type,file_name,file_id,sent_by,ts')
    .eq('chat_id', chatId)
    .order('ts', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  // file_id наружу не отдаём — файлы качаются через /file?id=<row id>.
  return (data ?? []).reverse().map(({ file_id, ...m }) => ({ ...m, has_file: !!file_id })) as TgMessage[]
}

export async function listTgMeetings(chatId: number): Promise<TgMeeting[]> {
  const { data, error } = await sb
    .from('tg_meetings')
    .select('id,status,topic,starts_at,place')
    .eq('chat_id', chatId)
    .order('starts_at', { ascending: false, nullsFirst: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as TgMeeting[]
}

export async function getTgFile(messageId: number): Promise<{ file_id: string; file_name: string | null; media_type: string | null } | null> {
  const { data } = await sb
    .from('tg_messages')
    .select('file_id,file_name,media_type')
    .eq('id', messageId)
    .maybeSingle()
  return data?.file_id ? data : null
}

export async function createOutboxUpload(chatId: number, filename: string) {
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80) || 'file'
  const path = `${chatId}/${Date.now()}-${safe}`
  const { data, error } = await sb.storage.from(OUTBOX_BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw new Error(error?.message ?? 'signed_upload_failed')
  return { path, signedUrl: data.signedUrl }
}

async function takeOutboxFile(path: string): Promise<Blob | null> {
  const { data, error } = await sb.storage.from(OUTBOX_BUCKET).download(path)
  await sb.storage.from(OUTBOX_BUCKET).remove([path])
  if (error || !data) return null
  return data
}

// Последнее подключение Telegram Business — от его имени и уходят сообщения.
async function latestConnection(chatId: number): Promise<{ connectionId: string; contact: string | null } | null> {
  const { data } = await sb
    .from('tg_messages')
    .select('business_connection_id,contact,chat_id')
    .not('business_connection_id', 'is', null)
    .order('ts', { ascending: false })
    .limit(1)
  const connectionId = data?.[0]?.business_connection_id
  if (!connectionId) return null
  const { data: c } = await sb
    .from('tg_messages')
    .select('contact')
    .eq('chat_id', chatId)
    .order('ts', { ascending: false })
    .limit(1)
  return { connectionId, contact: c?.[0]?.contact ?? null }
}

type SendResult = { ok: true } | { ok: false; error: string }

// Текст и/или файл из outbox. Файл с подписью уходит одним сообщением.
export async function sendTgBusiness(opts: {
  chatId: number
  text: string
  file: { path: string; name: string; type: string } | null
  sentBy: string | null
}): Promise<SendResult> {
  const token = process.env.TG_BUSINESS_BOT_TOKEN
  if (!token) return { ok: false, error: 'Не настроен токен бота (TG_BUSINESS_BOT_TOKEN)' }

  const conn = await latestConnection(opts.chatId)
  if (!conn) return { ok: false, error: 'Бот не подключён к Telegram Business' }

  let method = 'sendMessage'
  let body: FormData | string
  let mediaType: string | null = null

  if (opts.file) {
    const blob = await takeOutboxFile(opts.file.path)
    if (!blob) return { ok: false, error: 'Файл не загрузился, попробуйте ещё раз' }
    // Фото до 10 МБ — как фото (превью в чате), остальное — документом без пережатия.
    const asPhoto = /^image\/(jpeg|png|webp)$/.test(opts.file.type) && blob.size <= 10 * 1024 * 1024
    method = asPhoto ? 'sendPhoto' : 'sendDocument'
    mediaType = asPhoto ? 'photo' : 'document'
    const f = new FormData()
    f.set('business_connection_id', conn.connectionId)
    f.set('chat_id', String(opts.chatId))
    if (opts.text) f.set('caption', opts.text.slice(0, 1024))
    f.set(asPhoto ? 'photo' : 'document', new Blob([blob], { type: opts.file.type || 'application/octet-stream' }), opts.file.name)
    body = f
  } else {
    body = JSON.stringify({
      business_connection_id: conn.connectionId,
      chat_id: opts.chatId,
      text: opts.text,
      disable_web_page_preview: true,
    })
  }

  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    ...(typeof body === 'string' ? { headers: { 'content-type': 'application/json' } } : {}),
    body,
  })
  const j = await r.json().catch(() => null) as {
    ok?: boolean
    description?: string
    result?: { message_id?: number; date?: number; photo?: { file_id: string }[]; document?: { file_id: string; file_name?: string } }
  } | null
  if (!j?.ok) return { ok: false, error: telegramError(j?.description) }

  const res = j.result ?? {}
  const { error } = await sb.from('tg_messages').insert({
    business_connection_id: conn.connectionId,
    chat_id: opts.chatId,
    tg_message_id: res.message_id ?? null,
    contact: conn.contact,
    direction: 'out',
    text: opts.text || null,
    is_voice: false,
    media_type: mediaType,
    file_id: res.photo?.at(-1)?.file_id ?? res.document?.file_id ?? null,
    file_name: opts.file ? (res.document?.file_name ?? opts.file.name) : null,
    sent_by: opts.sentBy,
    ts: new Date((res.date ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  })
  // 23505 — наблюдатель уже записал это сообщение сам.
  if (error && error.code !== '23505') console.error('[tg-business] log sent', error.message)
  return { ok: true }
}

function telegramError(description: string | undefined): string {
  const d = description ?? ''
  if (/PEER_USAGE_MISSING|24 hours|not active/i.test(d)) {
    return 'Telegram не даёт написать: в этом чате не было сообщений за последние 24 часа. Напишите собеседнику с телефона.'
  }
  if (/too big|file is too/i.test(d)) return 'Файл слишком большой для Telegram (максимум 50 МБ)'
  if (/blocked|deactivated/i.test(d)) return 'Собеседник заблокировал аккаунт или удалён'
  return d ? `Telegram не принял сообщение: ${d}` : 'Telegram не принял сообщение'
}
