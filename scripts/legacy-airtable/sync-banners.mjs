import './_retired.mjs'
// Pulls the "Ad Banners" Airtable table into Supabase Storage as
// assets/_banners.json. Runs from GitHub Actions cron (same pattern as
// the other syncs) or by hand: `node scripts/sync-banners.mjs`.
//
// Expected Airtable schema (table name: "Ad Banners"):
//   Image            (attachment, exactly 1)
//   Link             (URL)
//   Alt              (single line text)
//   Headline         (single line text, ~6-10 words)
//   Sponsor          (single line text, optional)
//   Active           (checkbox)
//   Starts At        (date / datetime, optional)
//   Ends At          (date / datetime, optional)
//   Impression Limit (number, optional — null means no cap)
//
// Required env (set both before running):
//   AIRTABLE_TOKEN, AIRTABLE_BASE_AD_BANNERS

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const TOKEN = process.env.AIRTABLE_TOKEN
const BASE  = process.env.AIRTABLE_BASE_AD_BANNERS
const TABLE = 'Ad Banners'

if (!TOKEN || !BASE) {
  console.error('Set AIRTABLE_TOKEN and AIRTABLE_BASE_AD_BANNERS in .env.local')
  process.exit(1)
}

async function fetchAll() {
  const out = []
  let offset
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`)
    const j = await r.json()
    out.push(...(j.records ?? []))
    offset = j.offset
  } while (offset)
  return out
}

const records = await fetchAll()
const banners = records.map(r => {
  const f = r.fields ?? {}
  const img = Array.isArray(f.Image) ? f.Image[0] : null
  return {
    id: r.id,
    imageUrl: img?.url ?? null,
    linkUrl: f.Link ?? null,
    alt: f.Alt ?? f.Headline ?? '',
    headline: f.Headline ?? '',
    sponsor: f.Sponsor ?? null,
    startsAt: f['Starts At'] ?? null,
    endsAt: f['Ends At'] ?? null,
    active: !!f.Active,
    impressionLimit: typeof f['Impression Limit'] === 'number' ? f['Impression Limit'] : null,
  }
}).filter(b => b.imageUrl && b.linkUrl && b.headline)

const payload = JSON.stringify({ generatedAt: new Date().toISOString(), banners }, null, 2)

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { error } = await sb.storage.from('assets').upload('_banners.json', Buffer.from(payload, 'utf8'), {
  contentType: 'application/json',
  cacheControl: '300',
  upsert: true,
})
if (error) { console.error('upload failed:', error.message); process.exit(1) }
console.log(`uploaded ${banners.length} banner(s) → assets/_banners.json`)
