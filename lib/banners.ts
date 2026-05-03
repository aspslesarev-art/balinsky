// Public ad banner pipeline.
//
// Banners are authored in Airtable; scripts/sync-banners.mjs copies them
// into Supabase Storage as `assets/_banners.json`. The site reads that
// manifest, picks one banner to render, and the impression endpoint
// updates per-banner counters in ad_banner_stats / ad_banner_daily.
//
// Airtable owns: image, link, alt, headline, sponsor, dates,
// impression_limit, active toggle.
// We own: live impression / click counts and the auto_disabled flag we
// flip when impressions_count >= impression_limit.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/assets/_banners.json`

export type Banner = {
  id: string
  imageUrl: string
  linkUrl: string
  alt: string
  headline: string         // short selling line, ~6-10 words
  sponsor?: string | null  // small grey "от <Sponsor>"
  startsAt?: string | null
  endsAt?: string | null
  active: boolean          // Airtable manual toggle
  impressionLimit?: number | null
}

type Manifest = { generatedAt: string; banners: Banner[] }

export async function loadAllBanners(): Promise<Banner[]> {
  try {
    const r = await fetch(MANIFEST_URL, { next: { revalidate: 300, tags: ['ads'] } })
    if (!r.ok) return []
    const j = await r.json() as Manifest
    return Array.isArray(j.banners) ? j.banners : []
  } catch {
    return []
  }
}

export async function loadEligibleBanners(): Promise<Banner[]> {
  const all = await loadAllBanners()
  if (all.length === 0) return []
  const now = Date.now()
  // Filter by Airtable active flag + date window. The auto_disabled flag
  // is checked separately against ad_banner_stats so the manifest can
  // stay 100% Airtable-controlled.
  const active = all.filter(b => {
    if (!b.active) return false
    if (b.startsAt && Date.parse(b.startsAt) > now) return false
    if (b.endsAt && Date.parse(b.endsAt) < now) return false
    return true
  })
  if (active.length === 0) return []
  // Cross-check the live disabled flags from Postgres in one query.
  try {
    const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)
    const { data } = await sb
      .from('ad_banner_stats')
      .select('banner_id, auto_disabled')
      .in('banner_id', active.map(b => b.id))
    const disabled = new Set(
      ((data ?? []) as { banner_id: string; auto_disabled: boolean }[])
        .filter(r => r.auto_disabled)
        .map(r => r.banner_id),
    )
    return active.filter(b => !disabled.has(b.id))
  } catch {
    return active
  }
}

// Pick one banner to render. Round-robin by minute keeps a fair-ish
// rotation without heavy state — for 5 banners every banner gets ~12
// minutes of exposure per hour.
export function pickBanner(banners: Banner[]): Banner | null {
  if (banners.length === 0) return null
  const idx = Math.floor(Date.now() / 60000) % banners.length
  return banners[idx]
}
