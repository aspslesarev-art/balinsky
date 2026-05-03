import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadAllBanners } from '@/lib/banners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// POST { banner_id }
// Increments lifetime + per-day counters; flips auto_disabled when the
// contracted impression limit is reached so the banner stops appearing.
export async function POST(req: Request) {
  let body: { banner_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const id = body.banner_id?.trim()
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  // Lifetime row (upsert)
  const { data: existing } = await sb
    .from('ad_banner_stats')
    .select('impressions_count, auto_disabled')
    .eq('banner_id', id)
    .maybeSingle()
  const nextCount = (existing?.impressions_count ?? 0) + 1

  // Pull the banner's contracted limit from the manifest (Airtable owns it)
  // — if the new total >= limit, mark auto_disabled so the next manifest
  // load drops it from rotation.
  const banners = await loadAllBanners()
  const banner = banners.find(b => b.id === id)
  const limit = banner?.impressionLimit ?? null
  const auto_disabled = limit != null && nextCount >= limit

  await sb.from('ad_banner_stats').upsert({
    banner_id: id,
    impressions_count: nextCount,
    last_impression_at: new Date().toISOString(),
    auto_disabled,
    updated_at: new Date().toISOString(),
  })

  // Per-day breakdown — upsert + manual increment via RPC isn't worth
  // the extra moving part for this scale; do a read-modify-write.
  const { data: dayRow } = await sb
    .from('ad_banner_daily')
    .select('impressions_count')
    .eq('banner_id', id)
    .eq('day', today)
    .maybeSingle()
  await sb.from('ad_banner_daily').upsert({
    banner_id: id,
    day: today,
    impressions_count: (dayRow?.impressions_count ?? 0) + 1,
  })

  return NextResponse.json({ ok: true, auto_disabled })
}
