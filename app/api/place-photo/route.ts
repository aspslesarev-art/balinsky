import { NextResponse } from 'next/server'

// Streams a Google Places photo by its resource name so the browser never
// sees a key. `GOOGLE_PLACES_KEY` is the dedicated server key — the public
// maps key is referrer-locked and 403s on server-side Places calls.
//
// Every response is cached hard at the edge: a photo for a given resource
// name never changes, and Places photo media is billed per request.
const NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/
const MAX_PX = 800
const CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get('name') ?? ''
  // Anchored allowlist, not a substring check: this value is pasted straight
  // into an outbound URL and would otherwise be an SSRF hole.
  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: 'bad photo name' }, { status: 400 })
  }
  const key = process.env.GOOGLE_PLACES_KEY
  if (!key) return NextResponse.json({ error: 'not configured' }, { status: 503 })

  const upstream = `https://places.googleapis.com/v1/${name}/media`
    + `?maxHeightPx=${MAX_PX}&maxWidthPx=${MAX_PX}&key=${encodeURIComponent(key)}`

  try {
    const r = await fetch(upstream, { redirect: 'follow', next: { revalidate: 2592000 } })
    if (!r.ok || !r.body) return NextResponse.json({ error: 'upstream' }, { status: 502 })
    return new NextResponse(r.body, {
      status: 200,
      headers: {
        'content-type': r.headers.get('content-type') ?? 'image/jpeg',
        'cache-control': CACHE,
      },
    })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }
}
