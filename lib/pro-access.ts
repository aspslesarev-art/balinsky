import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { sendMail } from './mailer'
import { emailUserId, normalizeEmail, proCookie, sessionCookies, type ProStatus } from './site-auth'

// Доступ Pro по решению владельца (макет «Админка: кому дать Pro», A —
// 23.10.2026). Вошёл новый человек — бот пишет владельцу с кнопками
// «Дать Pro / Без Pro»; то же решение можно принять в /admin/pro. Пока
// решения нет, аналитика человеку не показывается (флаг bx_pro).

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim()
const ADMIN_CHAT = (process.env.ADMIN_TELEGRAM_CHAT_ID ?? '').trim()
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export type ProUser = {
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  is_agent: boolean
  pro: ProStatus
  pro_changed_at: string | null
  created_at: string
  last_login_at: string | null
}

const COLS = 'telegram_id, username, first_name, last_name, email, is_agent, pro, pro_changed_at, created_at, last_login_at'

export function displayName(u: Pick<ProUser, 'first_name' | 'last_name' | 'username' | 'email'>): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : u.email ?? 'Без имени')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function tg(method: string, body: unknown): Promise<void> {
  if (!TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error(`[pro-access] telegram ${method} failed:`, (e as Error).message)
  }
}

/**
 * Куки удачного входа: сессия + флаг Pro по текущему статусу. Заодно —
 * сообщение владельцу о новом человеке (один раз на аккаунт).
 */
export async function loginCookies(telegramId: number) {
  const { data } = await sb.from('site_users').select(COLS).eq('telegram_id', telegramId).maybeSingle()
  const u = data as ProUser | null
  if (u?.pro === 'pending') await notifyOwnerOnce(u)
  return [...sessionCookies(telegramId), proCookie(u?.pro === 'granted')]
}

async function notifyOwnerOnce(u: ProUser): Promise<void> {
  if (!ADMIN_CHAT) return
  // Отметка ставится только если её ещё нет — два входа подряд не дадут двух сообщений.
  const { data } = await sb.from('site_users').update({ pro_notified_at: new Date().toISOString() })
    .eq('telegram_id', u.telegram_id).is('pro_notified_at', null).select('telegram_id')
  if (!data?.length) return
  const contact = u.telegram_id > 0 ? (u.username ? `@${u.username}` : `Telegram id ${u.telegram_id}`) : (u.email ?? 'вход по почте')
  await tg('sendMessage', {
    chat_id: ADMIN_CHAT,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    text: `👤 <b>Новый вход на сайт</b>\n${esc(displayName(u))} · ${esc(contact)}\n\nВсе люди: ${SITE_URL}/admin/pro`,
    reply_markup: { inline_keyboard: [[
      { text: '✅ Дать Pro', callback_data: `pro:ok:${u.telegram_id}` },
      { text: 'Без Pro', callback_data: `pro:no:${u.telegram_id}` },
    ]] },
  })
}

/** Решение владельца. Открытие доступа — сообщение человеку в Telegram или на почту. */
export async function setPro(telegramId: number, status: ProStatus): Promise<ProUser | null> {
  const { data: before } = await sb.from('site_users').select('pro').eq('telegram_id', telegramId).maybeSingle()
  const { data, error } = await sb.from('site_users')
    .update({ pro: status, pro_changed_at: new Date().toISOString(), pro_notified_at: new Date().toISOString() })
    .eq('telegram_id', telegramId).select(COLS).maybeSingle()
  if (error) throw new Error(error.message)
  const u = data as ProUser | null
  if (u && status === 'granted' && (before as { pro: ProStatus } | null)?.pro !== 'granted') await notifyGranted(u)
  return u
}

const GRANTED_TEXT = `Доступ Pro на balinsky.info открыт: доходность, спрос на Booking и Airbnb, калькулятор аренды.\n\n${SITE_URL}/kabinet`

async function notifyGranted(u: ProUser): Promise<void> {
  if (u.telegram_id > 0) {
    await tg('sendMessage', { chat_id: u.telegram_id, text: GRANTED_TEXT, disable_web_page_preview: true })
  } else if (u.email) {
    await sendMail({ to: u.email, subject: 'Доступ Pro на Balinsky открыт', text: GRANTED_TEXT, html: `<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">${esc(GRANTED_TEXT).replace(/\n/g, '<br>')}</p>` })
      .catch(e => console.error('[pro-access] mail failed:', (e as Error).message))
  }
}

/**
 * «Дать Pro» по почте или @telegram из админки. Почта ещё без аккаунта —
 * заводим его заранее: человек войдёт и сразу увидит аналитику.
 */
export async function grantByContact(raw: string): Promise<{ ok: true; user: ProUser } | { ok: false; error: string }> {
  const q = raw.trim()
  if (q.includes('@') && !q.startsWith('@')) {
    const email = normalizeEmail(q)
    if (!email) return { ok: false, error: 'Почта написана с ошибкой' }
    const id = emailUserId(email)
    const { error } = await sb.from('site_users').upsert({ telegram_id: id, email }, { onConflict: 'telegram_id', ignoreDuplicates: true })
    if (error) return { ok: false, error: 'Не получилось сохранить' }
    await sb.from('site_users').update({ email }).eq('telegram_id', id).is('email', null)
    const user = await setPro(id, 'granted')
    return user ? { ok: true, user } : { ok: false, error: 'Не получилось сохранить' }
  }
  const username = q.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')
  if (!/^[A-Za-z0-9_]{4,32}$/.test(username)) return { ok: false, error: 'Напишите почту или @имя в Telegram' }
  const { data } = await sb.from('site_users').select('telegram_id').ilike('username', username).maybeSingle()
  // Telegram-id по имени узнать нельзя, пока человек сам не написал боту.
  if (!data) return { ok: false, error: `@${username} ещё не входил на сайт. Попросите войти через бота - и дайте Pro здесь` }
  const user = await setPro(Number((data as { telegram_id: number }).telegram_id), 'granted')
  return user ? { ok: true, user } : { ok: false, error: 'Не получилось сохранить' }
}

export async function listProUsers(): Promise<ProUser[]> {
  const { data, error } = await sb.from('site_users').select(COLS).order('created_at', { ascending: false }).limit(2000)
  if (error) throw new Error(error.message)
  return (data ?? []) as ProUser[]
}

type Callback = { id: string; message?: { message_id: number; chat: { id: number }; text?: string }; data?: string }

/** Кнопки «Дать Pro / Без Pro» из сообщения бота. */
export async function handleProCallback(_token: string, q: Callback): Promise<void> {
  const answer = (text: string) => tg('answerCallbackQuery', { callback_query_id: q.id, text })
  const m = (q.data ?? '').match(/^pro:(ok|no):(-?\d+)$/)
  if (!m) return answer('Неизвестная команда')
  // Кнопки уходят в админский чат, но data может подобрать кто угодно.
  if (!ADMIN_CHAT || String(q.message?.chat?.id) !== ADMIN_CHAT) return answer('Нет доступа')
  const granted = m[1] === 'ok'
  const u = await setPro(Number(m[2]), granted ? 'granted' : 'denied').catch(() => null)
  if (!u) return answer('Человек не найден')
  if (q.message) {
    await tg('editMessageText', {
      chat_id: q.message.chat.id,
      message_id: q.message.message_id,
      text: `${q.message.text ?? displayName(u)}\n\n${granted ? '✅ Pro открыт' : '— без Pro'}`,
      disable_web_page_preview: true,
    })
  }
  await answer(granted ? 'Pro открыт' : 'Без Pro')
}
