import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// POST { banner_id } — fired by the banner click handler before navigation.
export async function POST(req: Request) {
  let body: { banner_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const id = body.banner_id?.trim()
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await sb
    .from('ad_banner_stats')
    .select('clicks_count')
    .eq('banner_id', id)
    .maybeSingle()
  await sb.from('ad_banner_stats').upsert({
    banner_id: id,
    clicks_count: (existing?.clicks_count ?? 0) + 1,
    last_click_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  const { data: dayRow } = await sb
    .from('ad_banner_daily')
    .select('clicks_count')
    .eq('banner_id', id)
    .eq('day', today)
    .maybeSingle()
  await sb.from('ad_banner_daily').upsert({
    banner_id: id,
    day: today,
    clicks_count: (dayRow?.clicks_count ?? 0) + 1,
  })

  return NextResponse.json({ ok: true })
}
