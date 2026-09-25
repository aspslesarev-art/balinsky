// Languages whose market-page copy lives in components/market/copy/*-intl.tsx.
// RU and EN stay next to each view; Balinese reads the Indonesian copy.

import type { Lang } from '@/lib/i18n'

export type IntlLang = 'id' | 'fr' | 'de' | 'zh' | 'nl' | 'pl' | 'uk'

export function intlLang(lang: Exclude<Lang, 'ru' | 'en'>): IntlLang {
  return lang === 'ban' ? 'id' : lang
}

/** Appended to a link label when the linked guide exists only in English. */
export const IN_ENGLISH: Record<IntlLang, string> = {
  id: ' (dalam bahasa Inggris)',
  fr: ' (en anglais)',
  de: ' (auf Englisch)',
  zh: '（英文）',
  nl: ' (in het Engels)',
  pl: ' (po angielsku)',
  uk: ' (англійською)',
}
