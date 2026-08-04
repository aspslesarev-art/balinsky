// Bulk-load scripts/_bali-tourism.json into public.bali_places (Supabase).
// Flattens the most-queried fields into columns; keeps the full rich record
// (reviews, photos refs, opening hours, amenities) in the `data` jsonb column.
// Idempotent: upsert on id. Run: node scripts/load-bali-tourism-to-db.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// A later sweep writes its own output file (`--in=scripts/_bali-tourism-p3.json`).
const IN_PATH = (process.argv.slice(2).find(a => a.startsWith('--in=')) || '--in=scripts/_bali-tourism.json').split('=')[1]
const places = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'))
const rows = Object.values(places).map(p => ({
  id: p.id,
  name: p.displayName?.text ?? null,
  primary_type: p.primaryTypeDisplayName?.text ?? p.primaryType ?? null,
  types: p.types ?? null,
  rating: p.rating ?? null,
  user_rating_count: p.userRatingCount ?? null,
  price_level: p.priceLevel ?? null,
  lat: p.location?.latitude ?? null,
  lng: p.location?.longitude ?? null,
  formatted_address: p.formattedAddress ?? null,
  website: p.websiteUri ?? null,
  phone: p.internationalPhoneNumber ?? null,
  editorial: p.editorialSummary?.text ?? null,
  zones: p._zones ?? null,
  cats: p._cats ?? null,
  review_count: p.reviews?.length ?? 0,
  photo_count: p.photos?.length ?? 0,
  data: p,
}))

console.log(`loading ${rows.length} rows in batches...`)
const BATCH = 300
let done = 0
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  // A place found again by a later sweep carries only THAT sweep's zones/cats.
  // Upserting them raw would erase the provenance of earlier passes, so union
  // the arrays with what the row already has.
  const { data: existing } = await sb
    .from('bali_places')
    .select('id,zones,cats')
    .in('id', slice.map(r => r.id))
  if (existing?.length) {
    const prev = new Map(existing.map(e => [e.id, e]))
    for (const r of slice) {
      const e = prev.get(r.id)
      if (!e) continue
      r.zones = [...new Set([...(e.zones ?? []), ...(r.zones ?? [])])]
      r.cats = [...new Set([...(e.cats ?? []), ...(r.cats ?? [])])]
    }
  }
  let ok = false
  for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
    try {
      const { error } = await sb.from('bali_places').upsert(slice, { onConflict: 'id' })
      if (error) throw new Error(error.message)
      ok = true
    } catch (e) {
      if (attempt === 5) { console.error(`\nbatch ${i} failed after 5 tries: ${e.message}`); process.exit(1) }
      await sleep(1000 * attempt)
    }
  }
  done += slice.length
  process.stdout.write(`\r  upserted ${done}/${rows.length}`)
}
const { count } = await sb.from('bali_places').select('*', { count: 'exact', head: true })
console.log(`\n done. table row count: ${count}`)
