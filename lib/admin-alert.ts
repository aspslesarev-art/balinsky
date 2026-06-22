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
