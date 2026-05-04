import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-avatars`

const REFRESH_TTL_MS = 24 * 60 * 60 * 1000 // re-fetch at most once per day per chat

// Fetches the user's profile photo from Telegram, downloads the
// smallest size, uploads it to chat-avatars/<chat_id>.jpg and writes
// the public URL onto bot_chats.avatar_url. No-op if Telegram returns
// no photo or if we've checked recently. Best-effort — failures are
// swallowed so they never block a webhook reply.
export async function refreshChatAvatar(token: string, chatId: number): Promise<void> {
  try {
    const { data: row } = await sb
      .from('bot_chats')
      .select('avatar_checked_at')
      .eq('chat_id', chatId)
      .maybeSingle()
    const checked = row?.avatar_checked_at ? new Date(row.avatar_checked_at as string).getTime() : 0
    if (Date.now() - checked < REFRESH_TTL_MS) return

    const photosResp = await fetch(
      `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${chatId}&limit=1`,
      { cache: 'no-store' },
    )
    const photosJson = await photosResp.json().catch(() => null) as
      | { ok: boolean; result?: { photos?: Array<Array<{ file_id: string; width: number; height: number }>> } } | null
    const sizes = photosJson?.ok ? photosJson.result?.photos?.[0] : null

    if (!sizes || sizes.length === 0) {
      // No photo (or chat is a bot) — mark as checked so we don't retry
      // every message. Clear any stale URL just in case the user removed
      // their photo.
      await sb.from('bot_chats').update({
        avatar_url: null,
        avatar_checked_at: new Date().toISOString(),
      }).eq('chat_id', chatId)
      return
    }

    // Smallest size keeps the bucket tiny — list rows show 40px circles.
    const smallest = sizes.reduce((a, b) => (a.width <= b.width ? a : b))
    const fileResp = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${smallest.file_id}`)
    const fileJson = await fileResp.json().catch(() => null) as
      | { ok: boolean; result?: { file_path?: string } } | null
    const filePath = fileJson?.ok ? fileJson.result?.file_path : null
    if (!filePath) return

    const dl = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
    if (!dl.ok) return
    const buf = Buffer.from(await dl.arrayBuffer())

    const key = `${chatId}.jpg`
    const { error: upErr } = await sb.storage.from('chat-avatars').upload(key, buf, {
      contentType: 'image/jpeg', upsert: true, cacheControl: '86400',
    })
    if (upErr) {
      console.error('[chat-avatars] upload failed:', upErr.message)
      return
    }
    // Cache-bust query so the admin UI sees the new image right after refresh.
    const url = `${PUBLIC_BASE}/${key}?v=${Date.now()}`
    await sb.from('bot_chats').update({
      avatar_url: url,
      avatar_checked_at: new Date().toISOString(),
    }).eq('chat_id', chatId)
  } catch (e) {
    console.error('[chat-avatars] refresh failed:', e)
  }
}
