// Mints a short-lived signed URL for the browser to open a realtime
// Conversational AI session with the Балина call agent, without exposing the
// ElevenLabs key. The agent has no DB — it gathers the visitor's requirements
// fast; the actual search runs afterwards in the text chat.
import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// One multilingual agent (id is public, not a secret). It used to be two —
// Russian and English — which meant a Chinese or German visitor got greeted in
// Russian. The agent runs on eleven_turbo_v2_5, which covers every language the
// site speaks, so the caller's language is now a per-session override the
// browser sends instead of a choice between two fixed agents.
const AGENT_ID = 'agent_5001kwgqxtfaed9r9bf3jv11nhm5'

export async function GET(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) return NextResponse.json({ error: 'convai_unconfigured' }, { status: 503 })
  if (!rateLimit(`convai:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(AGENT_ID)}`,
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
