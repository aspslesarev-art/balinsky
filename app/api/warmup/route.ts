import { NextResponse } from 'next/server'

// Hit by external cron to keep the catalog lambdas warm. On Vercel each
// route is its own serverless function with its own memory — so we have
// to actually request the page URLs (not just call data fetchers locally,
// which would only warm this lambda).
export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const targets = [
    '/ru',
    '/ru/villy',
    '/ru/apartamenty',
    '/ru/zhilye-kompleksy',
    '/ru/zastrojshhiki',
    '/ru/villy/karta',
    '/ru/apartamenty/karta',
    '/ru/zhilye-kompleksy/karta',
  ]
  const start = Date.now()
  const results = await Promise.allSettled(
    targets.map(async path => {
      const t0 = Date.now()
      const res = await fetch(`${origin}${path}`, { cache: 'no-store' })
      await res.arrayBuffer()
      return { path, status: res.status, ms: Date.now() - t0 }
    }),
  )
  const summary = results.map(r =>
    r.status === 'fulfilled' ? r.value : { error: String(r.reason) },
  )
  return NextResponse.json({ elapsed_ms: Date.now() - start, summary })
}
