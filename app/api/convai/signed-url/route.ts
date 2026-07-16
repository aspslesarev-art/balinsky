// Mints a short-lived signed URL for the browser to open a realtime
// Conversational AI session with the Балина call agent, without exposing the
// ElevenLabs key. The agent has no DB — it gathers the visitor's requirements
// fast; the actual search runs afterwards in the text chat.
import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY
  // Two call agents (ids are public, not secrets): Балина speaks the site's
  // language — Russian on /ru, English on /en. Picked by ?lang.
  const RU_AGENT = 'agent_5001kwgqxtfaed9r9bf3jv11nhm5'
  const EN_AGENT = 'agent_1201kwjv3mfqeyb9bzveh97vnzeb'
  const lang = new URL(req.url).searchParams.get('lang')
  // Only two voice agents exist (RU + EN). Non-RU visitors (en/id/fr) get the
  // English-speaking agent; anything else falls back to the Russian one.
  const agentId = lang === 'en' || lang === 'id' || lang === 'fr' ? EN_AGENT : RU_AGENT
  if (!key) return NextResponse.json({ error: 'convai_unconfigured' }, { status: 503 })
  if (!rateLimit(`convai:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { 'xi-api-key': key } },
    )
    if (!r.ok) return NextResponse.json({ error: 'signed_url_failed' }, { status: 502 })
    const j = await r.json() as { signed_url?: string }
    if (!j.signed_url) return NextResponse.json({ error: 'no_signed_url' }, { status: 502 })
    return NextResponse.json({ signedUrl: j.signed_url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'upstream' }, { status: 502 })
  }
}
