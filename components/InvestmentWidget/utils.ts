import { formatPrice, formatPriceExact, type Currency } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'

export function fmtMoney(n: number | null | undefined, currency: Currency): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatPriceExact(n, currency)
}
export function fmtMoneyShort(n: number | null | undefined, currency: Currency): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return formatPrice(n, currency)
}
export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return (n * 100).toFixed(digits) + '%'
}
export function fmtYears(n: number | null | undefined, lang: Lang = 'ru'): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const unit = pickCopy({ ru: 'лет', en: 'yrs', id: 'thn', fr: 'ans', de: 'J.', zh: '年', nl: 'jr', ban: 'thn' }, lang)
  if (n > 100) return `>100 ${unit}`
  return n < 10 ? `${n.toFixed(1)} ${unit}` : `${Math.round(n)} ${unit}`
}
export function fmtDistance(km: number, lang: Lang = 'ru'): string {
  const mU = pickCopy({ ru: 'м', en: 'm', id: 'm', fr: 'm', de: 'm', zh: '米', nl: 'm', ban: 'm' }, lang)
  const kmU = pickCopy({ ru: 'км', en: 'km', id: 'km', fr: 'km', de: 'km', zh: '公里', nl: 'km', ban: 'km' }, lang)
  if (km < 1) return `${Math.round(km * 1000)} ${mU}`
  return `${km.toFixed(1)} ${kmU}`
}
export function fmtMeters(m: number, lang: Lang = 'ru'): string {
  const mU = pickCopy({ ru: 'м', en: 'm', id: 'm', fr: 'm', de: 'm', zh: '米', nl: 'm', ban: 'm' }, lang)
  const kmU = pickCopy({ ru: 'км', en: 'km', id: 'km', fr: 'km', de: 'km', zh: '公里', nl: 'km', ban: 'km' }, lang)
  if (m < 1000) return `${Math.round(m)} ${mU}`
  return `${(m / 1000).toFixed(1)} ${kmU}`
}
export function pluralRu(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}
export function pluralEn(n: number, [one, many]: [string, string]): string {
  return n === 1 ? one : many
}
