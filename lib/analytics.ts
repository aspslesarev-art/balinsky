// Единая точка отправки событий в GA4 (напрямую и через GTM) и Метрику.
//
// Зачем: за 28 дней GA4 показывал 3 ключевых события на 1 158 пользователей —
// то есть конверсии на сайте фактически не измерялись, и любой вывод про
// «трафик растёт» нельзя было связать с заявками. Здесь перечислены только те
// действия, за которыми стоит деньги или явный интерес.
//
// Имена событий одинаковы для GA4 и для целей Метрики — так отчёты
// сходятся между системами без таблицы соответствий.

/** Счётчики. Держим в одном месте: layout рисует noscript-пиксели,
 *  components/Analytics.tsx грузит сами теги. */
export const GTM_ID = 'GTM-TM6D54Z3'
export const YM_ID = 104881153
export const GA4_ID = 'G-YPJC0S54ME'

/**
 * `generate_lead`      — форма заявки успешно отправлена (это деньги).
 * `lead_form_open`     — модалка заявки открыта: даёт конверсию открытие→отправка.
 * `telegram_contact`   — уход в Telegram-бота: второй канал заявок мимо формы.
 * `wishlist_add`       — объект добавлен в избранное: сильный сигнал интереса.
 * `presentation_open`  — сформирована PDF-презентация объекта или подборки.
 */
export type TrackedEvent =
  | 'generate_lead'
  | 'lead_form_open'
  | 'telegram_contact'
  | 'wishlist_add'
  | 'presentation_open'

export type EventParams = Record<string, string | number | boolean | null | undefined>

type AnalyticsWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (command: string, ...args: unknown[]) => void
  ym?: (id: number, action: string, ...args: unknown[]) => void
}

/** Пустые значения только засоряют отчёты — GA4 всё равно их не покажет. */
function compact(params: EventParams): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string | number | boolean] =>
        entry[1] !== undefined && entry[1] !== null && entry[1] !== '',
    ),
  )
}

/**
 * Отправляет событие во все подключённые счётчики.
 *
 * Молча ничего не делает, если теги не загружены — так и должно быть на
 * /admin/* и в помеченных «своих» браузерах (см. components/Analytics.tsx).
 * Аналитика никогда не должна ломать сам сценарий, поэтому всё в try/catch.
 */
export function trackEvent(name: TrackedEvent, params: EventParams = {}): void {
  if (typeof window === 'undefined') return
  const payload = compact(params)
  const w = window as AnalyticsWindow

  try {
    w.dataLayer?.push({ event: name, ...payload })
  } catch { /* GTM не загрузился — не наша забота */ }

  try {
    w.gtag?.('event', name, payload)
  } catch { /* GA4 не загрузился */ }

  try {
    w.ym?.(YM_ID, 'reachGoal', name, payload)
  } catch { /* Метрика не загрузилась */ }
}
