import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

// Slim projection — Mini App only needs the picker label + slug, never the
// full Airtable blob. Pulls every developer in raw_developers regardless of
// whether they have published listings (per spec).
export async function GET() {
  const { data, error } = await sb
    .from('raw_developers')
    .select('airtable_id, name:data->"Имя застройщика", name_alt:data->Developer, logo_url')
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = ((data ?? []) as Array<{ airtable_id: string; name: unknown; name_alt: unknown; logo_url: string | null }>)
    .map(r => ({
      id: r.airtable_id,
      name: pickString(r.name) ?? pickString(r.name_alt) ?? r.airtable_id,
      logo: r.logo_url ?? null,
    }))
    .filter(d => d.name && !d.name.startsWith('rec'))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' } })
}

function pickString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length > 0) return pickString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return pickString((v as { value: unknown }).value)
  return null
}
