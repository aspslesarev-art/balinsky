import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Entry point for the Telegram mini-app: marks the session as "we're inside
// Telegram's WebView" via a cookie, then bounces to the regular site. The
// cookie is read in app/layout.tsx to add a top offset so the bot's close /
// expand controls don't sit on top of our header.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const target = new URL('/ru', url.origin)
  // Preserve any query the bot may forward (e.g. ?startapp=…)
  for (const [k, v] of url.searchParams) target.searchParams.set(k, v)

  const res = NextResponse.redirect(target)
  // Session cookie: dies when Telegram closes the WebView.
  res.cookies.set('tma', '1', { path: '/', sameSite: 'lax' })
  return res
}
