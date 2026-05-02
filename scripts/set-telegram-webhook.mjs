// One-shot: register the Telegram bot's webhook to point at /api/telegram.
// Usage:  node --env-file=.env.local scripts/set-telegram-webhook.mjs
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) { console.error('TELEGRAM_BOT_TOKEN missing in .env.local'); process.exit(1) }
const secret = process.env.TELEGRAM_WEBHOOK_SECRET || ''
const baseUrl = process.env.TELEGRAM_WEBHOOK_URL || 'https://balinsky.info'
const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram`

const body = {
  url: webhookUrl,
  allowed_updates: ['message', 'edited_message'],
  drop_pending_updates: false,
}
if (secret) body.secret_token = secret

const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const j = await r.json()
console.log('setWebhook:', j)

// Also verify
const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then(r => r.json())
console.log('webhookInfo:', info)
