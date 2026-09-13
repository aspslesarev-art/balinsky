import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { cancelBooking } from '@/lib/meetings/booking'
import { saveSettings, setDayDistrict } from '@/lib/meetings/store'
import type { District, MeetingSettings } from '@/lib/meetings/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const KEY_RE = /^[a-z0-9-]{1,40}$/
const UUID_RE = /^[0-9a-f-]{36}$/i

function int(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null
}

function parseSettings(raw: unknown): MeetingSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const workDays = Array.isArray(s.workDays) ? s.workDays.filter(d => int(d, 1, 7) !== null) as number[] : null
  const districts = Array.isArray(s.districts)
    ? (s.districts as Array<Record<string, unknown>>).map((d): District | null => {
        const key = typeof d.key === 'string' && KEY_RE.test(d.key) ? d.key : null
        const ru = typeof d.ru === 'string' ? d.ru.trim().slice(0, 60) : ''
        const en = typeof d.en === 'string' ? d.en.trim().slice(0, 60) : ''
        const travelMin = int(d.travelMin, 0, 300)
        return key && ru && en && travelMin !== null ? { key, ru, en, travelMin } : null
      })
    : null
  const parsed = {
    workDays,
    workStart: typeof s.workStart === 'string' && HHMM.test(s.workStart) ? s.workStart : null,
    workEnd: typeof s.workEnd === 'string' && HHMM.test(s.workEnd) ? s.workEnd : null,
    onlineMin: int(s.onlineMin, 15, 240),
    offlineMin: int(s.offlineMin, 15, 240),
    bufferMin: int(s.bufferMin, 0, 120),
    sameDistrictGapMin: int(s.sameDistrictGapMin, 0, 180),
    stepMin: int(s.stepMin, 15, 120),
    minNoticeMin: int(s.minNoticeMin, 0, 7 * 24 * 60),
    horizonDays: int(s.horizonDays, 1, 90),
    districts,
  }
  if (Object.values(parsed).some(v => v === null)) return null
  if (!districts || districts.some(d => d === null) || districts.length === 0) return null
  if (new Set(districts.map(d => d!.key)).size !== districts.length) return null
  if (parsed.workStart! >= parsed.workEnd!) return null
  return parsed as MeetingSettings
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  try {
    if (body.action === 'settings') {
      const settings = parseSettings(body.settings)
      if (!settings) return NextResponse.json({ ok: false, error: 'bad_settings' }, { status: 400 })
      await saveSettings(settings)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'day') {
      const day = typeof body.day === 'string' && DATE_RE.test(body.day) ? body.day : null
      const district = body.district === null ? null : typeof body.district === 'string' && KEY_RE.test(body.district) ? body.district : undefined
      if (!day || district === undefined) return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 })
      await setDayDistrict(day, district)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'cancel') {
      const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null
      if (!id) return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 })
      const b = await cancelBooking(id)
      return NextResponse.json({ ok: true, cancelled: !!b })
    }
    return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 })
  } catch (e) {
    console.error('[admin/meetings]', e)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
