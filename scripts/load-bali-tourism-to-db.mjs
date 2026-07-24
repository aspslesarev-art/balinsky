// Bulk-load scripts/_bali-tourism.json into public.bali_places (Supabase).
// Flattens the most-queried fields into columns; keeps the full rich record
// (reviews, photos refs, opening hours, amenities) in the `data` jsonb column.
// Idempotent: upsert on id. Run: node scripts/load-bali-tourism-to-db.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const places = JSON.parse(fs.readFileSync('scripts/_bali-tourism.json', 'utf8'))
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
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  const { error } = await sb.from('bali_places').upsert(slice, { onConflict: 'id' })
  if (error) { console.error(`batch ${i}: ${error.message}`); process.exit(1) }
  done += slice.length
  process.stdout.write(`\r  upserted ${done}/${rows.length}`)
}
const { count } = await sb.from('bali_places').select('*', { count: 'exact', head: true })
console.log(`\n done. table row count: ${count}`)
