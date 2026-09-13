// Сборка доступности: Google Календарь (занятость) + записи и районы из БД
// → свободные слоты по дням через чистый движок lib/meetings/slots.ts.

import { blocksTime, listEvents, type GEvent } from './google'
import { daySlots, isFeasible, minToHhmm, type DayBooking, type DayInput, type Interval } from './slots'
import {
  addDays, baliParts, baliToday, dayStartMs, isoWeekday, loadBookings, loadDays, loadSettings,
} from './store'
import type { AvailabilityDay, MeetingBooking, MeetingSettings } from './types'

const DAY_MS = 24 * 3600_000

type RangeData = {
  settings: MeetingSettings
  events: GEvent[]
  bookings: MeetingBooking[]
  days: Map<string, string>
}

async function loadRange(from: string, to: string): Promise<RangeData> {
  const timeMin = new Date(dayStartMs(from)).toISOString()
  const timeMax = new Date(dayStartMs(to) + DAY_MS).toISOString()
  const [settings, events, bookings, dayRows] = await Promise.all([
    loadSettings(),
    listEvents(timeMin, timeMax),
    loadBookings(timeMin, timeMax),
    loadDays(from, to),
  ])
  return { settings, events, bookings, days: new Map(dayRows.map(r => [r.day, r.district])) }
}

/** Отрезок [startMs, endMs) в минутах внутри суток date; null — не пересекается. */
function clipToDay(date: string, startMs: number, endMs: number): Interval | null {
  const day0 = dayStartMs(date)
  const s = Math.max(startMs, day0)
  const e = Math.min(endMs, day0 + DAY_MS)
  if (e <= s) return null
  return { start: Math.floor((s - day0) / 60_000), end: Math.ceil((e - day0) / 60_000) }
}

function eventRangeMs(e: GEvent): [number, number] | null {
  if (e.start.dateTime && e.end.dateTime) return [Date.parse(e.start.dateTime), Date.parse(e.end.dateTime)]
  // Событие на весь день: даты по Бали, конец не включается.
  if (e.start.date && e.end.date) return [dayStartMs(e.start.date), dayStartMs(e.end.date)]
  return null
}

function dayInput(date: string, data: RangeData, now: number): DayInput {
  const { settings } = data
  const busy = data.events
    .filter(blocksTime)
    .map(eventRangeMs)
    .flatMap(r => (r ? [clipToDay(date, r[0], r[1])] : []))
    .filter((x): x is Interval => x !== null)

  const bookings: DayBooking[] = data.bookings
    .filter(b => baliParts(Date.parse(b.start_at)).date === date)
    .map(b => {
      const s = baliParts(Date.parse(b.start_at)).min
      return { start: s, end: s + Math.round((Date.parse(b.end_at) - Date.parse(b.start_at)) / 60_000), format: b.format, district: b.district }
    })

  const earliest = baliParts(now + settings.minNoticeMin * 60_000)
  const earliestMin = earliest.date > date ? Number.POSITIVE_INFINITY : earliest.date === date ? earliest.min : 0

  return {
    settings,
    isWorkDay: settings.workDays.includes(isoWeekday(date)),
    busy,
    bookings,
    dayDistrict: data.days.get(date) ?? null,
    earliestMin,
  }
}

export async function computeAvailability(now = Date.now()): Promise<{ settings: MeetingSettings; days: AvailabilityDay[] }> {
  const from = baliToday(now)
  const settings = await loadSettings()
  const to = addDays(from, settings.horizonDays - 1)
  const data = await loadRange(from, to)

  const days: AvailabilityDay[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const input = dayInput(date, data, now)
    const slots = daySlots(input)
    days.push({
      date,
      district: input.dayDistrict ?? input.bookings.find(b => b.format === 'offline')?.district ?? null,
      online: slots.online.map(minToHhmm),
      offline: Object.fromEntries(Object.entries(slots.offline).map(([k, v]) => [k, v.map(minToHhmm)])),
    })
  }
  return { settings: data.settings, days }
}

/** Свежая проверка одного слота прямо перед записью. */
export async function checkSlot(candidate: { date: string; start: number; format: DayBooking['format']; district: string | null }, now = Date.now()): Promise<{ ok: boolean; settings: MeetingSettings }> {
  const data = await loadRange(candidate.date, candidate.date)
  const { settings } = data
  const today = baliToday(now)
  if (candidate.date < today || candidate.date > addDays(today, settings.horizonDays - 1)) return { ok: false, settings }
  const dur = candidate.format === 'online' ? settings.onlineMin : settings.offlineMin
  if (candidate.format === 'offline' && !settings.districts.some(d => d.key === candidate.district)) return { ok: false, settings }
  const ok = isFeasible(
    { start: candidate.start, end: candidate.start + dur, format: candidate.format, district: candidate.format === 'offline' ? candidate.district : null },
    dayInput(candidate.date, data, now),
  )
  return { ok, settings }
}
