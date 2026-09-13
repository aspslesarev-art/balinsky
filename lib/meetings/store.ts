// Данные записи на встречи в Supabase: настройки, районы по дням, записи.
// Таблицы — migrations/080_meetings.sql.

import { createClient } from '@supabase/supabase-js'
import { DEFAULT_SETTINGS, type MeetingBooking, type MeetingSettings } from './types'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export const BALI_OFFSET_MS = 8 * 3600_000

/** Сегодняшняя дата по Бали, 'YYYY-MM-DD'. */
export function baliToday(now = Date.now()): string {
  return new Date(now + BALI_OFFSET_MS).toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** ISO-день недели: 1 = понедельник … 7 = воскресенье. */
export function isoWeekday(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

export function baliIso(date: string, minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${date}T${h}:${m}:00+08:00`
}

/** Момент времени → дата по Бали и минуты от полуночи. */
export function baliParts(ms: number): { date: string; min: number } {
  const iso = new Date(ms + BALI_OFFSET_MS).toISOString()
  return { date: iso.slice(0, 10), min: Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)) }
}

export function dayStartMs(date: string): number {
  return Date.parse(`${date}T00:00:00+08:00`)
}

function sanitizeSettings(raw: unknown): MeetingSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<MeetingSettings>
  const merged = { ...DEFAULT_SETTINGS, ...v }
  if (!Array.isArray(merged.districts) || merged.districts.length === 0) merged.districts = DEFAULT_SETTINGS.districts
  if (!Array.isArray(merged.workDays)) merged.workDays = DEFAULT_SETTINGS.workDays
  return merged
}

export async function loadSettings(): Promise<MeetingSettings> {
  const { data, error } = await sb.from('meeting_settings').select('data').eq('id', 1).maybeSingle()
  if (error) throw new Error(`meeting_settings read failed: ${error.message}`)
  return sanitizeSettings(data?.data)
}

export async function saveSettings(settings: MeetingSettings): Promise<void> {
  const { error } = await sb.from('meeting_settings').upsert({ id: 1, data: settings, updated_at: new Date().toISOString() })
  if (error) throw new Error(`meeting_settings save failed: ${error.message}`)
}

export type DayRow = { day: string; district: string; source: 'manual' | 'booking' }

export async function loadDays(from: string, to: string): Promise<DayRow[]> {
  const { data, error } = await sb.from('meeting_days').select('day, district, source').gte('day', from).lte('day', to)
  if (error) throw new Error(`meeting_days read failed: ${error.message}`)
  return (data ?? []) as DayRow[]
}

export async function setDayDistrict(day: string, district: string | null): Promise<void> {
  const q = district
    ? sb.from('meeting_days').upsert({ day, district, source: 'manual', updated_at: new Date().toISOString() })
    : sb.from('meeting_days').delete().eq('day', day)
  const { error } = await q
  if (error) throw new Error(`meeting_days write failed: ${error.message}`)
}

/** Первая живая запись закрепляет район за днём, если он ещё не задан. */
export async function claimDayByBooking(day: string, district: string): Promise<void> {
  const { error } = await sb
    .from('meeting_days')
    .upsert({ day, district, source: 'booking', updated_at: new Date().toISOString() }, { onConflict: 'day', ignoreDuplicates: true })
  if (error) throw new Error(`meeting_days claim failed: ${error.message}`)
}

export async function loadBookings(fromIso: string, toIso: string): Promise<MeetingBooking[]> {
  const { data, error } = await sb
    .from('meeting_bookings')
    .select('*')
    .eq('status', 'confirmed')
    .lt('start_at', toIso)
    .gt('end_at', fromIso)
    .order('start_at')
    .limit(1000)
  if (error) throw new Error(`meeting_bookings read failed: ${error.message}`)
  return (data ?? []) as MeetingBooking[]
}

export type NewBooking = Pick<MeetingBooking,
  'start_at' | 'end_at' | 'format' | 'district' | 'guest_name' | 'guest_email' | 'guest_contact' | 'comment' | 'lang'>

/** Вставка записи. null — слот уже занят (сработал констрейнт на пересечение). */
export async function insertBooking(b: NewBooking): Promise<MeetingBooking | null> {
  const { data, error } = await sb.from('meeting_bookings').insert(b).select('*').single()
  if (error?.code === '23P01') return null
  if (error) throw new Error(`meeting_bookings insert failed: ${error.message}`)
  return data as MeetingBooking
}

export async function attachGoogleEvent(id: string, eventId: string, meetUrl: string | null): Promise<void> {
  const { error } = await sb.from('meeting_bookings').update({ google_event_id: eventId, meet_url: meetUrl }).eq('id', id)
  if (error) throw new Error(`meeting_bookings attach event failed: ${error.message}`)
}

/** Переводит запись в отменённые. Возвращает запись, если она была подтверждённой. */
export async function markCancelled(id: string): Promise<MeetingBooking | null> {
  const { data, error } = await sb
    .from('meeting_bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'confirmed')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`meeting_bookings cancel failed: ${error.message}`)
  return (data ?? null) as MeetingBooking | null
}

/** Если в день не осталось живых встреч — снять район, закреплённый записью (ручной не трогаем). */
export async function releaseDayIfEmpty(day: string): Promise<void> {
  const from = new Date(dayStartMs(day)).toISOString()
  const to = new Date(dayStartMs(day) + 24 * 3600_000).toISOString()
  const { count, error } = await sb
    .from('meeting_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'confirmed')
    .eq('format', 'offline')
    .gte('start_at', from)
    .lt('start_at', to)
  if (error) throw new Error(`meeting_bookings count failed: ${error.message}`)
  if ((count ?? 0) > 0) return
  const { error: delErr } = await sb.from('meeting_days').delete().eq('day', day).eq('source', 'booking')
  if (delErr) throw new Error(`meeting_days release failed: ${delErr.message}`)
}

export async function listUpcomingBookings(limit = 200): Promise<MeetingBooking[]> {
  const { data, error } = await sb
    .from('meeting_bookings')
    .select('*')
    .gte('end_at', new Date(Date.now() - 24 * 3600_000).toISOString())
    .order('start_at')
    .limit(limit)
  if (error) throw new Error(`meeting_bookings list failed: ${error.message}`)
  return (data ?? []) as MeetingBooking[]
}
