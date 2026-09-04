import 'server-only'
import { moderateListing, markAuthorTrusted } from './store'
import { notifyAuthorDecision } from './notify'

// Обработка ✅/❌ из Telegram. Устроено так же, как подтверждение брони:
// правим статус, убираем кнопки из исходного сообщения (чтобы не осталось
// «живых» кнопок к уже решённому объекту) и подтверждаем нажатие.

const ADMIN_CHAT = (process.env.ADMIN_TELEGRAM_CHAT_ID ?? '').trim()

type Callback = {
  id: string
  from?: { id: number }
  message?: { message_id: number; chat: { id: number }; text?: string }
  data?: string
}

export async function handleListingCallback(token: string, q: Callback): Promise<void> {
  const m = (q.data ?? '').match(/^agl:(ok|no):([0-9a-f-]+)$/i)
  if (!m) return answer(token, q.id, 'Неизвестная команда')

  // Кнопки уходят в админский чат, но callback может прислать кто угодно,
  // подобрав data — решение принимает только админ.
  if (ADMIN_CHAT && q.message?.chat?.id && String(q.message.chat.id) !== String(ADMIN_CHAT)) {
    return answer(token, q.id, 'Нет доступа')
  }

  const approved = m[1].toLowerCase() === 'ok'
  const listing = await moderateListing(m[2], approved ? 'approved' : 'rejected')
  if (!listing) return answer(token, q.id, 'Объект не найден')

  // Первое одобрение поднимает автору доверие — дальше он публикуется сразу.
  if (approved) await markAuthorTrusted(listing.authorId)
  await notifyAuthorDecision(listing, approved)

  if (q.message) {
    const suffix = approved ? '\n\n✅ Одобрено' : '\n\n❌ Отклонено'
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: q.message.chat.id,
        message_id: q.message.message_id,
        text: (q.message.text ?? listing.title) + suffix,
        disable_web_page_preview: true,
      }),
    }).catch(() => {})
  }
  await answer(token, q.id, approved ? 'Одобрено' : 'Отклонено')
}

async function answer(token: string, id: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text }),
  }).catch(() => {})
}
