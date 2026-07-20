import type { Lang } from '@/lib/i18n'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'

// Event `format` is a small Russian enum stored in the events manifest and is
// NOT part of the translated fields, so it leaks raw Cyrillic on non-RU pages.
// Map the known enum values to localized labels; anything else (e.g. a physical
// venue name) falls back to a safe de-Cyrillic translit on non-RU pages.
const FORMAT_LABELS: Record<string, Record<Lang, string>> = {
  живой: {
    ru: 'Живой', en: 'Live', id: 'Langsung', fr: 'En direct',
    de: 'Live', zh: '现场', nl: 'Live', ban: 'Langsung',
    pl: 'Na żywo', uk: 'Наживо',
  },
  онлайн: {
    ru: 'Онлайн', en: 'Online', id: 'Online', fr: 'En ligne',
    de: 'Online', zh: '线上', nl: 'Online', ban: 'Online',
    pl: 'Online', uk: 'Онлайн',
  },
}

export function localizeEventFormat(value: string, lang: Lang): string {
  const label = FORMAT_LABELS[value.trim().toLowerCase()]
  if (label) return label[lang]
  return lang !== 'ru' && hasCyrillic(value) ? translitPreserveCase(value) : value
}
