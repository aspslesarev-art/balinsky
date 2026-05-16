import { createClient } from '@supabase/supabase-js'
import { renderOgImage, ogSize, ogContentType } from '@/lib/og-image'

export const size = ogSize
export const contentType = ogContentType
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return null
}
function cleanTitle(s: string | null): string | null {
  return s ? s.replace(/\s*\|\s*Balinsky.*$/i, '').trim() || null : null
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await sb
    .from('raw_apartments')
    .select('airtable_id, data')
    .eq('data->>SEO:Slug', slug)
    .maybeSingle()
  const d = (data?.data ?? {}) as Record<string, unknown>

  const title = cleanTitle(firstString(d['SEO:Title EN'])) ?? cleanTitle(firstString(d['SEO:Title'])) ?? 'Apartment for sale in Bali'
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const bedrooms = firstString(d['Спальни']) ?? firstString(d['Bedrooms'])
  const area = firstString(d['Площадь'])
  const floor = firstString(d['Этаж'])
  const priceUsd = firstString(d['price_usd']) ?? firstString(d['Цена'])
  const photoUrl = data?.airtable_id
    ? `${SUPABASE_URL}/storage/v1/object/public/apartment-photos/${data.airtable_id}/0.jpg`
    : null

  const facts = [
    priceUsd ? { label: 'Price', value: `$${Math.round(Number(priceUsd) / 1000)}K` } : null,
    bedrooms ? { label: 'Bedrooms', value: bedrooms } : null,
    area ? { label: 'Area', value: `${area} m²` } : null,
    floor ? { label: 'Floor', value: floor } : (district ? { label: 'District', value: district } : null),
  ].filter((f): f is { label: string; value: string } => f != null)

  return renderOgImage({
    title,
    subtitle: district ? `${district}, Bali · Apartment for sale` : 'Apartment for sale in Bali',
    photoUrl,
    facts,
  })
}
