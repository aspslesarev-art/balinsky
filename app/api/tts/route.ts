// Text-to-speech for the ConsultantWidget's voice mode: Балина speaks her
// replies aloud. The ElevenLabs key is scoped to TTS only and stays server-
// side — the browser never sees it. Voice/model are env-overridable so the
// voice can be swapped from the ElevenLabs dashboard without a deploy.
import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Default is a public multilingual ElevenLabs voice (works for Russian via the
// multilingual/turbo models). Override with ELEVENLABS_VOICE_ID once a
// preferred Балина voice is picked in the dashboard.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'
// Turbo v2.5: ~half the character cost and lower latency than multilingual_v2,
// still 32 languages incl. Russian — the right default for a live conversation
// on grant credits.
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_turbo_v2_5'
const MAX_CHARS = 900

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'tts_unconfigured' }, { status: 503 })

  // Abuse guard — unauthenticated endpoint that spends ElevenLabs credits.
  if (!rateLimit(`tts:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let text: string
  try {
    const body = await req.json()
    text = String(body?.text ?? '').replace(/\s+/g, ' ').trim()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 })
  text = text.slice(0, MAX_CHARS)

  let r: Response
  try {
    r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
  } catch {
    return NextResponse.json({ error: 'tts_upstream' }, { status: 502 })
  }
  if (!r.ok) {
    return NextResponse.json({ error: 'tts_failed', status: r.status }, { status: 502 })
  }

  const audio = await r.arrayBuffer()
  return new NextResponse(audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  })
}
