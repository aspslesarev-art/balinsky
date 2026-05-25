import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Раньше тут писали клики в Supabase-таблицы ad_banner_stats /
// ad_banner_daily — но они никогда не были созданы (Cloudkoda насчитал
// ~1850 404 в сутки от impression+click endpoint'ов вместе), а
// статистика баннеров не используется в продакшене. Endpoint оставлен,
// чтобы клиент не падал на 404. См. также /api/ad/impression.
export async function POST(req: Request) {
  let body: { banner_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const id = body.banner_id?.trim()
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })
  return NextResponse.json({ ok: true })
}
