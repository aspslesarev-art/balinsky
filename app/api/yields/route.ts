// Доходность до налогов для избранного — та же цифра, что на странице объекта
// (listing_yields, scripts/build-listing-yields.ts). Избранное хранит снимок
// с момента сохранения; без этой сверки в сравнении жили старые цифры.
//   GET /api/yields?v=slug,slug&a=slug  (или airtable id вместо slug)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const TABLE = { villa: 'raw_villas', apartment: 'raw_apartments' } as const
const MAX = 100

function keys(v: string | null): string[] {
  return [...new Set((v ?? '').split(',').map(s => s.trim()).filter(s => /^[\w-]{1,200}$/.test(s)))].slice(0, MAX)
}

async function forKind(kind: 'villa' | 'apartment', wanted: string[]): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {}
  if (!wanted.length) return out
  // Ключ — slug или airtable id: старые сохранения id не хранят.
  const [byId, bySlug] = await Promise.all([
    sb.from(TABLE[kind]).select('airtable_id').in('airtable_id', wanted),
    sb.from(TABLE[kind]).select('airtable_id, slug:data->>"SEO:Slug", pub:data->>"Опубликовать"').in('data->>"SEO:Slug"', wanted),
  ])
  if (byId.error) throw new Error(byId.error.message)
  if (bySlug.error) throw new Error(bySlug.error.message)
  const idOf = new Map<string, string>()
  for (const r of byId.data ?? []) idOf.set(String(r.airtable_id), String(r.airtable_id))
  // Слаг не уникален — берём опубликованную запись.
  for (const r of (bySlug.data ?? []).sort((a, b) => Number(b.pub === 'true') - Number(a.pub === 'true'))) {
    if (!idOf.has(String(r.slug))) idOf.set(String(r.slug), String(r.airtable_id))
  }
  const ids = [...new Set(idOf.values())]
  const { data, error } = ids.length
    ? await sb.from('listing_yields').select('airtable_id, cap_before, mode').eq('kind', kind).in('airtable_id', ids)
    : { data: [], error: null }
  if (error) throw new Error(error.message)
  const cap = new Map((data ?? []).filter(r => r.mode === 'daily').map(r => [String(r.airtable_id), r.cap_before != null ? Number(r.cap_before) : null]))
  for (const k of wanted) { const id = idOf.get(k); out[k] = id ? cap.get(id) ?? null : null }
  return out
}

export async function GET(req: Request) {
  const u = new URL(req.url)
  try {
    const [villa, apartment] = await Promise.all([forKind('villa', keys(u.searchParams.get('v'))), forKind('apartment', keys(u.searchParams.get('a')))])
    return NextResponse.json({ villa, apartment }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
  } catch (e) {
    console.error('[api/yields]', e)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
