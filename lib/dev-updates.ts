import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { isOwnerChat } from '@/lib/balina-owners'

// Обновления застройщиков → статья на сайт (migrations/093_dev_updates.sql).
// Черновики пишет и публикует сервер (smarthouse, ~/apps/dev-updates), здесь
// только то, что приходит в webhook бота: нажатие кнопки под карточкой и
// ответ владельца на карточку с правкой («убери цену»). Тяжёлое — перевод на
// 10 языков, загрузка фото — делает сервер, когда увидит новый статус.

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const KIND_LABEL: Record<string, string> = {
  news: 'Новость', promo: 'Акция', event: 'Мероприятие', construction: 'Ход стройки',
}

type Callback = {
  id: string
  from?: { id: number }
  message?: { message_id: number; chat: { id: number } }
  data?: string
}

export async function handleDevUpdateCallback(token: string, q: Callback): Promise<void> {
  const m = (q.data ?? '').match(/^dvu:(\d+):(news|promo|event|construction|skip)$/)
  if (!m) return answer(token, q.id, '')
  if (!q.from || !isOwnerChat(q.from.id)) return answer(token, q.id, 'Нет доступа')

  const id = Number(m[1])
  const action = m[2]
  const patch = action === 'skip'
    ? { status: 'skipped', decided_at: new Date().toISOString() }
    : { status: 'approved', kind: action, decided_at: new Date().toISOString() }
  // Только из pending: повторное нажатие не перепубликует уже вышедшее.
  const { data, error } = await sb.from('dev_updates').update(patch)
    .eq('id', id).eq('status', 'pending').select('id').maybeSingle()
  if (error) {
    console.error('[dev-updates] callback:', error.message)
    return answer(token, q.id, 'Ошибка, попробуй ещё раз')
  }
  if (!data) return answer(token, q.id, 'Уже решено')

  const label = action === 'skip' ? '✖️ Пропущено' : `⏳ Публикую: ${KIND_LABEL[action]}…`
  if (q.message) {
    await tg(token, 'editMessageReplyMarkup', {
      chat_id: q.message.chat.id,
      message_id: q.message.message_id,
      reply_markup: { inline_keyboard: [[{ text: label, callback_data: 'dvu:noop' }]] },
    })
  }
  await answer(token, q.id, action === 'skip' ? 'Пропустил' : 'Публикую, пара минут')
}

// Ответ владельца (reply) на карточку черновика — правка текста. Сервер
// перепишет черновик с учётом правки и обновит карточку. Голос тоже годится:
// сервер распознает его сам по media_url.
export async function handleDevUpdateReply(
  token: string,
  chatId: number,
  replyToMessageId: number,
  text: string | null,
  voiceUrl: string | null,
): Promise<boolean> {
  if (!isOwnerChat(chatId)) return false
  const { data } = await sb.from('dev_updates').select('id, draft')
    .eq('tg_message_id', replyToMessageId).eq('status', 'pending').maybeSingle()
  if (!data) return false
  const draft = { ...(data.draft as Record<string, unknown>), revise: { text, voiceUrl, at: new Date().toISOString() } }
  const { error } = await sb.from('dev_updates').update({ draft }).eq('id', data.id)
  if (error) {
    console.error('[dev-updates] reply:', error.message)
    return false
  }
  await tg(token, 'sendMessage', {
    chat_id: chatId,
    text: 'Понял, переделываю. Пришлю новую версию через пару минут.',
    reply_to_message_id: replyToMessageId,
  })
  return true
}

async function answer(token: string, id: string, text: string): Promise<void> {
  await tg(token, 'answerCallbackQuery', { callback_query_id: id, text })
}

async function tg(token: string, method: string, body: Record<string, unknown>): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(err => console.error(`[dev-updates] ${method}:`, err))
}
