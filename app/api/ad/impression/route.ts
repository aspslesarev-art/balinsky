import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Раньше тут писали показы в Supabase-таблицы ad_banner_stats /
// ad_banner_daily — но они никогда не были созданы (Cloudkoda
// насчитал ~1850 404 в сутки от этого endpoint'а), а статистика
// баннеров не используется в продакшене. Endpoint оставлен, чтобы
// клиент не падал на 404 (impressions трекаются HEAD-инициализацией
// в браузере), но ничего не пишет. Если когда-нибудь захотим
// статистику — добавить миграцию + развернуть код обратно.
export async function POST(req: Request) {
  let body: { banner_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const id = body.banner_id?.trim()
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })
  return NextResponse.json({ ok: true, auto_disabled: false })
}
