// Cleanup for developer editorial "highlights" bullets.
//
// Two problems this fixes:
//  1) JUNK meta-commentary. The AI translation pass sometimes described the
//     Airtable column instead of translating its value, leaving sentences
//     like "This information is about the construction and real estate
//     projects of a developer in Bali." or "These are the names of the
//     developer's property management companies in Bali as listed on their
//     website." These are not real content and must never render.
//  2) CYRILLIC leaks. When no translation exists, the source is raw Russian.
//     On a non-RU page we de-Cyrillic as a last resort (translit to Latin).

import { hasCyrillic, translitPreserveCase } from './translit'
import type { Lang } from './i18n'

// A bullet is meta-commentary when it starts with one of these openers
// (the translator narrating the field) …
const META_PREFIXES = [
  'this information is about',
  'these are the names of',
  'the following',
  'this field',
  'this section',
  'this describes',
  'this is a list of',
  'this is information about',
]
// … or contains one of these tell-tale field-narration phrases.
const META_SUBSTRINGS = [
  'as listed on their website',
  'according to the company facts',
]

/** True when a bullet is AI meta-commentary about the field, not content. */
export function isMetaBullet(bullet: string): boolean {
  const s = bullet.trim().toLowerCase()
  if (!s) return true
  if (META_PREFIXES.some(p => s.startsWith(p))) return true
  if (META_SUBSTRINGS.some(p => s.includes(p))) return true
  return false
}

/**
 * Drop junk meta-commentary bullets and, on non-RU pages, transliterate any
 * bullet still in Cyrillic. RU output is unchanged (the English meta phrases
 * never appear in the Russian source, and Cyrillic is only touched off RU).
 */
export function cleanDeveloperBullets(bullets: string[], lang: Lang): string[] {
  return bullets
    .filter(b => !isMetaBullet(b))
    .map(b => (lang !== 'ru' && hasCyrillic(b) ? translitPreserveCase(b) : b))
}
