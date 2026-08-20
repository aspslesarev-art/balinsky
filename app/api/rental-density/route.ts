import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Ставки соседей для шкалы под ползунком ADR.
//
// Отдаём именно цены, а не карточки: полоске нужно показать, в каких
// промежутках рядом вообще кто-то сдаёт, чтобы человек видел, куда
// тянуть ползунок. Источник тот же, что у блока «что рядом сдают», —
// иначе полоска говорила бы «никого», когда карточки ниже показывают
// объекты, а это ровно то, что путало.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const DEFAULT_RADIUS = 1000
const MAX_RADIUS = 3000
const LIMIT = 500
// Границы правдоподобия ставки за ночь: в данных Booking попадаются
// нули и разовые выбросы в тысячи долларов, они бы растянули шкалу.
const PRICE_MIN = 5
const PRICE_MAX = 5000

function num(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const q = new URL(req.url).searchParams
  const lat = num(q.get('lat'))
  const lng = num(q.get('lng'))
  const radiusRaw = num(q.get('radius')) ?? DEFAULT_RADIUS
  const radius = Math.min(MAX_RADIUS, Math.max(300, radiusRaw))

  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ ok: false, error: 'bad_params' }, { status: 400 })
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data, error } = await sb.rpc('booking_data_price_comps', {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radius,
      p_price_min: PRICE_MIN,
      p_price_max: PRICE_MAX,
      p_limit: LIMIT,
    })
    if (error) throw new Error(error.message)

    const prices = ((data ?? []) as Array<{ price: number | null }>)
      .map(r => (r.price == null ? null : Number(r.price)))
      .filter((p): p is number => p !== null && Number.isFinite(p) && p > 0)

    const res = NextResponse.json({ ok: true, radius, prices })
    res.headers.set('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res
  } catch (e) {
    console.error('[rental-density]', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 502 })
  }
}
