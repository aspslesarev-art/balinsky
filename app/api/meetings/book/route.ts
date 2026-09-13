import { NextResponse } from 'next/server'
import { createBooking } from '@/lib/meetings/booking'
import { GoogleNotConnectedError } from '@/lib/meetings/google'
import { hhmmToMin } from '@/lib/meetings/slots'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_MAX = 5
const RATE_WINDOW_MS = 10 * 60_000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s && s.length <= max ? s : null
}

export async function POST(req: Request) {
  if (!rateLimit(`meet-book:${clientIp(req)}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  const date = str(body.date, 10)
  const time = str(body.time, 5)
  const format = body.format === 'online' || body.format === 'offline' ? body.format : null
  const district = format === 'offline' ? str(body.district, 40) : null
  const name = str(body.name, 120)
  const email = str(body.email, 200)
  const contact = typeof body.contact === 'string' ? str(body.contact, 120) : null
  const comment = typeof body.comment === 'string' ? str(body.comment, 1000) : null
  const lang = body.lang === 'en' ? 'en' : 'ru'

  if (!date || !DATE_RE.test(date) || !time || !TIME_RE.test(time) || !format || !name || !email) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }
  if (format === 'offline' && !district) return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: 'bad_email' }, { status: 400 })

  try {
    const result = await createBooking({ date, start: hhmmToMin(time), format, district, name, email, contact, comment, lang })
    if (!result.ok) {
      const status = result.error === 'slot_taken' ? 409 : 502
      return NextResponse.json({ ok: false, error: result.error }, { status })
    }
    const b = result.booking
    return NextResponse.json({
      ok: true,
      booking: { id: b.id, start_at: b.start_at, end_at: b.end_at, format: b.format, district: result.districtName, meet_url: b.meet_url },
    })
  } catch (e) {
    const notConnected = e instanceof GoogleNotConnectedError
    console.error('[meetings/book]', e)
    return NextResponse.json({ ok: false, error: notConnected ? 'calendar_not_connected' : 'server' }, { status: 503 })
  }
}
