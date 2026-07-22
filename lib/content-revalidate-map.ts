// Shared kind → cache-tag / paths map. Used by both the public
// /api/revalidate-content endpoint and the admin data engine
// (lib/admin/revalidate.ts) so the two never diverge.

import { LANGS, switchLangPath } from './i18n'

export const KIND_TO_TAGS: Record<string, string> = {
  events: 'content:events',
  news: 'content:news',
  promo: 'content:promo',
  knowledge: 'content:knowledge',
  rental: 'content:rental',
  managers: 'content:managers',
  developers: 'content:developers',
  villas: 'content:villas',
  apartments: 'content:apartments',
  complexes: 'content:complexes',
  videos: 'content:videos',
}

type RevalidateRoute = { path: string; type?: 'page' | 'layout' }

// RU paths only — every other language is derived below. Hardcoding them
// used to mean an admin edit reached /ru and /en while the other eight
// locales kept serving their previous ISR render until the TTL ran out.
const RU_PATHS: Record<string, RevalidateRoute[]> = {
  events: [
    { path: '/ru/meropriyatiya' },
    { path: '/ru/meropriyatiya/[slug]', type: 'page' },
  ],
  news: [
    { path: '/ru/novosti' },
    { path: '/ru/novosti/[slug]', type: 'page' },
  ],
  promo: [
    { path: '/ru/akcii' },
    { path: '/ru/akcii/[slug]', type: 'page' },
  ],
  knowledge: [
    { path: '/ru/znaniya' },
    { path: '/ru/znaniya/[slug]', type: 'page' },
  ],
  rental: [
    { path: '/ru/arenda' },
    { path: '/ru/arenda/o/[slug]', type: 'page' },
  ],
  managers: [
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
    { path: '/ru/zhilye-kompleksy/o/[slug]', type: 'page' },
    { path: '/ru/villy/o/[slug]', type: 'page' },
    { path: '/ru/apartamenty/o/[slug]', type: 'page' },
  ],
  // The homepage carries top-complex / collection blocks fed by the same
  // tables, so it belongs in every catalog kind.
  developers: [
    { path: '/ru' },
    { path: '/ru/zastrojshhiki' },
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
  ],
  villas: [
    { path: '/ru' },
    { path: '/ru/villy' },
    { path: '/ru/villy/o/[slug]', type: 'page' },
  ],
  apartments: [
    { path: '/ru' },
    { path: '/ru/apartamenty' },
    { path: '/ru/apartamenty/o/[slug]', type: 'page' },
  ],
  complexes: [
    { path: '/ru' },
    { path: '/ru/zhilye-kompleksy' },
    { path: '/ru/zhilye-kompleksy/o/[slug]', type: 'page' },
  ],
  videos: [
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
    { path: '/ru/zhilye-kompleksy/o/[slug]', type: 'page' },
    { path: '/ru/villy/o/[slug]', type: 'page' },
    { path: '/ru/apartamenty/o/[slug]', type: 'page' },
  ],
}

// Fan every RU path out over all languages. `switchLangPath` translates the
// section segment and leaves `o` / `[slug]` untouched, which is exactly the
// route shape revalidatePath expects.
function localizeRoutes(routes: RevalidateRoute[]): RevalidateRoute[] {
  return routes.flatMap(route =>
    LANGS.map(lang => ({ ...route, path: switchLangPath(route.path, lang) })),
  )
}

export const KIND_TO_PATHS: Record<string, RevalidateRoute[]> = Object.fromEntries(
  Object.entries(RU_PATHS).map(([kind, routes]) => [kind, localizeRoutes(routes)]),
)
