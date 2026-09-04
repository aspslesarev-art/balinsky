// Уведомление ресепшн в Telegram (ТЗ 4.4): заявка и сообщение гостя приходят
// в чат отеля с меткой юнита и языка, чтобы не переспрашивать «вы из какого
// номера?». Fire-and-forget: упавший Telegram не должен ронять ответ гостю.

const TG_TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()

export async function notifyReception(chatId: string | null, text: string): Promise<void> {
  if (!TG_TOKEN || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    })
  } catch (e) {
    console.error('[hotel-notify] send failed:', (e as Error).message)
  }
}

/** `[Villa 05 · RU]` — та самая метка из ТЗ, одинаковая в чате и в мессенджерах. */
export function unitTag(roomLabel: string, lang: string): string {
  return `[${roomLabel} · ${lang.toUpperCase()}]`
}
