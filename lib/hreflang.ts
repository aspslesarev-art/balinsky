import { switchLangPath } from '@/lib/i18n'

// One hreflang cluster for the whole site.
//
// The XML sitemap has always emitted the full set (lib/sitemap-data.ts), but
// the HTML <head> did not: ru/en pages advertised only ru + en + x-default,
// and /de, /fr, /zh, /pl, /id pages advertised nothing at all — while those
// locales carry 27% of all impressions (id alone is the third-biggest).
// Two different answers to "what are this page's alternates" is worse than
// one, so every metadata site now builds the map from here.
//
// Kept deliberately in sync with lib/sitemap-data.ts:
//   • Simplified Chinese is `zh-Hans`, not the ambiguous bare `zh`;
//   • Ukrainian is served from /ua (switchLangPath resolves it), so the
//     annotation points at a 200, not at a redirect;
//   • Balinese is excluded on purpose — it's a UI scaffold with no search
//     demand, and advertising it only floods Search Console with pages that
//     can never rank. See the note in lib/sitemap-data.ts.

export const SITE_ORIGIN = 'https://balinsky.info'

/** hreflang code → the language its path is built for. */
const CLUSTER = [
  ['ru', 'ru'],
  ['en', 'en'],
  ['id', 'id'],
  ['fr', 'fr'],
  ['de', 'de'],
  ['zh-Hans', 'zh'],
  ['nl', 'nl'],
  ['pl', 'pl'],
  ['uk', 'uk'],
] as const

/**
 * Full alternates map for a page, given its Russian path.
 *
 * @param ruPath e.g. '/ru/villy' or '/ru/villy/o/some-slug' — with or without
 *   the origin; both forms appear across the codebase.
 */
export function hreflangMap(ruPath: string): Record<string, string> {
  const path = ruPath.startsWith('http')
    ? ruPath.slice(ruPath.indexOf('/', 'https://'.length))
    : ruPath
  const out: Record<string, string> = {}
  for (const [code, lang] of CLUSTER) {
    out[code] = `${SITE_ORIGIN}${switchLangPath(path, lang)}`
  }
  out['x-default'] = `${SITE_ORIGIN}${path}`
  return out
}
