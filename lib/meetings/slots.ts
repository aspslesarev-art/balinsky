// Расчёт свободных слотов на один день. Чистые функции без сети и БД —
// проверяются scripts/test-meeting-slots.mjs.
//
// Модель дня (всё в минутах от полуночи по Бали):
// - Первая живая встреча дня занимает ещё и дорогу перед собой:
//   встреча в Убуде в 12:00 при дороге 120 мин держит 10:00–13:00.
//   Выезжать раньше начала рабочего дня нельзя.
// - Следующие живые встречи в том же районе — через sameDistrictGapMin
//   после предыдущей (дорога уже позади).
// - Онлайн-встречи и события календаря разводятся с остальным на bufferMin.
// - В день, закреплённый за районом, живые встречи возможны только в нём.
//
// Обратная дорога домой не учитывается: последняя встреча просто должна
// закончиться до конца рабочего дня.

import type { MeetingFormat, MeetingSettings } from './types'

export type Interval = { start: number; end: number }

export type DayBooking = {
  start: number
  end: number
  format: MeetingFormat
  district: string | null
}

export type DayInput = {
  settings: MeetingSettings
  isWorkDay: boolean
  /** Чужие события календаря (не наши записи). */
  busy: Interval[]
  /** Подтверждённые записи этого дня. */
  bookings: DayBooking[]
  /** Район из meeting_days, если задан. */
  dayDistrict: string | null
  /** Раньше этой минуты ничего не начинается (минимальный запас до встречи); для будущих дней — 0. */
  earliestMin: number
}

export function hhmmToMin(v: string): number {
  const [h, m] = v.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minToHhmm(v: number): string {
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function travelMin(settings: MeetingSettings, district: string | null): number {
  if (!district) return 0
  return settings.districts.find(d => d.key === district)?.travelMin ?? 0
}

/** Район, к которому привязан день: ручной выбор или первая живая запись. */
export function effectiveDistrict(input: Pick<DayInput, 'dayDistrict' | 'bookings'>): string | null {
  if (input.dayDistrict) return input.dayDistrict
  const firstOffline = [...input.bookings]
    .filter(b => b.format === 'offline')
    .sort((a, b) => a.start - b.start)[0]
  return firstOffline?.district ?? null
}

type Occupied = DayBooking & { occStart: number; isCandidate: boolean }

/** Добавляет каждой записи начало занятости с учётом дороги перед первой живой встречей. */
function withTravel(settings: MeetingSettings, list: Array<DayBooking & { isCandidate: boolean }>): Occupied[] {
  const sorted = [...list].sort((a, b) => a.start - b.start)
  const firstOffline = sorted.find(b => b.format === 'offline')
  return sorted.map(b => ({
    ...b,
    occStart: b === firstOffline ? b.start - travelMin(settings, b.district) : b.start,
  }))
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number, gap: number): boolean {
  return aStart < bEnd + gap && bStart < aEnd + gap
}

/** Можно ли поставить встречу-кандидата в этот день. */
export function isFeasible(candidate: DayBooking, input: DayInput): boolean {
  const { settings } = input
  if (!input.isWorkDay) return false
  const workStart = hhmmToMin(settings.workStart)
  const workEnd = hhmmToMin(settings.workEnd)
  if (candidate.end > workEnd) return false

  if (candidate.format === 'offline') {
    if (!candidate.district) return false
    const district = effectiveDistrict(input)
    if (district && district !== candidate.district) return false
  }

  const all = withTravel(settings, [
    ...input.bookings.map(b => ({ ...b, isCandidate: false })),
    { ...candidate, isCandidate: true },
  ])
  const c = all.find(b => b.isCandidate)!
  if (c.occStart < Math.max(workStart, input.earliestMin)) return false

  // Конфликты проверяются только в парах с кандидатом: уже стоящие записи
  // между собой не пересчитываются — кандидат может лишь снять дорогу
  // с прежней первой встречи, а это освобождает время, а не занимает.
  for (const o of all) {
    if (o.isCandidate) continue
    const gap = c.format === 'offline' && o.format === 'offline' ? settings.sameDistrictGapMin : settings.bufferMin
    if (overlaps(c.occStart, c.end, o.occStart, o.end, gap)) return false
  }

  for (const b of input.busy) {
    if (overlaps(c.start, c.end, b.start, b.end, settings.bufferMin)) return false
    // В дорогу можно выехать сразу после чужого события, без зазора.
    if (c.occStart < c.start && overlaps(c.occStart, c.start, b.start, b.end, 0)) return false
  }
  return true
}

export function daySlots(input: DayInput): { online: number[]; offline: Record<string, number[]> } {
  const { settings } = input
  const result: { online: number[]; offline: Record<string, number[]> } = { online: [], offline: {} }
  if (!input.isWorkDay) return result

  const workStart = hhmmToMin(settings.workStart)
  const workEnd = hhmmToMin(settings.workEnd)
  const starts: number[] = []
  for (let t = workStart; t < workEnd; t += settings.stepMin) starts.push(t)

  result.online = starts.filter(t => isFeasible(
    { start: t, end: t + settings.onlineMin, format: 'online', district: null }, input,
  ))

  const fixed = effectiveDistrict(input)
  const districts = fixed ? settings.districts.filter(d => d.key === fixed) : settings.districts
  for (const d of districts) {
    const slots = starts.filter(t => isFeasible(
      { start: t, end: t + settings.offlineMin, format: 'offline', district: d.key }, input,
    ))
    if (slots.length) result.offline[d.key] = slots
  }
  return result
}
