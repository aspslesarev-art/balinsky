// One-shot backfill — fix `chat_type` and `title` for existing rows in
// public.bot_chats. Old webhook code wrote everything as `private`/null
// regardless of whether the chat was a DM or a group, because the
// migration adding these columns only landed today.
//
// We call Telegram's getChat for every chat_id and copy `type`/`title`
// over the existing row. Idempotent — re-running only re-sets values.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
} catch { /* CI env */ }

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!TOKEN) { console.error('missing TELEGRAM_BOT_TOKEN'); process.exit(1) }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function getChat(chatId) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/getChat?chat_id=${chatId}`)
  const j = await r.json()
  if (!j.ok) return { error: j.description ?? 'unknown' }
  return { ok: true, type: j.result.type, title: j.result.title ?? null,
           first_name: j.result.first_name ?? null, last_name: j.result.last_name ?? null,
           username: j.result.username ?? null }
}

const { data: rows } = await sb.from('bot_chats').select('chat_id, chat_type, title').limit(500)
console.log('rows to inspect:', rows.length)

let ok = 0, skipped = 0, failed = 0
for (const row of rows) {
  const r = await getChat(row.chat_id)
  if (r.error) { failed++; console.error(`${row.chat_id}: ${r.error}`); continue }
  const patch = { chat_type: r.type }
  if (r.type !== 'private') patch.title = r.title
  // For private DMs, refresh the cached display name in case it changed.
  if (r.type === 'private') {
    if (r.first_name) patch.first_name = r.first_name
    if (r.last_name)  patch.last_name  = r.last_name
    if (r.username)   patch.username   = r.username
  }
  const { error } = await sb.from('bot_chats').update(patch).eq('chat_id', row.chat_id)
  if (error) { failed++; console.error(`${row.chat_id}: ${error.message}`); continue }
  ok++
  process.stdout.write(`\r  ok=${ok} skip=${skipped} fail=${failed} / ${rows.length}`)
}
console.log()
