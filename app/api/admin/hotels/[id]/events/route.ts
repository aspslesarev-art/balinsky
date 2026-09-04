import { requireAdmin } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import { listEvents } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function cell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// GET /api/admin/hotels/:id/events?days=30 — журнал за период таблицей (ТЗ 4.10).
// Отдаём CSV, а не JSON: этот файл открывают в Google Sheets, а не читают кодом.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const events = await listEvents(Number(id), since)

  const rows = [['created_at', 'type', 'room_id', 'stay_id', 'lang', 'context']]
  for (const e of events) {
    rows.push([
      e.created_at, e.type, String(e.room_id ?? ''), String(e.stay_id ?? ''), e.lang ?? '',
      Object.entries(e.ctx ?? {}).map(([k, v]) => `${k}=${v}`).join(' '),
    ])
  }

  // BOM — иначе Excel открывает кириллицу в заявках кракозябрами.
  const csv = '﻿' + rows.map(r => r.map(cell).join(',')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hotel-${id}-events-${days}d.csv"`,
    },
  })
}
