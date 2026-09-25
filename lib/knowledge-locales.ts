// Knowledge articles published in Russian and English only.
//
// Articles reach the other eight locales through the translation caches; an
// article with no cache entry for a language falls back to transliterated
// Russian — unreadable. Anything written by hand in ru/en only goes here so
// it stays hidden from the other locales (list, detail, sitemap, hreflang)
// until it is translated.
//
// Keyed by the Russian slug, like knowledge-noindex.ts. Empty since
// 2026-09-26: the eleven EN-first buyer guides were translated into every
// locale.

import type { Lang } from './i18n'

const RU_EN_ONLY = new Set<string>([])

/** @param ruSlug the Russian slug — the key every locale is indexed by. */
export function isRuEnOnlyKnowledge(ruSlug: string): boolean {
  return RU_EN_ONLY.has(ruSlug)
}

export function knowledgeAvailableIn(ruSlug: string, lang: Lang): boolean {
  return lang === 'ru' || lang === 'en' || !RU_EN_ONLY.has(ruSlug)
}
