// Dynamic OG image for /ru/villy/o/<slug>. Next.js auto-discovers
// opengraph-image.tsx and emits a <meta property="og:image"> on the
// route's metadata. EN twin reads through this same route via the
// canonical (alternates.languages), so no second file needed for /en.

import { createClient } from '@supabase/supabase-js'
import { renderOgImage, ogSize, ogContentType } from '@/lib/og-image'
import { cdnBucketBase } from '@/lib/photo-cdn'

export const size = ogSize
export const contentType = ogContentType
export const runtime = 'nodejs'
// Sub-routes that miss generateStaticParams (we always do) need the
// route segment marked dynamic so the OG render runs per-request.
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}

function cleanTitle(s: string | null): string | null {
  if (!s) return null
  return s.replace(/\s*\|\s*Balinsky.*$/i, '').trim() || null
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await sb
    .from('raw_villas')
    .select('airtable_id, data')
    .eq('data->>SEO:Slug', slug)
    .maybeSingle()
  const d = (data?.data ?? {}) as Record<string, unknown>

  const title = cleanTitle(firstString(d['SEO:Title EN'])) ?? cleanTitle(firstString(d['SEO:Title'])) ?? 'Villa for sale in Bali'
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const bedrooms = firstString(d['Спальни'])
  const area = firstString(d['Площадь'])
  const priceUsd = firstString(d['price_usd']) ?? firstString(d['Цена'])
  const photoUrl = data?.airtable_id
    ? `${cdnBucketBase('villa-photos')}/${data.airtable_id}/0.jpg`
    : null

  const facts = [
    priceUsd ? { label: 'Price', value: `$${Math.round(Number(priceUsd) / 1000)}K` } : null,
    bedrooms ? { label: 'Bedrooms', value: bedrooms } : null,
    area ? { label: 'House', value: `${area} m²` } : null,
    district ? { label: 'District', value: district } : null,
  ].filter((f): f is { label: string; value: string } => f != null)

  return renderOgImage({
    title,
    subtitle: district ? `${district}, Bali · Villa for sale` : 'Villa for sale in Bali',
    photoUrl,
    facts,
  })
}
