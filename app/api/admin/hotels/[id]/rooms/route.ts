import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createRooms, listRooms, rotateRoomToken, setRoomActive } from '@/lib/hotel/db'
import { newRoomToken } from '@/lib/hotel/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BATCH = 300

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  return NextResponse.json({ rooms: await listRooms(Number(id)) })
}

// POST — завести номера пачкой: в поле вставляют список с планировки,
// по номеру на строку.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { labels?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const labels = (body.labels ?? []).map(l => String(l).trim()).filter(Boolean).slice(0, MAX_BATCH)
  if (labels.length === 0) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const created = await createRooms(Number(id), labels, () => newRoomToken())
  return NextResponse.json({ ok: true, created })
}

// PATCH — включить/выключить номер или перевыпустить токен (старая наклейка
// после этого ведёт в никуда — на случай, если QR утёк в чат гостей).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { roomId?: number; active?: boolean; rotate?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.roomId) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  if (body.active !== undefined) await setRoomActive(Number(id), body.roomId, body.active)
  if (body.rotate) await rotateRoomToken(Number(id), body.roomId, newRoomToken())
  return NextResponse.json({ ok: true })
}
