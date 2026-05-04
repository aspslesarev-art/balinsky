import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Callback = {
  id: string
  from?: { id: number }
  message?: { message_id: number; chat: { id: number }; text?: string }
  data?: string
}

const ADMIN_CHAT = process.env.ADMIN_TELEGRAM_CHAT_ID

// Telegram delivers ✅/❌ taps as callback_query. We:
//   1) flip the row's status,
//   2) edit the original message so the buttons disappear and the text
//      shows who/when acted (no zombie buttons),
//   3) ack the callback (Telegram greys out the button).
// Only the configured admin chat can act — otherwise pranksters with the
// bot link could cancel pending reservations.
export async function handleReservationCallback(token: string, q: Callback) {
  const data = q.data ?? ''
  const m = data.match(/^rsv:(confirm|cancel):([0-9a-f-]+)$/i)
  if (!m) {
    await answer(token, q.id, 'Неизвестная команда')
    return
  }
  const action = m[1] as 'confirm' | 'cancel'
  const id = m[2]

  if (ADMIN_CHAT && q.message?.chat?.id && String(q.message.chat.id) !== String(ADMIN_CHAT)) {
    await answer(token, q.id, 'Нет доступа')
    return
  }

  const { data: row, error: readErr } = await sb
    .from('reservations')
    .select('id, status, listing_title, listing_slug, contact_name')
    .eq('id', id)
    .maybeSingle()
  if (readErr || !row) {
    await answer(token, q.id, 'Бронь не найдена')
    return
  }
  if (row.status !== 'pending') {
    await answer(token, q.id, `Уже ${row.status}`)
    return
  }

  const nextStatus = action === 'confirm' ? 'confirmed' : 'cancelled'
  const { error: updErr } = await sb
    .from('reservations')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending') // guard against double-tap race
  if (updErr) {
    console.error('[telegram-reservation] update failed:', updErr.message)
    await answer(token, q.id, 'Ошибка БД')
    return
  }

  if (q.message?.chat?.id && q.message?.message_id) {
    // q.message.text comes back as plain text (formatting stripped). Send
    // the edit *without* parse_mode so we don't have to escape contact
    // emails or random punctuation.
    const verdict = action === 'confirm'
      ? '✅ ПОДТВЕРЖДЕНО — объект на hold 14 дней.'
      : '❌ ОТМЕНЕНО.'
    const lines = (q.message.text ?? '').split('\n')
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
    if (lines.length && /Подтверди бронь/.test(lines[lines.length - 1])) lines.pop()
    const newText = `${lines.join('\n')}\n\n${verdict}`
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: q.message.chat.id,
        message_id: q.message.message_id,
        text: newText,
        disable_web_page_preview: true,
      }),
    }).catch(e => console.error('[telegram-reservation] edit failed:', e))
  }

  await answer(token, q.id, action === 'confirm' ? 'Подтверждено' : 'Отменено')
}

async function answer(token: string, id: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id, text }),
    })
  } catch (e) {
    console.error('[telegram-reservation] ack failed:', e)
  }
}
