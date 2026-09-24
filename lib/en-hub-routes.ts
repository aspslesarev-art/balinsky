// English URLs for the programmatic catalog hubs.
//
// The hub trees (lib/villa-seo-routes.ts, lib/seo-routes.ts) are keyed on
// Russian transliterated slugs — /ru/villy/canggu/2-spalni. The EN catalog
// used to have no sub-routes of its own, so /en/villas/canggu 404'd and
// English searchers («villas for sale in canggu») had nothing to land on.
// This module maps those RU slugs to English ones and back, so the EN hubs
// reuse the RU parsers/canonicalisers unchanged. District slugs are already
// English and pass through as-is.

import type { Lang } from './i18n'
import { switchLangPath } from './i18n'
import { SITE_ORIGIN } from './hreflang'

const RU_TO_EN: Record<string, string> = {
  // bedrooms (shared by villas and apartments)
  '1-spalnya': '1-bedroom',
  '2-spalni': '2-bedroom',
  '3-spalni': '3-bedroom',
  // status
  stroyatsya: 'under-construction',
  gotovye: 'completed',
  planiruyutsya: 'off-plan',
  // apartment price segments
  'do-100000': 'under-100000',
  '100000-200000': '100000-200000',
  '200000-300000': '200000-300000',
  '300000-500000': '300000-500000',
  'ot-500000': 'over-500000',
  // villa interior styles
  'stil-bali-tropic': 'balinese-style',
  'stil-minimalism': 'minimalist',
  'stil-tropic-modern': 'tropical-modern',
  'stil-mediterranean': 'mediterranean',
  'stil-scandi': 'scandinavian',
  'stil-wabi-sabi': 'wabi-sabi',
  'stil-loft': 'loft',
  'stil-boho': 'boho',
  'stil-classic': 'classic',
  'stil-colonial': 'colonial',
}
const EN_TO_RU: Record<string, string> = Object.fromEntries(
  Object.entries(RU_TO_EN).map(([ru, en]) => [en, ru]),
)

const SECTIONS: Record<string, string> = {
  '/ru/villy': '/en/villas',
  '/ru/apartamenty': '/en/apartments',
}

/** `/ru/villy/canggu/2-spalni` → `/en/villas/canggu/2-bedroom`. Unknown section → null. */
export function ruHubToEn(ruPath: string): string | null {
  for (const [ru, en] of Object.entries(SECTIONS)) {
    if (ruPath === ru) return en
    if (ruPath.startsWith(ru + '/')) {
      const segs = ruPath.slice(ru.length + 1).split('/')
      return en + '/' + segs.map(s => RU_TO_EN[s] ?? s).join('/')
    }
  }
  return null
}

/**
 * EN URL segments → the RU segments the hub parsers understand. RU slugs
 * are accepted too (old /en/villas/canggu/2-spalni links); the page then
 * 308s them onto the English canonical.
 */
export function enSegmentsToRu(segments: string[]): string[] {
  return segments.map(s => {
    const seg = decodeURIComponent(s)
    return EN_TO_RU[seg] ?? seg
  })
}

/**
 * Link to a hub from any locale. EN gets the English hub, RU its own path,
 * the other locales keep their previous behaviour (section-segment rewrite).
 */
export function localizeHubPath(ruPath: string, lang: Lang): string {
  if (lang === 'en') return ruHubToEn(ruPath) ?? switchLangPath(ruPath, 'en')
  return switchLangPath(ruPath, lang)
}

/**
 * Reciprocal hreflang pair for a hub that exists in both RU and EN (the
 * other locales have no hub routes). x-default stays on RU, as in hreflangMap.
 */
export function hubLanguages(ruPath: string): Record<string, string> {
  const en = ruHubToEn(ruPath)
  const ru = `${SITE_ORIGIN}${ruPath}`
  return en ? { ru, en: `${SITE_ORIGIN}${en}`, 'x-default': ru } : { ru }
}
