import { NextResponse, type NextRequest } from 'next/server'
import { normalizeSlug } from '@/lib/slug-normalize'

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
    // Wix dynamic-data-table paths (e.g. /table-1-details-2?recordId=recXXX)
    // got crawled by Google and indexed despite robots Disallow on /*?.
    // Catching them here lets the recordId branch below resolve to the
    // canonical URL — or 404 if the record no longer exists.
    '/table-:path*',
    // Dirty-slug pre-canonicaliser: catches both detail URLs
    // (/ru/<section>/o/<slug>) and listing-filter URLs
    // (/ru/<section>/<filter-slug>) when the slug carries cyrillic /
    // parens / mixed-script chars. Next 16 throws 500 on those before
    // the page handler can render a 404 — 301 to canonical here.
    '/ru/villy/:path*',
    '/ru/apartamenty/:path*',
    '/ru/arenda/:path*',
    '/ru/zhilye-kompleksy/:path*',
    '/ru/zastrojshhiki/:path*',
    '/ru/novosti/:path*',
    '/ru/akcii/:path*',
    '/ru/meropriyatiya/:path*',
    '/ru/znaniya/:path*',
    '/en/villas/:path*',
    '/en/apartments/:path*',
    '/en/rental/:path*',
    '/en/complexes/:path*',
    '/en/developers/:path*',
    '/en/news/:path*',
    '/en/promo/:path*',
    '/en/events/:path*',
    '/en/knowledge/:path*',
    // Catch-all so we can inject x-pathname for the root layout's
    // <html lang> resolution. Excludes _next assets, api, files with
    // an extension, and the static favicon set.
    '/((?!_next/|api/|favicon|icon-|apple-touch-icon|.+\\.[a-z0-9]+$).*)',
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

// Slug pre-canonicaliser for both detail and listing URLs. Next 16
// throws a 500 instead of a clean 404/308 when a path segment contains
// cyrillic, parens or other non-`a-z0-9-` characters — so we sniff
// the path here, normalise every segment, and emit a single 301.
// Catches `/ru/villy/o/<dirty>`, `/ru/villy/<dirty-filter>`, and
// multi-segment combinations like `/ru/apartamenty/<district>/<dirty>`.
const KNOWN_SECTIONS = new Set([
  'villy', 'apartamenty', 'arenda', 'zhilye-kompleksy', 'zastrojshhiki',
  'novosti', 'akcii', 'meropriyatiya', 'znaniya',
  'villas', 'apartments', 'rental', 'complexes', 'developers',
  'news', 'promo', 'events', 'knowledge',
])

function decodeSegment(raw: string): string {
  try { return decodeURIComponent(raw) } catch { return raw }
}

function handleDirtySlug(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname
  const m = path.match(/^\/(ru|en)\/([a-z-]+)(\/.*)?$/i)
  if (!m) return null
  const [, lang, section, rest] = m
  if (!KNOWN_SECTIONS.has(section)) return null
  if (!rest) return null

  // Split the remaining path into segments, decode and normalise each.
  // Anything that survives normalizeSlug unchanged is already clean;
  // we only act when at least one segment is rewritten.
  const segments = rest.split('/').filter(Boolean)
  const cleaned: string[] = []
  let changed = false
  for (const seg of segments) {
    // The `o` literal between section and detail slug must stay literal.
    if (seg === 'o' || seg === 'page') { cleaned.push(seg); continue }
    const decoded = decodeSegment(seg)
    const norm = normalizeSlug(decoded)
    if (!norm) {
      // Segment normalises to empty (was pure punctuation/space). Drop it.
      changed = true
      continue
    }
    if (norm !== decoded) changed = true
    cleaned.push(norm)
  }
  if (!changed) return null

  const target = `/${lang}/${section}/${cleaned.join('/')}`
  return NextResponse.redirect(new URL(target, req.url), 301)
}

// Pass the current pathname downstream so the root layout can pick
// the correct <html lang>. Without this Next 16 fixes <html> at build
// time across the whole site, which (a) hard-codes lang="en" on the
// RU tree, and (b) blocks any per-locale head logic.
function nextWithPath(req: NextRequest) {
  const h = new Headers(req.headers)
  h.set('x-pathname', req.nextUrl.pathname)
  return NextResponse.next({ request: { headers: h } })
}

export async function middleware(req: NextRequest) {
  // Fast path — runs on every matched URL, no I/O.
  const dirty = handleDirtySlug(req)
  if (dirty) return dirty

  const path = req.nextUrl.pathname
  const idx = await loadIndex()
  if (!idx) return nextWithPath(req)

  // 1. Query-based: /something?recordId=recXXX
  const recordId = req.nextUrl.searchParams.get('recordId')
  if (recordId && ID_RE.test(recordId)) {
    if (idx.byId[recordId]) {
      return NextResponse.redirect(new URL(idx.byId[recordId], req.url), 301)
    }
    // Known legacy URL pattern but no mapping — send to RU home so Google
    // sees a clean 301 instead of indexing the parameterised URL.
    if (path.startsWith('/table-')) {
      return NextResponse.redirect(new URL('/ru', req.url), 301)
    }
  }
  // /table-* without a recordId param at all → send to RU home as well.
  if (path.startsWith('/table-')) {
    return NextResponse.redirect(new URL('/ru', req.url), 301)
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

  return nextWithPath(req)
}
