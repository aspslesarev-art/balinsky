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

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await sb
    .from('raw_complexes')
    .select('airtable_id, data, slug, cover_url')
    .eq('slug', slug)
    .maybeSingle()
  const d = (data?.data ?? {}) as Record<string, unknown>

  const name = firstString(d['Project']) ?? 'Residential complex in Bali'
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const types = firstString(d['Типы юнитов'])
  const year = firstString(d['Year of completion']) ?? firstString(d['Year of completion '])
  const photoUrl = data?.cover_url
    ?? (data?.airtable_id ? `${SUPABASE_URL}/storage/v1/object/public/complex-photos/${data.airtable_id}/0.jpg` : null)

  const facts = [
    district ? { label: 'District', value: district } : null,
    year ? { label: 'Completion', value: year } : null,
    types ? { label: 'Units', value: types.slice(0, 18) } : null,
  ].filter((f): f is { label: string; value: string } => f != null)

  return renderOgImage({
    title: `${name} — Bali residential complex`,
    subtitle: district ? `${district}, Bali · Residential complex` : 'Residential complex in Bali',
    photoUrl,
    facts,
  })
}
