// One-shot: install the "Подписки" menu button on @BalinskyBot. Telegram
// chats render this as a persistent button next to the message input that
// opens our Mini App. Re-runnable — setChatMenuButton just overwrites.
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN missing'); process.exit(1) }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const WEB_APP_URL = `${SITE_URL}/bot/subscribe`

const body = {
  menu_button: {
    type: 'web_app',
    text: 'Подписки',
    web_app: { url: WEB_APP_URL },
  },
}

const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setChatMenuButton`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const j = await r.json()
console.log('setChatMenuButton →', JSON.stringify(j))
if (!j.ok) process.exit(1)
console.log(`menu button now points at ${WEB_APP_URL}`)
