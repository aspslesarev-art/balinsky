// Короткая строка фактов для подсказки на карте каталога: «2 спальни · 76 м²»
// (владелец 21.11.2026: «кроме фото и названия — хотя бы цену»). Считается на
// сервере, в браузер уходит готовой строкой — несколько байт на объект.
import type { Lang } from './i18n'
import { nPlural, BEDROOMS } from './l10n-plural'

export function mapFacts(lang: Lang, bedrooms: string | number | null | undefined, area: number | null | undefined): string | undefined {
  const n = bedrooms == null ? NaN : Number(bedrooms)
  const parts = [
    Number.isFinite(n) && n > 0 ? (lang === 'en' ? `${n} BR` : nPlural(lang, n, BEDROOMS)) : null,
    area != null && Number.isFinite(area) && area > 0 ? `${Math.round(area)} ${lang === 'ru' || lang === 'uk' ? 'м²' : 'm²'}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}
