import { NextResponse } from 'next/server'
import { computeAvailability } from '@/lib/meetings/availability'
import { GoogleNotConnectedError } from '@/lib/meetings/google'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_MAX = 60
const RATE_WINDOW_MS = 60_000

export async function GET(req: Request) {
  if (!rateLimit(`meet-avail:${clientIp(req)}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }
  try {
    const { settings, days } = await computeAvailability()
    return NextResponse.json({
      ok: true,
      onlineMin: settings.onlineMin,
      offlineMin: settings.offlineMin,
      // Время в пути наружу не отдаём — гостю это ни к чему.
      districts: settings.districts.map(({ key, ru, en }) => ({ key, ru, en })),
      days,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    // Без календаря не видно занятость — лучше закрыть запись, чем выдать занятые слоты.
    const notConnected = e instanceof GoogleNotConnectedError
    console.error('[meetings/availability]', e)
    return NextResponse.json({ ok: false, error: notConnected ? 'calendar_not_connected' : 'server' }, { status: 503 })
  }
}
