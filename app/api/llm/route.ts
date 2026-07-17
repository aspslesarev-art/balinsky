// LLM text layer — serves any page as clean Markdown or JSON to verified AI
// crawlers. middleware.ts rewrites `<path>.md` / `<path>.json` here.
//
// Flow: gate (verified AI bot or preview token) → rate-limit → fetch the
// page's own HTML → reduce to a text model → render md/json.
import { NextResponse } from 'next/server'
import { gate } from '@/lib/llm/bots'
import { rateLimited, clientIp } from '@/lib/llm/ratelimit'
import { htmlToDoc, docToMarkdown, docToJson } from '@/lib/llm/extract'
import { detectLang } from '@/lib/i18n'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BAD_PREFIX = /^\/(api|_next|admin|feeds|sitemap|robots|favicon|fonts|.*\.[a-z0-9]+$)/i

function sanitizePath(raw: string | null): string | null {
  if (!raw) return null
  let p = raw.trim()
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/\.(md|json)$/i, '')
  // Collapse any traversal / double slashes.
  p = p.replace(/\/{2,}/g, '/')
  if (p.includes('..')) return null
  if (p !== '/' && BAD_PREFIX.test(p)) return null
  return p
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'md').toLowerCase() === 'json' ? 'json' : 'md'
  const path = sanitizePath(url.searchParams.get('path'))

  if (!path) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const g = await gate(req)
  if (!g.allowed) {
    return new NextResponse(
      `# Access restricted\n\nThe clean text/JSON view is served to verified AI crawlers only.\n` +
      `View this page in a browser: ${url.origin}${path}\n\nReason: ${g.reason}\n`,
      { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  if (rateLimited(clientIp(req.headers))) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 })
  }

  // Fetch the page's own server-rendered HTML. A distinct UA keeps this
  // internal hop out of analytics and never re-enters the gate (pages aren't
  // gated). Next's fetch cache dedupes and revalidates.
  let html: string
  try {
    const res = await fetch(`${url.origin}${path}`, {
      headers: { 'user-agent': 'BalinskyLLM/1.0 (+internal render)', accept: 'text/html' },
      next: { revalidate: 3600 },
    })
    if (res.status === 404) return NextResponse.json({ error: 'not found' }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: 'upstream error', status: res.status }, { status: 502 })
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }

  const doc = htmlToDoc(html, `${url.origin}${path}`, detectLang(path))

  const cache = 'public, s-maxage=3600, stale-while-revalidate=86400'
  if (format === 'json') {
    return NextResponse.json(docToJson(doc), {
      headers: { 'cache-control': cache, 'x-robots-tag': 'noindex', 'x-llm-bot': g.bot ?? '' },
    })
  }
  return new NextResponse(docToMarkdown(doc), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': cache,
      'x-robots-tag': 'noindex',
      'x-llm-bot': g.bot ?? '',
    },
  })
}
