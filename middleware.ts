import { NextResponse, type NextRequest } from 'next/server'

export const config = {
  matcher: [
    '/presentation/:path*',
    '/--------copy/:path*',
    '/villa/:path*',
    '/villas/:path*',
    '/apartment/:path*',
    '/apartments/:path*',
    '/complex/:path*',
    '/complexes/:path*',
    '/developer/:path*',
    '/developers/:path*',
    '/agency/:path*',
    '/agencies/:path*',
    '/agent/:path*',
    '/agents/:path*',
    '/news/:path*',
    '/events/:path*',
    '/promotion/:path*',
    '/promotions/:path*',
    '/unit/:path*',
    '/devcontact',
    '/agency',
  ],
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/feeds/_redirects-index.json`

type Index = { byId: Record<string, string>; bySlug: Record<string, string> }
let _cache: { ts: number; data: Index } | null = null
const TTL_MS = 30 * 60 * 1000

async function loadIndex(): Promise<Index | null> {
  if (_cache && Date.now() - _cache.ts < TTL_MS) return _cache.data
  try {
    const r = await fetch(INDEX_URL, { next: { revalidate: 1800 } })
    if (!r.ok) return _cache?.data ?? null
    const j = (await r.json()) as Index
    _cache = { ts: Date.now(), data: j }
    return j
  } catch {
    return _cache?.data ?? null
  }
}

const ID_RE = /^rec[a-zA-Z0-9]{14,}$/

function decodeSlug(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw)
    // Old Wix sometimes encoded `{state=generated, value=<slug>, isstale=false}`
    const m = decoded.match(/value\s*[:=]\s*([^,}]+)/i)
    if (m) return m[1].trim()
    // Strip trailing junk like `»`, `и`, `)` from URLs
    return decoded.trim().replace(/[»)Ѐ-ӿ]+$/, '').trim()
  } catch { return null }
}

function cleanId(raw: string): string | null {
  if (!raw) return null
  // Some legacy URLs have trailing junk after id (e.g. recXXX»)
  const m = raw.match(/^(rec[a-zA-Z0-9]+)/)
  return m ? m[1] : raw
}

function resolve(idx: Index, rawSlug: string | null, rawId: string | null, fallback: string): string {
  if (rawId) {
    const cid = cleanId(rawId)
    if (cid && ID_RE.test(cid) && idx.byId[cid]) return idx.byId[cid]
  }
  if (rawSlug) {
    const slug = decodeSlug(rawSlug)
    if (slug && idx.bySlug[slug]) return idx.bySlug[slug]
  }
  return fallback
}

const SECTION_FALLBACK: Record<string, string> = {
  villa: '/ru/villy',
  villas: '/ru/villy',
  apartment: '/ru/apartamenty',
  apartments: '/ru/apartamenty',
  unit: '/ru/apartamenty',
  complex: '/ru/zhilye-kompleksy',
  complexes: '/ru/zhilye-kompleksy',
  developer: '/ru/zastrojshhiki',
  developers: '/ru/zastrojshhiki',
  agency: '/ru/zastrojshhiki',
  agencies: '/ru/zastrojshhiki',
  agent: '/ru/zastrojshhiki',
  agents: '/ru/zastrojshhiki',
  news: '/ru/novosti',
  events: '/ru/meropriyatiya',
  promotion: '/ru/akcii',
  promotions: '/ru/akcii',
  presentation: '/ru',
  devcontact: '/ru/zastrojshhiki',
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const idx = await loadIndex()
  if (!idx) return NextResponse.next()

  // 1. Query-based: /something?recordId=recXXX
  const recordId = req.nextUrl.searchParams.get('recordId')
  if (recordId && ID_RE.test(recordId) && idx.byId[recordId]) {
    return NextResponse.redirect(new URL(idx.byId[recordId], req.url), 301)
  }

  // 2. Wix /<section>/page/<slug>/r/<id>  (news, events, agents)
  let m = path.match(/^\/([a-z]+)\/page\/([^/]+)\/r\/([^/]+)\/?$/i)
  if (m) {
    const section = m[1].toLowerCase()
    const dest = resolve(idx, m[2], m[3], SECTION_FALLBACK[section] ?? '/ru')
    return NextResponse.redirect(new URL(dest, req.url), 301)
  }

  // 3. Wix /<section>/page  (no slug, just page)
  m = path.match(/^\/([a-z]+)\/page\/?$/i)
  if (m) {
    return NextResponse.redirect(new URL(SECTION_FALLBACK[m[1].toLowerCase()] ?? '/ru', req.url), 301)
  }

  // 4. Wix /<section>/<slug>/r/<id>  — main pattern
  m = path.match(/^\/([a-z]+)\/([^/]+)\/r\/([^/]+)\/?$/i)
  if (m) {
    const section = m[1].toLowerCase()
    if (section in SECTION_FALLBACK) {
      const dest = resolve(idx, m[2], m[3], SECTION_FALLBACK[section])
      return NextResponse.redirect(new URL(dest, req.url), 301)
    }
  }

  // 5. /--------copy/<slug>/r/<id>
  m = path.match(/^\/-+copy\/([^/]+)\/r\/([^/]+)\/?$/)
  if (m) {
    const dest = resolve(idx, m[1], m[2], '/ru')
    return NextResponse.redirect(new URL(dest, req.url), 301)
  }

  // 6. /<section>/<slug>  (without /r/)
  m = path.match(/^\/(villa|villas|apartment|apartments|complex|complexes|developer|developers|agent|agents|news|events|promotion)\/([^/]+)\/?$/i)
  if (m) {
    const section = m[1].toLowerCase()
    const slug = decodeSlug(m[2])
    if (slug && idx.bySlug[slug]) {
      return NextResponse.redirect(new URL(idx.bySlug[slug], req.url), 301)
    }
    return NextResponse.redirect(new URL(SECTION_FALLBACK[section] ?? '/ru', req.url), 301)
  }

  // 7. Bare section roots (no slug at all)
  m = path.match(/^\/(villa|villas|apartment|apartments|complex|complexes|developer|developers|agency|agencies|agent|agents|unit|news|events|promotion|promotions|presentation|devcontact)\/?$/i)
  if (m) {
    return NextResponse.redirect(new URL(SECTION_FALLBACK[m[1].toLowerCase()] ?? '/ru', req.url), 301)
  }

  return NextResponse.next()
}
