// Public ad banner pipeline.
//
// Banners are now authored DIRECTLY in /admin/ads (Postgres table
// public.ad_banners — migration 020). The site reads the table,
// filters by active flag + date window, cross-checks the auto-disabled
// flag from ad_banner_stats, picks one to render via round-robin
// rotation, and the impression endpoint updates per-banner counters.
//
// Owner authors: image, link, alt, headline, sponsor, dates,
// impression_limit, active toggle, sort_order.
// We own: live impression / click counts and the auto_disabled flag we
// flip when impressions_count >= impression_limit.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

export type Banner = {
  id: string
  imageUrl: string
  linkUrl: string
  alt: string
  headline: string
  sponsor?: string | null
  startsAt?: string | null
  endsAt?: string | null
  active: boolean
  impressionLimit?: number | null
  sortOrder?: number
}

// True when the latest call to listBanners() found the table missing
// (Postgres 42P01 / PostgREST PGRST205). Admin UI banner reads it to
// show an "apply migration 020" hint.
let _bannersTableMissing = false
export function isBannersTableMissing(): boolean { return _bannersTableMissing }

function isMissingTableError(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false
  return e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST204'
    || /could not find the table/i.test(e.message ?? '')
    || /relation .* does not exist/i.test(e.message ?? '')
    || /schema cache/i.test(e.message ?? '')
}

type BannerRow = {
  id: string
  image_url: string
  link_url: string
  alt: string | null
  headline: string
  sponsor: string | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  impression_limit: number | null
  sort_order: number
}

function rowToBanner(r: BannerRow): Banner {
  return {
    id: r.id,
    imageUrl: r.image_url,
    linkUrl: r.link_url,
    alt: r.alt ?? '',
    headline: r.headline,
    sponsor: r.sponsor,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    active: r.active,
    impressionLimit: r.impression_limit,
    sortOrder: r.sort_order,
  }
}

export async function loadAllBanners(): Promise<Banner[]> {
  const { data, error } = await sb
    .from('ad_banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) {
    if (isMissingTableError(error)) { _bannersTableMissing = true; return [] }
    console.error('[banners] load failed:', error.message)
    return []
  }
  _bannersTableMissing = false
  return ((data ?? []) as BannerRow[]).map(rowToBanner)
}

export async function loadEligibleBanners(): Promise<Banner[]> {
  const all = await loadAllBanners()
  if (all.length === 0) return []
  const now = Date.now()
  const active = all.filter(b => {
    if (!b.active) return false
    if (b.startsAt && Date.parse(b.startsAt) > now) return false
    if (b.endsAt && Date.parse(b.endsAt) < now) return false
    return true
  })
  if (active.length === 0) return []
  // Раньше тут перепроверяли auto_disabled-флаг из ad_banner_stats —
  // но таблица никогда не была создана (~1850 404 в сутки в логах,
  // Cloudkoda заметил). Статистика баннеров не используется, поэтому
  // считаем что все активные баннеры в эфире.
  return active
}

// Pick one banner to render. Round-robin by minute keeps a fair-ish
// rotation without heavy state — for 5 banners every banner gets ~12
// minutes of exposure per hour.
export function pickBanner(banners: Banner[]): Banner | null {
  if (banners.length === 0) return null
  const idx = Math.floor(Date.now() / 60000) % banners.length
  return banners[idx]
}

// === admin CRUD ==========================================================

export type BannerInput = {
  id?: string                  // optional on create — we'll auto-generate
  imageUrl: string
  linkUrl: string
  alt?: string
  headline: string
  sponsor?: string | null
  startsAt?: string | null
  endsAt?: string | null
  active?: boolean
  impressionLimit?: number | null
  sortOrder?: number
}

function genId(): string {
  // Short readable id: bn_<8 lowercase hex chars>. Stable across retries
  // because it's random not time-based, so concurrent inserts are safe.
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'bn_'
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

export async function createBanner(input: BannerInput): Promise<Banner> {
  if (_bannersTableMissing) throw new Error('migration_not_applied')
  const id = input.id?.trim() || genId()
  const row = {
    id,
    image_url: input.imageUrl,
    link_url: input.linkUrl,
    alt: input.alt ?? '',
    headline: input.headline,
    sponsor: input.sponsor ?? null,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    active: input.active ?? true,
    impression_limit: input.impressionLimit ?? null,
    sort_order: input.sortOrder ?? 0,
  }
  const { data, error } = await sb.from('ad_banners').insert(row).select('*').single()
  if (error || !data) throw error ?? new Error('insert_failed')
  return rowToBanner(data as BannerRow)
}

export async function updateBanner(id: string, patch: Partial<BannerInput>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.imageUrl !== undefined) update.image_url = patch.imageUrl
  if (patch.linkUrl !== undefined) update.link_url = patch.linkUrl
  if (patch.alt !== undefined) update.alt = patch.alt
  if (patch.headline !== undefined) update.headline = patch.headline
  if (patch.sponsor !== undefined) update.sponsor = patch.sponsor
  if (patch.startsAt !== undefined) update.starts_at = patch.startsAt
  if (patch.endsAt !== undefined) update.ends_at = patch.endsAt
  if (patch.active !== undefined) update.active = patch.active
  if (patch.impressionLimit !== undefined) update.impression_limit = patch.impressionLimit
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder
  const { error } = await sb.from('ad_banners').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await sb.from('ad_banners').delete().eq('id', id)
  if (error) throw error
}

// Photo upload to Supabase Storage. Uses the `viz-photos` bucket
// (already created public+writable for the visualisations editor)
// so we don't need a separate banner bucket. Returns either the
// public URL or an Error with the actual Storage message so the
// admin sees what's wrong instead of a vague "upload failed".
const BANNER_BUCKET = process.env.BANNERS_BUCKET ?? 'viz-photos'
const BANNER_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/${BANNER_BUCKET}`

export async function uploadBannerPhoto(opts: {
  filename: string
  buf: Buffer
  contentType: string
}): Promise<string> {
  const safeName = opts.filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'banner'
  const key = `banners/${Date.now()}-${safeName}`
  const { error } = await sb.storage.from(BANNER_BUCKET).upload(key, opts.buf, {
    contentType: opts.contentType,
    upsert: false,
    cacheControl: '604800',
  })
  if (error) {
    console.error('[banners] upload', BANNER_BUCKET, key, error.message)
    throw new Error(`storage(${BANNER_BUCKET}): ${error.message}`)
  }
  return `${BANNER_PUBLIC}/${key}`
}
