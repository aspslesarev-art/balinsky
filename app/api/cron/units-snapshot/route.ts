import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Daily snapshot of unit availability per complex → unit_availability_daily.
// Aggregates parser_units by complex + status so we can chart how many
// units were available vs sold over time and infer when deals closed.
// Auth: Bearer CRON_SECRET (same as the other cron hooks).
const STATUS_COL: Record<string, 'available' | 'reserved' | 'sold' | 'blocked' | 'resale'> = {
  'Доступна': 'available',
  'Бронь': 'reserved',
  'Продана': 'sold',
  'Блок': 'blocked',
  'Resale': 'resale',
}

type Agg = { complex_name: string; source: string; available: number; reserved: number; sold: number; blocked: number; resale: number; total: number }

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return NextResponse.json({ ok: false, error: 'no_secret' }, { status: 500 })
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const agg = new Map<string, Agg>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('parser_units').select('data').range(from, from + 999)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    for (const r of data) {
      const d = (r.data ?? {}) as Record<string, unknown>
      const cid = d['complex_id']
      if (typeof cid !== 'string') continue
      const source = typeof d['source'] === 'string' ? (d['source'] as string) : 'lb_group'
      const key = `${cid}::${source}`
      const a = agg.get(key) ?? { complex_name: '', source, available: 0, reserved: 0, sold: 0, blocked: 0, resale: 0, total: 0 }
      const col = STATUS_COL[String(d['Статус'])]
      if (col) a[col]++
      a.total++
      if (typeof d['Комплекс'] === 'string') a.complex_name = d['Комплекс'] as string
      agg.set(key, a)
    }
    if (data.length < 1000) break
  }

  const snapshot_date = new Date().toISOString().slice(0, 10)
  const rows = [...agg.entries()].map(([key, v]) => {
    const complex_id = key.split('::')[0]
    return { snapshot_date, complex_id, source: v.source, complex_name: v.complex_name, available: v.available, reserved: v.reserved, sold: v.sold, blocked: v.blocked, resale: v.resale, total: v.total }
  })
  if (rows.length) {
    const { error } = await sb.from('unit_availability_daily').upsert(rows, { onConflict: 'snapshot_date,complex_id,source' })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, date: snapshot_date, complexes: rows.length })
}
