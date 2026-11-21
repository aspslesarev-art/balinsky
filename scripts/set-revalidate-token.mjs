// Кладёт REVALIDATE_TOKEN из .env.local в Supabase Vault (секрет
// balinsky_revalidate_token) — им база подписывает вызовы /api/revalidate-rows
// (миграция 146). Запускать один раз и после смены токена в Vercel.
//   node scripts/set-revalidate-token.mjs
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '')
}
const token = (process.env.REVALIDATE_TOKEN ?? '').trim()
if (!token || token.startsWith('[')) throw new Error('REVALIDATE_TOKEN пуст или затёрт в .env.local')
const KEY = process.env.SUPABASE_SERVICE_KEY
const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/content_change_set_token`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_token: token }),
})
if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
console.log('токен записан в Vault')
