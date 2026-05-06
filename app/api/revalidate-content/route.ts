import { revalidateTag, revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KIND_TO_TAGS: Record<string, string> = {
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
const KIND_TO_PATHS: Record<string, { path: string; type?: 'page' | 'layout' }[]> = {
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

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_TOKEN
  if (!expected) {
    return NextResponse.json({ error: 'REVALIDATE_TOKEN is not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const kindsParam = url.searchParams.get('kinds') ?? 'events,news,promo,knowledge,rental,managers'
  const kinds = kindsParam.split(',').map(s => s.trim()).filter(Boolean)
  const unknown = kinds.filter(k => !KIND_TO_TAGS[k])
  if (unknown.length > 0) {
    return NextResponse.json({ error: 'unknown kinds', kinds: unknown }, { status: 400 })
  }

  for (const k of kinds) {
    revalidateTag(KIND_TO_TAGS[k], 'max')
    for (const route of KIND_TO_PATHS[k]) {
      revalidatePath(route.path, route.type)
    }
  }

  return NextResponse.json({ ok: true, revalidated: kinds })
}
