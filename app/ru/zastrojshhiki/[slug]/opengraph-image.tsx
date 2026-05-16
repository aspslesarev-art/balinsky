import { createClient } from '@supabase/supabase-js'
import { renderOgImage, ogSize, ogContentType } from '@/lib/og-image'

export const size = ogSize
export const contentType = ogContentType
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await sb
    .from('raw_developers')
    .select('airtable_id, data, logo_url')
    .eq('data->>SEO:Slug', slug)
    .maybeSingle()
  const d = (data?.data ?? {}) as Record<string, unknown>

  const name = firstString(d['Developer']) ?? firstString(d['Name']) ?? 'Bali developer'
  const ratingRaw = firstString(d['Общий рейтинг'])
  const ratingNum = ratingRaw ? Number.parseFloat(ratingRaw) : NaN
  const rating = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : null
  const completed = firstString(d['Сданные проекты'])
  const inProgress = firstString(d['Активные проекты'])

  const facts = [
    rating ? { label: 'Rating', value: `${rating} / 5` } : null,
    completed ? { label: 'Completed', value: completed } : null,
    inProgress ? { label: 'Active', value: inProgress } : null,
  ].filter((f): f is { label: string; value: string } => f != null)

  return renderOgImage({
    title: `${name} — Bali developer`,
    subtitle: 'Verified developer · Bali real estate',
    photoUrl: data?.logo_url ?? null,
    facts,
  })
}
