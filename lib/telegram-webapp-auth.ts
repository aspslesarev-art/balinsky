// Validate Telegram Web App initData per the official spec:
//   https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// The Mini App sends `window.Telegram.WebApp.initData` (a URL-encoded query
// string) to our API. We re-compute the HMAC with the bot token and confirm
// it matches the `hash` field. Without this any client could POST a fake
// `user.id` and subscribe (or unsubscribe) on someone else's behalf.

import { createHmac } from 'node:crypto'

export type TelegramWebAppUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

const FIVE_MIN_MS = 5 * 60 * 1000
// Telegram says initData should be considered stale after a "reasonable"
// window; we go with 24h so an agent who opens the menu, walks away, and
// comes back still works. Replay protection is fine at this scale.
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export function verifyInitData(initData: string, botToken: string): TelegramWebAppUser | null {
  if (!initData || !botToken) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  if (expected !== hash) return null

  const authDate = Number(params.get('auth_date'))
  if (!Number.isFinite(authDate)) return null
  const age = Date.now() - authDate * 1000
  if (age < -FIVE_MIN_MS || age > MAX_AGE_MS) return null

  const userRaw = params.get('user')
  if (!userRaw) return null
  try {
    const user = JSON.parse(userRaw) as TelegramWebAppUser
    if (typeof user?.id !== 'number') return null
    return user
  } catch {
    return null
  }
}
