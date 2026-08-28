// Speech-to-text endpoint for the ConsultantWidget's voice input.
// Receives raw audio blob (browser MediaRecorder output, usually WebM/
// Opus or MP4/AAC depending on UA), forwards to Azure OpenAI's
// gpt-4o-transcribe deployment (eastus2 resource — the model isn't
// in eastus where chat lives), returns plain { text }.
//
// Logs usage so /admin/usage tracks transcription cost. We don't have
// the exact audio duration from the API response, so we estimate from
// the blob size — OPUS @ ~32 kbps ≈ 4 KB/s. Good enough for cost
// tracking; the actual transcribe price is metered server-side by
// Azure regardless.

import { NextResponse } from 'next/server'
import type OpenAI from 'openai'
import { openaiClient, TRANSCRIBE_MODEL } from '@/lib/openai'
import { logUsage, overDailySpendCap } from '@/lib/usage-tracker'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { CONSULTANT_ENABLED, consultantDisabledResponse } from '@/lib/consultant-flag'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function buildClient(): { client: OpenAI; deployment: string } | null {
  const apiKey = process.env.OPENAI_API_KEY
  const deployment = TRANSCRIBE_MODEL
  if (!apiKey) return null
  return { client: openaiClient()!, deployment }
}

export async function POST(req: Request) {
  // Консультант выключен глобально (lib/consultant-flag.ts): отвечаем сразу,
  // не трогая OpenAI / ElevenLabs — платные вызовы не уходят.
  if (!CONSULTANT_ENABLED) return consultantDisabledResponse()
  // Abuse guards — unauthenticated paid (Azure transcribe) endpoint.
  if (!rateLimit(`transcribe:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  if (await overDailySpendCap()) {
    return NextResponse.json({ error: 'temporarily_unavailable' }, { status: 503 })
  }

  const built = buildClient()
  if (!built) return NextResponse.json({ error: 'transcribe_not_configured' }, { status: 500 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'no_form' }, { status: 400 })
  const file = form.get('audio')
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_audio' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'empty_audio' }, { status: 400 })
  // 25 MB matches OpenAI's documented per-request audio cap; on Vercel
  // the body parser stops well below this anyway.
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'audio_too_large' }, { status: 413 })

  try {
    const r = await built.client.audio.transcriptions.create({
      file,
      model: built.deployment,
    })
    const text = (r.text ?? '').trim()
    logUsage({
      feature: 'transcribe',
      deployment: built.deployment,
      audioSeconds: Math.max(1, Math.round(file.size / 4000)),
      meta: { source: 'web' },
    })
    return NextResponse.json({ text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'transcribe_failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
