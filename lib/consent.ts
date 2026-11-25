// Согласие на аналитические cookie (GA4, GTM, Метрика).
//
// Закон (GDPR + ePrivacy в ЕЭЗ, UK GDPR, швейцарский FADP) требует спросить
// ДО того, как счётчики поставят cookie. Остальным странам, где у нас основная
// аудитория (Россия, Индонезия, Азия), такой обязанности нет — там счётчики
// работают как раньше, без окна.
//
// Режим «basic»: пока человек не нажал «Принять», не грузим ни одного тега —
// ни Google, ни Яндекса. Выбор хранится только в localStorage этого браузера.

import { countryByTimezone, resolveCountry } from '@/lib/geo'

/** ЕЭЗ (27 стран ЕС + Исландия, Лихтенштейн, Норвегия) + Великобритания + Швейцария. */
const CONSENT_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
])

// Европейские пояса вне зоны закона — для запасного пути, когда страну по IP
// узнать не вышло.
const NON_CONSENT_EUROPE_TZ = new Set([
  'Europe/Minsk', 'Europe/Kiev', 'Europe/Kyiv', 'Europe/Istanbul', 'Europe/Chisinau',
  'Europe/Belgrade', 'Europe/Sarajevo', 'Europe/Skopje', 'Europe/Podgorica', 'Europe/Tirane',
])

export type ConsentChoice = 'granted' | 'denied'

const LS_KEY = 'bx_cookie_consent'
/** Событие на window: выбор изменился (или его сбросили, чтобы спросить заново). */
export const CONSENT_EVENT = 'bx:cookie-consent'

export function readConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(LS_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function writeConsent(choice: ConsentChoice | null): void {
  try {
    if (choice) localStorage.setItem(LS_KEY, choice)
    else localStorage.removeItem(LS_KEY)
  } catch { /* приватный режим: выбор проживёт до перезагрузки */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }))
}

function europeByTimezone(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (countryByTimezone() === 'RU') return false
    if (NON_CONSENT_EUROPE_TZ.has(tz)) return false
    return tz.startsWith('Europe/') || ['Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores', 'Atlantic/Reykjavik'].includes(tz)
  } catch {
    return false
  }
}

/** Нужно ли спрашивать согласие у этого посетителя (по стране IP, запасной путь — часовой пояс). */
export async function consentRequired(): Promise<boolean> {
  const country = await resolveCountry()
  if (country) return CONSENT_COUNTRIES.has(country)
  return europeByTimezone()
}
