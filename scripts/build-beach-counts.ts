// Сколько кафе, ресторанов, баров и бич-клубов в 500 м от каждого пляжа
// (lib/beaches.json → поле nearby). Источники, без дублей по Google id:
// bali_places — ~19 тыс. туристических мест Бали с типом в колонке bucket
// (миграции 048–050), и места вокруг объектов (scripts/sync-nearby-places.mjs):
// в первой нет мелких кафе прямо на песке (у Пандавы — ни одного ресторана).
// Пляж в Google — одна точка, поэтому радиус 500 м: на длинных пляжах
// (Нуса-Дуа, Санур) это участок у точки, а не весь берег.
//
//   npx tsx --env-file=.env.local scripts/build-beach-counts.ts
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const RADIUS_M = 500
const BUCKETS = { cafe: 'cafes', restaurant: 'restaurants', bar: 'bars', beach_club: 'beach_clubs' } as const

type Place = { id: string; lat: number; lng: number; bucket: keyof typeof BUCKETS }

async function places(): Promise<Place[]> {
  const out: Place[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('bali_places').select('id, lat, lng, bucket').in('bucket', Object.keys(BUCKETS)).range(from, from + 999)
    if (error) throw new Error(`bali_places: ${error.message}`)
    out.push(...(data ?? []).map(r => ({ id: String(r.id), lat: Number(r.lat), lng: Number(r.lng), bucket: r.bucket as Place['bucket'] })))
    if (!data || data.length < 1000) return out
  }
}

// Координаты пляжей — у их Google place id в файлах мест вокруг объектов.
// Тип места вокруг объекта → корзина как в bali_places.bucket (place_bucket()).
const LOUD = new Set(['night_club', 'bar', 'pub', 'karaoke', 'sports_bar', 'wine_bar', 'cocktail_bar', 'dance_hall'])
const CAFE = new Set(['cafe', 'coffee_shop', 'bakery', 'breakfast_restaurant', 'brunch_restaurant', 'dessert_shop', 'juice_shop'])
function bucketOf(p: { name?: string | null; primaryType?: string | null; types?: string[] }): Place['bucket'] | null {
  const t = p.primaryType ?? ''
  if (/beach ?club/i.test(p.name ?? '')) return 'beach_club'
  if (/hotel|resort|lodging|villa/i.test(t)) return null
  if (LOUD.has(t)) return 'bar'
  if (CAFE.has(t)) return 'cafe'
  if (/restaurant|warung|food|grill|seafood|meal/i.test(t) || /warung/i.test(p.name ?? '')) return 'restaurant'
  return null
}

async function beachCoords(ids: Set<string>, venues: Map<string, Place>): Promise<Map<string, [number, number]>> {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/competitors`
  const idx = await fetch(`${base}/_nearby_places.json`).then(r => r.json()) as { ids: string[] }
  const out = new Map<string, [number, number]>()
  for (let i = 0; i < idx.ids.length; i += 25) {
    await Promise.all(idx.ids.slice(i, i + 25).map(async id => {
      const d = await fetch(`${base}/_nearby_places/${id}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null)
      for (const p of d?.beach ?? []) if (ids.has(p.id)) out.set(p.id, [p.lat, p.lng])
      for (const k of ['restaurant', 'cafe', 'nightlife', 'beachclub']) for (const p of d?.[k] ?? []) {
        const b = bucketOf(p)
        if (b && !venues.has(p.id)) venues.set(p.id, { id: p.id, lat: p.lat, lng: p.lng, bucket: b })
      }
    }))
  }
  return out
}

async function main() {
  const file = 'lib/beaches.json'
  const beaches = JSON.parse(fs.readFileSync(file, 'utf8')) as { ids: string[]; nearby?: unknown }[]
  const base = await places()
  if (base.length < 5000) throw new Error(`only ${base.length} places — not writing`)
  // bali_places первым: его корзины точнее, места вокруг объектов только дополняют.
  const venues = new Map(base.map(p => [p.id, p]))
  const coords = await beachCoords(new Set(beaches.flatMap(b => b.ids)), venues)
  const pl = [...venues.values()]
  const m = (a: number, b: number, c: number, d: number) => 111_320 * Math.hypot(a - c, (b - d) * Math.cos(a * Math.PI / 180))
  let done = 0
  for (const b of beaches) {
    const at = b.ids.map(id => coords.get(id)).find(Boolean)
    if (!at) continue
    const counts: Record<string, number> = { cafes: 0, restaurants: 0, bars: 0, beach_clubs: 0 }
    for (const p of pl) if (Math.abs(p.lat - at[0]) < 0.005 && m(at[0], at[1], p.lat, p.lng) <= RADIUS_M) counts[BUCKETS[p.bucket]]++
    b.nearby = { ...counts, radius_m: RADIUS_M }
    done++
  }
  fs.writeFileSync(file, JSON.stringify(beaches, null, 1) + '\n')
  console.log(`beaches with counts: ${done} of ${beaches.length}, places ${pl.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
