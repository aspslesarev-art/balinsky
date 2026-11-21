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
  districts: 'content:districts',
}

type RevalidateRoute = { path: string; type?: 'page' | 'layout' }

// RU paths only — every other language is derived below. Hardcoding them
// used to mean an admin edit reached /ru and /en while the other eight
// locales kept serving their previous ISR render until the TTL ran out.
const RU_PATHS: Record<string, RevalidateRoute[]> = {
  // The developer page carries "новости / акции / мероприятия застройщика"
  // blocks filtered by `developers[].slug`, so it goes stale on any edit to
  // these three manifests — including linking an item to a developer.
  events: [
    { path: '/ru/meropriyatiya' },
    { path: '/ru/meropriyatiya/[slug]', type: 'page' },
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
  ],
  news: [
    { path: '/ru/novosti' },
    { path: '/ru/novosti/[slug]', type: 'page' },
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
  ],
  promo: [
    { path: '/ru/akcii' },
    { path: '/ru/akcii/[slug]', type: 'page' },
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
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
  // Районы из /admin/data (манифест districts/_districts.json). Сайт сейчас
  // берёт тексты районов из кода (lib/district-copy), так что правка там
  // видна только на страницах «инвестиции в район». Хабы каталогов
  // (/ru/villy/[...slug] и т.п.) сюда сознательно не входят: это тысячи
  // путей, а их данные района не читают.
  districts: [
    { path: '/ru/investicii/[district]', type: 'page' },
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

// Карты сайта общие для всех языков и живут на суточном TTL, поэтому их
// инвалидируем на любой правке контента — иначе новая вилла ждала бы места
// в /sitemap/villy.xml до суток. Путь не локализуется: маршрут один.
const SITEMAP_ROUTE: RevalidateRoute = { path: '/sitemap/[id]', type: 'page' }

export const KIND_TO_PATHS: Record<string, RevalidateRoute[]> = Object.fromEntries(
  Object.entries(RU_PATHS).map(([kind, routes]) => [
    kind,
    [...localizeRoutes(routes), SITEMAP_ROUTE],
  ]),
)
