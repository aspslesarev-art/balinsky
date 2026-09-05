import { NextResponse } from 'next/server'

// Resolves a Google Places photo to its CDN URL and redirects the browser
// there, so the image bytes never pass through our origin. `GOOGLE_PLACES_KEY`
// is the dedicated server key — the public maps key is referrer-locked and
// 403s on server-side Places calls.
//
// Do NOT stream the image through this route and do NOT put `next: { revalidate }`
// on the upstream fetch: that buffers whole JPEGs into the Next.js Data Cache,
// which on Vercel is billed as ISR Writes and OOMs the function under load.
// The redirect is cached at the edge instead, so repeat views cost nothing.
const NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/
const MAX_PX = 800
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
/** Google serves photo media from these hosts; anything else is an open redirect. */
const ALLOWED_HOST = /(^|\.)(googleusercontent\.com|ggpht\.com|google\.com)$/

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get('name') ?? ''
  // Anchored allowlist, not a substring check: this value is pasted straight
  // into an outbound URL and would otherwise be an SSRF hole.
  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: 'bad photo name' }, { status: 400 })
  }
  const key = process.env.GOOGLE_PLACES_KEY
  if (!key) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  // `skipHttpRedirect` returns the media URL as JSON instead of the image body.
  const upstream = `https://places.googleapis.com/v1/${name}/media`
    + `?maxHeightPx=${MAX_PX}&maxWidthPx=${MAX_PX}&skipHttpRedirect=true`
    + `&key=${encodeURIComponent(key)}`

  try {
    const r = await fetch(upstream, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ error: 'upstream' }, { status: 502 })

    const photoUri: unknown = (await r.json())?.photoUri
    if (typeof photoUri !== 'string') {
      return NextResponse.json({ error: 'upstream' }, { status: 502 })
    }
    // Never redirect somewhere Google did not name.
    const target = new URL(photoUri)
    if (target.protocol !== 'https:' || !ALLOWED_HOST.test(target.hostname)) {
      return NextResponse.json({ error: 'upstream' }, { status: 502 })
    }

    return NextResponse.redirect(target, {
      status: 302,
      headers: { 'cache-control': CACHE },
    })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
