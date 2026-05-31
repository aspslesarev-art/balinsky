// Shared kind → cache-tag / paths map. Used by both the public
// /api/revalidate-content endpoint (called by sync scripts) and the admin
// data engine (lib/admin/revalidate.ts) so the two never diverge.

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

export const KIND_TO_PATHS: Record<string, { path: string; type?: 'page' | 'layout' }[]> = {
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
  developers: [
    { path: '/ru/zastrojshhiki' },
    { path: '/en/developers' },
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
    { path: '/en/developers/[slug]', type: 'page' },
  ],
  villas: [
    { path: '/ru/villy' },
    { path: '/en/villas' },
    { path: '/ru/villy/o/[slug]', type: 'page' },
    { path: '/en/villas/o/[slug]', type: 'page' },
  ],
  apartments: [
    { path: '/ru/apartamenty' },
    { path: '/en/apartments' },
    { path: '/ru/apartamenty/o/[slug]', type: 'page' },
    { path: '/en/apartments/o/[slug]', type: 'page' },
  ],
  complexes: [
    { path: '/ru/zhilye-kompleksy' },
    { path: '/en/complexes' },
    { path: '/ru/zhilye-kompleksy/o/[slug]', type: 'page' },
    { path: '/en/complexes/o/[slug]', type: 'page' },
  ],
  videos: [
    { path: '/ru/zastrojshhiki/[slug]', type: 'page' },
    { path: '/en/developers/[slug]', type: 'page' },
    { path: '/ru/zhilye-kompleksy/o/[slug]', type: 'page' },
    { path: '/en/complexes/o/[slug]', type: 'page' },
    { path: '/ru/villy/o/[slug]', type: 'page' },
    { path: '/en/villas/o/[slug]', type: 'page' },
    { path: '/ru/apartamenty/o/[slug]', type: 'page' },
    { path: '/en/apartments/o/[slug]', type: 'page' },
  ],
}
