// Запись на встречи: общие типы и настройки по умолчанию.
// Время везде — настенные часы Бали (UTC+8, без перехода на летнее время).

export type MeetingFormat = 'online' | 'offline'

export type District = {
  /** Ключ в URL и в БД: 'ubud', 'canggu'. */
  key: string
  ru: string
  en: string
  /** Сколько минут ехать из дома до района. */
  travelMin: number
}

export type MeetingSettings = {
  /** Рабочие дни ISO: 1 = понедельник … 7 = воскресенье. */
  workDays: number[]
  /** 'HH:mm' — с этого времени можно выезжать или созваниваться. */
  workStart: string
  /** 'HH:mm' — к этому времени встреча должна закончиться. */
  workEnd: string
  onlineMin: number
  offlineMin: number
  /** Зазор вокруг онлайн-встреч и чужих событий календаря. */
  bufferMin: number
  /** Зазор между живыми встречами в одном районе. */
  sameDistrictGapMin: number
  /** Шаг сетки слотов. */
  stepMin: number
  /** Минимум минут от текущего момента до выезда / начала встречи. */
  minNoticeMin: number
  /** На сколько дней вперёд открыта запись. */
  horizonDays: number
  districts: District[]
}

export const DEFAULT_SETTINGS: MeetingSettings = {
  workDays: [1, 2, 3, 4, 5],
  workStart: '10:00',
  workEnd: '18:00',
  onlineMin: 30,
  offlineMin: 60,
  bufferMin: 15,
  sameDistrictGapMin: 30,
  stepMin: 30,
  minNoticeMin: 180,
  horizonDays: 30,
  districts: [
    { key: 'canggu', ru: 'Чангу', en: 'Canggu', travelMin: 60 },
    { key: 'ubud', ru: 'Убуд', en: 'Ubud', travelMin: 120 },
    { key: 'bukit', ru: 'Букит', en: 'Bukit', travelMin: 60 },
    { key: 'nusa-dua', ru: 'Нуса Дуа', en: 'Nusa Dua', travelMin: 60 },
    { key: 'seminyak', ru: 'Семиньяк', en: 'Seminyak', travelMin: 60 },
    { key: 'sanur', ru: 'Санур', en: 'Sanur', travelMin: 60 },
    { key: 'denpasar', ru: 'Денпасар', en: 'Denpasar', travelMin: 60 },
  ],
}

export type BookingStatus = 'confirmed' | 'cancelled'

export type MeetingBooking = {
  id: string
  start_at: string
  end_at: string
  format: MeetingFormat
  district: string | null
  guest_name: string
  guest_email: string
  guest_contact: string | null
  comment: string | null
  lang: string
  status: BookingStatus
  google_event_id: string | null
  meet_url: string | null
  created_at: string
  cancelled_at: string | null
}

/** Один день в ответе API доступности. Время слотов — 'HH:mm' по Бали. */
export type AvailabilityDay = {
  date: string
  /** Район, закреплённый за днём; null — ещё не определён. */
  district: string | null
  online: string[]
  /** district key → слоты живых встреч. */
  offline: Record<string, string[]>
}
