// UTM-разметка исходящих ссылок.
//
// Зачем: в GA4 за 90 дней 71% пользователей приходят как Direct при 22%
// органики — для сайта, живущего с поиска, это не бывает правдой. Причина в
// том, что Telegram не передаёт referrer: каждая ссылка, которую бот или
// пуш-уведомление отправляет человеку, приходит в аналитику обезличенной и
// падает в Direct. Пока это так, нельзя ответить на простой вопрос — сколько
// трафика приносит бот и окупаются ли рассылки.
//
// ВАЖНО: размечать можно ТОЛЬКО ссылки, которые уходят живым людям.
// Ссылки для поисковых систем (canonical, hreflang, sitemap, JSON-LD, OG)
// размечать нельзя — UTM создаст дубли URL и разрушит канонизацию.
// Поэтому хелпер живёт отдельно и в lib/hreflang.ts, lib/sitemap-data.ts,
// lib/json-ld.ts, lib/og-image.tsx намеренно не импортируется.

export type UtmSource = 'telegram'

export type UtmParams = {
  source: UtmSource
  /** Тип касания: бот в диалоге, автопуш по подписке, рассылка агентам. */
  medium: 'bot' | 'push' | 'broadcast'
  /** Что именно за сценарий — чтобы в отчёте отличать одно от другого. */
  campaign: string
}

/**
 * Добавляет utm-метки к абсолютному URL, не трогая уже имеющиеся параметры.
 *
 * Идемпотентна: если метка уже стоит, повторный вызов её не задваивает —
 * ссылки собираются в нескольких местах и могут пройти через хелпер дважды.
 * На невалидном URL возвращает исходную строку: разметка аналитики не тот
 * повод, из-за которого пользователь должен остаться без ссылки.
 */
export function withUtm(url: string, params: UtmParams): string {
  try {
    const u = new URL(url)
    if (u.searchParams.has('utm_source')) return url
    u.searchParams.set('utm_source', params.source)
    u.searchParams.set('utm_medium', params.medium)
    u.searchParams.set('utm_campaign', params.campaign)
    return u.toString()
  } catch {
    return url
  }
}
