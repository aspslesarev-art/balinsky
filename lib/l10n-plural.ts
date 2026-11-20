// Plural forms for all ten site languages. ru/uk/pl have three forms
// (1 · 2–4 · 5+), en/de/fr/nl two, id/zh/ban none (the noun doesn't change).
//
//   plural(lang, 3, BEDROOMS)  // de → 'Schlafzimmer', pl → 'sypialnie'
//
// A form table gives every language its own entry: a 3-tuple for ru/uk/pl,
// a 2-tuple [one, other] for en/de/fr/nl and a single string for id/zh/ban.
import type { Lang } from './i18n'
import { pluralRu } from './plural-ru'

export type PluralForms = {
  ru: [string, string, string]
  uk: [string, string, string]
  pl: [string, string, string]
  en: [string, string]
  de: [string, string]
  fr: [string, string]
  nl: [string, string]
  id: string
  zh: string
  ban: string
  /** Chinese with a measure word after a number: 2间卧室. */
  zhCount?: string
}

export function pluralPl(n: number, [one, few, many]: [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n))
  if (abs === 1) return one
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function plural(lang: Lang, n: number, f: PluralForms): string {
  switch (lang) {
    case 'ru': return pluralRu(n, f.ru)
    case 'uk': return pluralRu(n, f.uk)
    case 'pl': return pluralPl(n, f.pl)
    case 'fr': return Math.abs(n) < 2 ? f.fr[0] : f.fr[1]
    case 'en': case 'de': case 'nl': return Math.abs(n) === 1 ? f[lang][0] : f[lang][1]
    default: return f[lang]
  }
}

/** "3 bedrooms" in the visitor's language; Chinese has no space ("3卧室"). */
export function nPlural(lang: Lang, n: number, f: PluralForms): string {
  return lang === 'zh' ? `${n}${f.zhCount ?? f.zh}` : `${n} ${plural(lang, n, f)}`
}

// Shared noun tables used by the listing pages.
export const BEDROOMS: PluralForms = {
  ru: ['спальня', 'спальни', 'спален'], uk: ['спальня', 'спальні', 'спалень'], pl: ['sypialnia', 'sypialnie', 'sypialni'],
  en: ['bedroom', 'bedrooms'], de: ['Schlafzimmer', 'Schlafzimmer'], fr: ['chambre', 'chambres'], nl: ['slaapkamer', 'slaapkamers'],
  id: 'kamar tidur', zh: '卧室', zhCount: '间卧室', ban: 'kamar pules',
}
export const BATHROOMS: PluralForms = {
  ru: ['ванная', 'ванные', 'ванных'], uk: ['санвузол', 'санвузли', 'санвузлів'], pl: ['łazienka', 'łazienki', 'łazienek'],
  en: ['bathroom', 'bathrooms'], de: ['Badezimmer', 'Badezimmer'], fr: ['salle de bain', 'salles de bain'], nl: ['badkamer', 'badkamers'],
  id: 'kamar mandi', zh: '浴室', zhCount: '间浴室', ban: 'kamar mandus',
}
export const FLOORS: PluralForms = {
  ru: ['этаж', 'этажа', 'этажей'], uk: ['поверх', 'поверхи', 'поверхів'], pl: ['piętro', 'piętra', 'pięter'],
  en: ['floor', 'floors'], de: ['Etage', 'Etagen'], fr: ['étage', 'étages'], nl: ['verdieping', 'verdiepingen'],
  id: 'lantai', zh: '层', ban: 'lantai',
}
export const YEARS: PluralForms = {
  ru: ['год', 'года', 'лет'], uk: ['рік', 'роки', 'років'], pl: ['rok', 'lata', 'lat'],
  en: ['yr', 'yrs'], de: ['Jahr', 'Jahre'], fr: ['an', 'ans'], nl: ['jaar', 'jaar'],
  id: 'tahun', zh: '年', ban: 'warsa',
}
export const PROJECTS: PluralForms = {
  ru: ['проект', 'проекта', 'проектов'], uk: ['проєкт', 'проєкти', 'проєктів'], pl: ['projekt', 'projekty', 'projektów'],
  en: ['project', 'projects'], de: ['Projekt', 'Projekte'], fr: ['projet', 'projets'], nl: ['project', 'projecten'],
  id: 'proyek', zh: '项目', zhCount: '个项目', ban: 'proyek',
}

/** Unit symbols. */
export const SQM: Record<Lang, string> = { ru: 'м²', uk: 'м²', en: 'm²', id: 'm²', fr: 'm²', de: 'm²', zh: 'm²', nl: 'm²', ban: 'm²', pl: 'm²' }
export const KM: Record<Lang, string> = { ru: 'км', uk: 'км', en: 'km', id: 'km', fr: 'km', de: 'km', zh: '公里', nl: 'km', ban: 'km', pl: 'km' }
export const METERS: Record<Lang, string> = { ru: 'м', uk: 'м', en: 'm', id: 'm', fr: 'm', de: 'm', zh: '米', nl: 'm', ban: 'm', pl: 'm' }
export const MIN: Record<Lang, string> = { ru: 'мин', uk: 'хв', en: 'min', id: 'menit', fr: 'min', de: 'Min.', zh: '分钟', nl: 'min', ban: 'menit', pl: 'min' }
/** Decimal separator: comma everywhere except en/zh. */
export const decSep = (lang: Lang) => (lang === 'en' || lang === 'zh' ? '.' : ',')
export const VILLAS: PluralForms = {
  ru: ['вилла', 'виллы', 'вилл'], uk: ['вілла', 'вілли', 'вілл'], pl: ['willa', 'wille', 'willi'],
  en: ['villa', 'villas'], de: ['Villa', 'Villen'], fr: ['villa', 'villas'], nl: ['villa', 'villa’s'],
  id: 'vila', zh: '套别墅', ban: 'vila',
}
