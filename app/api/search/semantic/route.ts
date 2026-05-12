// Public semantic-search endpoint for the catalog.
//
//   POST /api/search/semantic
//   body: { query: string, limit?: number, kinds?: ('villa'|'apartment'|'complex')[] }
//
// Returns hydrated cards — slug, title, district, price, photo — so
// the client can render results directly without a second round trip.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { semanticSearch, type SemanticHit } from '@/lib/semantic-search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type Card = {
  kind: 'villa' | 'apartment' | 'complex'
  airtable_id: string
  slug: string | null
  title: string
  district: string | null
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
  photo: string | null
  distance: number
  href: string
}

function fs1(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return fs1(v[0])
  if (v && typeof v === 'object' && 'value' in v) return fs1((v as { value: unknown }).value)
  return null
}
function num1(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const n = Number(v.replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null }
  if (Array.isArray(v) && v.length) return num1(v[0])
  return null
}

function cleanTitle(s: string | null): string | null {
  if (!s) return null
  return s.replace(/\s*\|\s*Balinsky\s*$/i, '').trim() || null
}

type HydratedRow = { airtable_id: string; data: Record<string, unknown>; slug?: string | null; cover_url?: string | null }
type Manifest = Record<string, string[]>

async function fetchManifest(url: string): Promise<Manifest> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return {}
    return (await r.json()) as Manifest
  } catch { return {} }
}

async function hydrate(hits: SemanticHit[]): Promise<Card[]> {
  if (hits.length === 0) return []
  const byKind: Record<'villa' | 'apartment' | 'complex', string[]> = {
    villa: [], apartment: [], complex: [],
  }
  for (const h of hits) byKind[h.kind].push(h.airtable_id)

  const map = new Map<string, { kind: 'villa' | 'apartment' | 'complex'; row: HydratedRow }>()
  const tasks: Promise<void>[] = []
  if (byKind.villa.length) {
    tasks.push((async () => {
      const r = await sb.from('raw_villas').select('airtable_id, data').in('airtable_id', byKind.villa)
      for (const row of (r.data ?? []) as HydratedRow[]) map.set(`villa:${row.airtable_id}`, { kind: 'villa', row })
    })())
  }
  if (byKind.apartment.length) {
    tasks.push((async () => {
      const r = await sb.from('raw_apartments').select('airtable_id, data').in('airtable_id', byKind.apartment)
      for (const row of (r.data ?? []) as HydratedRow[]) map.set(`apartment:${row.airtable_id}`, { kind: 'apartment', row })
    })())
  }
  if (byKind.complex.length) {
    tasks.push((async () => {
      const r = await sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').in('airtable_id', byKind.complex)
      for (const row of (r.data ?? []) as HydratedRow[]) map.set(`complex:${row.airtable_id}`, { kind: 'complex', row })
    })())
  }
  await Promise.all(tasks)

  // Photo manifests (small fetch — same as other detail loaders).
  const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const [villaPhotos, aptPhotos] = await Promise.all([
    fetchManifest(`${SUPABASE}/storage/v1/object/public/villa-photos/_manifest.json`),
    fetchManifest(`${SUPABASE}/storage/v1/object/public/apartment-photos/_manifest.json`),
  ])

  const out: Card[] = []
  for (const h of hits) {
    const entry = map.get(`${h.kind}:${h.airtable_id}`)
    if (!entry) continue
    const { kind, row } = entry
    const d = row.data
    let href = ''
    let photo: string | null = null
    let slug: string | null = null
    if (kind === 'villa') {
      slug = fs1(d['SEO:Slug'])
      href = slug ? `/ru/villy/o/${slug}` : '/ru/villy'
      photo = villaPhotos[row.airtable_id]?.[0] ?? null
    } else if (kind === 'apartment') {
      slug = fs1(d['SEO:Slug'])
      href = slug ? `/ru/apartamenty/o/${slug}` : '/ru/apartamenty'
      photo = aptPhotos[row.airtable_id]?.[0] ?? null
    } else {
      slug = row.slug ?? null
      href = slug ? `/ru/zhilye-kompleksy/o/${slug}` : '/ru/zhilye-kompleksy'
      photo = row.cover_url ?? null
    }
    const title = cleanTitle(fs1(d['SEO:Title']) ?? fs1(d['Project']) ?? fs1(d['Name'])) ?? slug ?? ''
    out.push({
      kind, airtable_id: row.airtable_id, slug, title,
      district: fs1(d['Location 2']) ?? fs1(d['Location']),
      bedrooms: num1(d['Комнаты']) ?? num1(d['Спальни']),
      area: num1(d['Площадь']),
      priceUsd: kind === 'apartment'
        ? (num1(d['price_usd']) ?? num1(d['Цена']))
        : (num1(d['price']) ?? num1(d['Цена'])),
      photo, href, distance: h.distance,
    })
  }
  return out
}

export async function POST(req: Request) {
  let body: { query?: string; limit?: number; kinds?: Array<'villa' | 'apartment' | 'complex'> }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const q = (body.query ?? '').trim()
  if (q.length < 3) return NextResponse.json({ results: [] })
  const limit = Math.max(1, Math.min(40, body.limit ?? 12))
  const hits = await semanticSearch(q, { limit, kinds: body.kinds })
  const cards = await hydrate(hits)
  return NextResponse.json({ results: cards })
}
