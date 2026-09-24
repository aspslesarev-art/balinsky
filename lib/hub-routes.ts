// Localized URLs for the programmatic catalog hubs, in every locale.
//
// The hub trees (lib/villa-seo-routes.ts, lib/seo-routes.ts,
// lib/complex-seo-routes.ts) are keyed on Russian transliterated slugs —
// /ru/villy/canggu/2-spalni. Only RU used to have hub routes, so
// /en/villas/canggu or /id/vila/canggu 404'd and every non-RU searcher
// («villas for sale in canggu») had nothing to land on — while the catalogs'
// own «districts / related filters» blocks linked to exactly those URLs.
//
// Every non-RU locale gets the same hub tree under its own section segment
// (/en/villas, /id/vila, /de/villen …) with English filter slugs
// (2-bedroom, under-construction, minimalist). District slugs are already
// Latin and pass through. The pages map the slugs back to RU and reuse the
// RU parser/canonicaliser unchanged, so all locales agree on what a hub is.

import type { Lang } from './i18n'
import { switchLangPath } from './i18n'
import { SITE_ORIGIN } from './hreflang'

const RU_TO_EN: Record<string, string> = {
  // bedrooms (villas, apartments)
  '1-spalnya': '1-bedroom',
  '2-spalni': '2-bedroom',
  '3-spalni': '3-bedroom',
  // status (all three sections)
  stroyatsya: 'under-construction',
  gotovye: 'completed',
  planiruyutsya: 'off-plan',
  // apartment price segments
  'do-100000': 'under-100000',
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
  // complex unit types
  villy: 'villas',
  apartmenty: 'apartments',
  taunhausy: 'townhouses',
  'smart-villy': 'smart-villas',
  pentkhausy: 'penthouses',
}
const EN_TO_RU: Record<string, string> = Object.fromEntries(
  Object.entries(RU_TO_EN).map(([ru, en]) => [en, ru]),
)

export const HUB_SECTIONS = ['/ru/villy', '/ru/apartamenty', '/ru/zhilye-kompleksy'] as const
export type HubSection = (typeof HUB_SECTIONS)[number]

// hreflang codes, same cluster as lib/hreflang.ts. Balinese has no ISO 639-1
// code, so /ban/ hubs exist and are in the sitemap but carry no hreflang.
const HREFLANG: [string, Lang][] = [
  ['ru', 'ru'], ['en', 'en'], ['id', 'id'], ['fr', 'fr'], ['de', 'de'],
  ['zh-Hans', 'zh'], ['nl', 'nl'], ['pl', 'pl'], ['uk', 'uk'],
]

function splitHub(ruPath: string): { section: HubSection; segs: string[] } | null {
  for (const section of HUB_SECTIONS) {
    if (ruPath === section) return { section, segs: [] }
    if (ruPath.startsWith(section + '/')) {
      return { section, segs: ruPath.slice(section.length + 1).split('/').filter(Boolean) }
    }
  }
  return null
}

/**
 * `/ru/villy/canggu/2-spalni` → `/en/villas/canggu/2-bedroom`,
 * `/id/vila/canggu/2-bedroom`, … Not a hub path → null.
 */
export function hubPath(ruPath: string, lang: Lang): string | null {
  if (lang === 'ru') return splitHub(ruPath) ? ruPath : null
  const hub = splitHub(ruPath)
  if (!hub) return null
  const root = switchLangPath(hub.section, lang)
  return hub.segs.length ? `${root}/${hub.segs.map(s => RU_TO_EN[s] ?? s).join('/')}` : root
}

/**
 * Localized URL segments → the RU segments the hub parsers understand. RU
 * slugs are accepted too (old /en/villas/canggu/2-spalni links); the page
 * then 308s them onto the localized canonical.
 */
export function hubSegmentsToRu(segments: string[]): string[] {
  return segments.map(s => {
    let seg = s
    try { seg = decodeURIComponent(s) } catch { /* keep raw */ }
    return EN_TO_RU[seg] ?? seg
  })
}

/** Link to a hub from any locale; non-hub paths keep the section rewrite. */
export function localizeHubPath(ruPath: string, lang: Lang): string {
  return hubPath(ruPath, lang) ?? switchLangPath(ruPath, lang)
}

/** Full reciprocal hreflang cluster for a hub (x-default = RU, as in hreflangMap). */
export function hubLanguages(ruPath: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [code, lang] of HREFLANG) {
    const p = hubPath(ruPath, lang)
    if (p) out[code] = `${SITE_ORIGIN}${p}`
  }
  if (out.ru) out['x-default'] = out.ru
  return out
}
