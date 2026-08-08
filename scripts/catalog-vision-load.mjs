#!/usr/bin/env node
// Переливает результат scripts/catalog-vision.mjs из Storage-манифестов
// в таблицу catalog_product_vision — чтобы разбор каталога можно было
// джойнить с зонами и рынком аренды обычным SQL.
//
// Usage: node scripts/catalog-vision-load.mjs

import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_kb-build.mjs'

loadEnv()

const BUCKETS = { villa: 'villa-photos', apartment: 'apartment-photos', complex: 'complex-photos' }
const OUT_KEY = '_product-vision.json'
const CHUNK = 200

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

for (const [kind, bucket] of Object.entries(BUCKETS)) {
  const { data, error } = await sb.storage.from(bucket).download(OUT_KEY)
  if (error) { console.error(`${kind}: нет ${bucket}/${OUT_KEY} — ${error.message}`); continue }

  let manifest
  try { manifest = JSON.parse(await data.text()) } catch (e) { console.error(`${kind}: битый JSON — ${e.message}`); continue }

  const rows = Object.entries(manifest)
    .filter(([, v]) => v?.vision)
    .map(([airtable_id, v]) => ({
      kind,
      airtable_id,
      vision: v.vision,
      model: v.model ?? 'gpt-5.4',
      photos_used: v.photos_used ?? 0,
      analyzed_at: v.analyzed_at ?? new Date().toISOString(),
    }))

  let saved = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error: upErr } = await sb
      .from('catalog_product_vision')
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'kind,airtable_id' })
    if (upErr) { console.error(`${kind}: upsert — ${upErr.message}`); break }
    saved += Math.min(CHUNK, rows.length - i)
  }
  console.log(`${kind}: ${saved}/${rows.length} записей`)
}
