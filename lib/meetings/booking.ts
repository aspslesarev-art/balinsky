// Создание и отмена записи: БД + событие в Google Календаре + сообщение в Telegram.

import { checkSlot } from './availability'
import { createBookingEvent, deleteBookingEvent } from './google'
import { minToHhmm } from './slots'
import { attachGoogleEvent, baliIso, baliParts, claimDayByBooking, insertBooking, markCancelled, releaseDayIfEmpty } from './store'
import type { MeetingBooking, MeetingFormat, MeetingSettings } from './types'

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TG_ADMIN_CHAT = process.env.ADMIN_TELEGRAM_CHAT_ID

export type BookingRequest = {
  date: string
  start: number
  format: MeetingFormat
  district: string | null
  name: string
  email: string
  contact: string | null
  comment: string | null
  lang: 'ru' | 'en'
}

export type BookingResult =
  | { ok: true; booking: MeetingBooking; districtName: string | null }
  | { ok: false; error: 'slot_taken' | 'calendar_failed' }

function districtName(settings: MeetingSettings, key: string | null, lang: 'ru' | 'en' = 'ru'): string | null {
  const d = settings.districts.find(x => x.key === key)
  return d ? d[lang] : null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const RU_DATE = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Asia/Makassar' })

export function formatWhen(b: Pick<MeetingBooking, 'start_at' | 'end_at'>): string {
  const s = baliParts(Date.parse(b.start_at))
  const e = baliParts(Date.parse(b.end_at))
  return `${RU_DATE.format(new Date(b.start_at))}, ${minToHhmm(s.min)}–${minToHhmm(e.min)}`
}

async function tg(method: string, payload: Record<string, unknown>): Promise<void> {
  if (!TG_TOKEN || !TG_ADMIN_CHAT) {
    console.warn('[meetings] telegram env missing')
    return
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_ADMIN_CHAT, ...payload }),
    })
    if (!r.ok) console.error('[meetings] telegram', method, r.status, (await r.text()).slice(0, 300))
  } catch (e) {
    console.error('[meetings] telegram failed:', e)
  }
}

export async function createBooking(req: BookingRequest): Promise<BookingResult> {
  const { ok, settings } = await checkSlot({ date: req.date, start: req.start, format: req.format, district: req.district })
  if (!ok) return { ok: false, error: 'slot_taken' }

  const dur = req.format === 'online' ? settings.onlineMin : settings.offlineMin
  const district = req.format === 'offline' ? req.district : null
  const booking = await insertBooking({
    start_at: baliIso(req.date, req.start),
    end_at: baliIso(req.date, req.start + dur),
    format: req.format,
    district,
    guest_name: req.name,
    guest_email: req.email,
    guest_contact: req.contact,
    comment: req.comment,
    lang: req.lang,
  })
  if (!booking) return { ok: false, error: 'slot_taken' }

  const place = districtName(settings, district)
  const travel = settings.districts.find(d => d.key === district)?.travelMin ?? 0
  const description = [
    req.format === 'online' ? 'Онлайн-встреча (Google Meet)' : `Живая встреча · ${place}, Бали`,
    `Гость: ${req.name} <${req.email}>`,
    req.contact ? `Контакт: ${req.contact}` : null,
    req.comment ? `Комментарий: ${req.comment}` : null,
    req.format === 'offline' ? `Дорога до района ~${travel} мин.` : null,
    'Записано через balinsky.info',
  ].filter(Boolean).join('\n')

  let event: { id: string; meetUrl: string | null }
  try {
    event = await createBookingEvent({
      bookingId: booking.id,
      summary: req.format === 'online' ? `Balinsky × ${req.name} · онлайн` : `Balinsky × ${req.name} · ${place}`,
      description,
      startIso: booking.start_at,
      endIso: booking.end_at,
      guestEmail: req.email,
      location: req.format === 'offline' ? `${districtName(settings, district, 'en')}, Bali` : null,
      withMeet: req.format === 'online',
    })
  } catch (e) {
    // Без события в календаре запись бессмысленна: снимаем её, слот освобождается.
    console.error('[meetings] google event failed:', e)
    await markCancelled(booking.id).catch(err => console.error('[meetings] rollback failed:', err))
    return { ok: false, error: 'calendar_failed' }
  }

  const saved = { ...booking, google_event_id: event.id, meet_url: event.meetUrl }
  await attachGoogleEvent(booking.id, event.id, event.meetUrl)
  if (req.format === 'offline' && district) await claimDayByBooking(req.date, district)

  await tg('sendMessage', {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    text:
      `<b>📅 Новая встреча</b>\n\n` +
      `${escapeHtml(formatWhen(saved))}\n` +
      `${req.format === 'online' ? '💻 Онлайн' : `📍 ${escapeHtml(place ?? '')} · выезд за ~${travel} мин`}\n\n` +
      `👤 ${escapeHtml(req.name)}\n✉️ ${escapeHtml(req.email)}` +
      (req.contact ? `\n📞 ${escapeHtml(req.contact)}` : '') +
      (req.comment ? `\n💬 ${escapeHtml(req.comment)}` : '') +
      (event.meetUrl ? `\n\n${event.meetUrl}` : ''),
    reply_markup: { inline_keyboard: [[{ text: '❌ Отменить встречу', callback_data: `mtg:cancel:${booking.id}` }]] },
  })

  return { ok: true, booking: saved, districtName: districtName(settings, district, req.lang) }
}

/** Отмена: статус, событие в календаре (гостю уходит письмо), освобождение района дня. */
export async function cancelBooking(id: string): Promise<MeetingBooking | null> {
  const b = await markCancelled(id)
  if (!b) return null
  if (b.google_event_id) await deleteBookingEvent(b.google_event_id)
  if (b.format === 'offline') await releaseDayIfEmpty(baliParts(Date.parse(b.start_at)).date)
  return b
}

type Callback = {
  id: string
  message?: { message_id: number; chat: { id: number }; text?: string }
  data?: string
}

async function answer(token: string, id: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text }),
  }).catch(e => console.error('[meetings] ack failed:', e))
}

/** Кнопка «❌ Отменить встречу» под уведомлением. Действует только из админского чата. */
export async function handleMeetingCallback(token: string, q: Callback): Promise<void> {
  const m = (q.data ?? '').match(/^mtg:cancel:([0-9a-f-]{36})$/i)
  if (!m) return answer(token, q.id, 'Неизвестная команда')
  if (!TG_ADMIN_CHAT || String(q.message?.chat?.id) !== String(TG_ADMIN_CHAT)) return answer(token, q.id, 'Нет доступа')

  let cancelled: MeetingBooking | null
  try {
    cancelled = await cancelBooking(m[1])
  } catch (e) {
    console.error('[meetings] cancel via telegram failed:', e)
    return answer(token, q.id, 'Ошибка отмены — см. логи')
  }
  if (!cancelled) return answer(token, q.id, 'Встреча уже отменена')

  if (q.message) {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: q.message.chat.id,
        message_id: q.message.message_id,
        text: `${q.message.text ?? ''}\n\n❌ ОТМЕНЕНО — гостю ушло письмо из Google Календаря.`,
        disable_web_page_preview: true,
      }),
    }).catch(e => console.error('[meetings] edit failed:', e))
  }
  return answer(token, q.id, 'Отменено')
}
