// Fire-and-forget Telegram alert to the admin chat. Used for operational
// warnings (e.g. a parser source whose format changed). Never throws —
// alerting must not break the caller.
const TG_TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
const ADMIN_CHAT = (process.env.ADMIN_TELEGRAM_CHAT_ID ?? '').trim()

export async function sendAdminAlert(text: string): Promise<void> {
  if (!TG_TOKEN || !ADMIN_CHAT) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT, text, disable_web_page_preview: true }),
    })
  } catch (e) {
    console.error('[admin-alert] send failed:', (e as Error).message)
  }
}

// Same alert, but returns the Telegram message_id so the caller can keep
// updating that one message (a live "card") instead of posting a new one.
export async function sendAdminAlertWithId(text: string): Promise<number | null> {
  if (!TG_TOKEN || !ADMIN_CHAT) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT, text, disable_web_page_preview: true }),
    })
    const json = await res.json() as { ok?: boolean; result?: { message_id?: number } }
    return json.ok ? json.result?.message_id ?? null : null
  } catch (e) {
    console.error('[admin-alert] send failed:', (e as Error).message)
    return null
  }
}

// Rewrites a message sent by sendAdminAlertWithId. Telegram answers 400
// "message is not modified" when the text is unchanged — that is expected
// and silently ignored.
export async function editAdminAlert(messageId: number, text: string): Promise<void> {
  if (!TG_TOKEN || !ADMIN_CHAT) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT, message_id: messageId, text, disable_web_page_preview: true }),
    })
  } catch (e) {
    console.error('[admin-alert] edit failed:', (e as Error).message)
  }
}
