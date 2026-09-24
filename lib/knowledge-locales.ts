// Knowledge articles published in Russian and English only.
//
// Articles reach the other eight locales through the translation caches; an
// article with no cache entry for a language falls back to transliterated
// Russian — unreadable. The EN-first buyer guides below were written by hand
// in ru/en only, so they are hidden from the other locales (list, detail,
// sitemap, hreflang) rather than shown as transliteration.
//
// Keyed by the Russian slug, like knowledge-noindex.ts.

import type { Lang } from './i18n'

const RU_EN_ONLY = new Set([
  'stoit-li-investirovat-v-nedvizhimost-na-bali-v-2026-plyusy-minusy-riski',
  'gde-kupit-villu-na-bali-changu-uluvatu-ubud-sanur-tseny-2026',
  'prodlenie-lizholda-na-bali-kak-eto-rabotaet-i-chto-propisat-v-dogovore',
  'upravlyayushchie-kompanii-dlya-vill-na-bali-komissii-i-kak-vybrat',
  'rassrochka-na-off-plan-na-bali-kak-rabotaet-i-kak-zashchitit-dengi',
  'skolko-stoit-kupit-villu-na-bali-nalogi-sbory-i-rashody-2026',
  'stavki-arendy-vill-na-bali-po-rayonam-2026',
  'dohodnost-vill-na-bali-po-rayonam-dannye',
  'deshevle-li-off-plan-na-bali-dannye-350-vill',
  'zonirovanie-i-razresheniya-vill-na-bali-v-tsifrah',
  'sroki-lizholda-na-bali-v-tsifrah-tsena-za-god',
])

/** @param ruSlug the Russian slug — the key every locale is indexed by. */
export function isRuEnOnlyKnowledge(ruSlug: string): boolean {
  return RU_EN_ONLY.has(ruSlug)
}

export function knowledgeAvailableIn(ruSlug: string, lang: Lang): boolean {
  return lang === 'ru' || lang === 'en' || !RU_EN_ONLY.has(ruSlug)
}
