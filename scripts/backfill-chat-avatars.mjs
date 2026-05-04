// One-shot backfill: walk every row in bot_chats, fetch the user's
// Telegram profile photo via getUserProfilePhotos and cache the
// smallest size into chat-avatars/<chat_id>.jpg. Runs the same logic
// as lib/chat-avatars.ts but ignores the 24h TTL so first-time seeding
// finishes in one pass.
//
// Run: node scripts/backfill-chat-avatars.mjs

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN missing')

const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-avatars`

const { data: rows, error } = await sb
  .from('bot_chats').select('chat_id').order('last_message_at', { ascending: false })
if (error) throw new Error(error.message)
console.log(`bot_chats rows: ${rows.length}`)

let withAvatar = 0, withoutAvatar = 0, failed = 0
for (const { chat_id } of rows) {
  try {
    const photosResp = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getUserProfilePhotos?user_id=${chat_id}&limit=1`,
    )
    const photosJson = await photosResp.json()
    const sizes = photosJson?.ok ? photosJson.result?.photos?.[0] : null

    if (!sizes || sizes.length === 0) {
      await sb.from('bot_chats').update({
        avatar_url: null, avatar_checked_at: new Date().toISOString(),
      }).eq('chat_id', chat_id)
      withoutAvatar++
      continue
    }

    const smallest = sizes.reduce((a, b) => (a.width <= b.width ? a : b))
    const fileResp = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${smallest.file_id}`)
    const fileJson = await fileResp.json()
    const filePath = fileJson?.ok ? fileJson.result?.file_path : null
    if (!filePath) { failed++; continue }

    const dl = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`)
    if (!dl.ok) { failed++; continue }
    const buf = Buffer.from(await dl.arrayBuffer())

    const key = `${chat_id}.jpg`
    const { error: upErr } = await sb.storage.from('chat-avatars').upload(key, buf, {
      contentType: 'image/jpeg', upsert: true, cacheControl: '86400',
    })
    if (upErr) { console.warn(' upload', chat_id, upErr.message); failed++; continue }

    const url = `${PUBLIC_BASE}/${key}?v=${Date.now()}`
    await sb.from('bot_chats').update({
      avatar_url: url, avatar_checked_at: new Date().toISOString(),
    }).eq('chat_id', chat_id)
    withAvatar++
    console.log(`  ${chat_id} → ${url}`)
  } catch (e) {
    console.warn(' err', chat_id, e.message)
    failed++
  }
}

console.log(`done: avatars uploaded ${withAvatar}, no-photo ${withoutAvatar}, failed ${failed}`)
