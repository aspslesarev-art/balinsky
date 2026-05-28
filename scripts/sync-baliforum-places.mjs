// Pull baliforum.ru curated places into public.baliforum_places. Source data
// is a Russian-speaking Bali community catalog (~4 300 entries) hand-picked
// by moderators — used as a third-party validation signal on the investment
// map alongside Google Places anchors.
//
// Strategy: read sitemap-places-1.xml for all slugs, fetch each detail page,
// extract lat/lng + Google place_id from the Maps link, category + rating
// from JSON-LD, then upsert. Bounded concurrency, retries on 5xx.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const SITEMAP_URL = 'https://baliforum.ru/sitemap-places-1.xml'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function fetchSlugs() {
  const r = await fetch(SITEMAP_URL)
  if (!r.ok) throw new Error(`sitemap fetch ${r.status}`)
  const xml = await r.text()
  const urls = [...xml.matchAll(/<loc>(https:\/\/baliforum\.ru\/places\/[^<]+)<\/loc>/g)].map(m => m[1])
  return urls
}

async function fetchHtml(url, attempt = 1) {
  const r = await fetch(url, { headers: { 'User-Agent': 'balinsky-sync/1.0 (+https://balinsky.info)' } })
  if (r.status === 404) return null
  if (!r.ok) {
    if (attempt < 4 && (r.status === 429 || r.status >= 500)) {
      await new Promise(res => setTimeout(res, 500 * attempt))
      return fetchHtml(url, attempt + 1)
    }
    throw new Error(`${url} -> ${r.status}`)
  }
  return r.text()
}

// schema.org types — map to our internal categories. Anything unknown gets
// dropped (cafe vs restaurant vs hotel etc all collapse into the broad
// buckets the snapshot already understands).
const TYPE_MAP = {
  Restaurant: 'restaurant',
  CafeOrCoffeeShop: 'cafe',
  Cafe: 'cafe',
  BarOrPub: 'nightlife',
  Bar: 'nightlife',
  NightClub: 'nightlife',
  TouristAttraction: 'attraction',
  Beach: 'beach',
  ShoppingCenter: 'shopping_mall',
  Hotel: 'luxury_hotel',
  Resort: 'luxury_hotel',
  Hospital: 'hospital',
  MedicalClinic: 'hospital',
  School: 'school',
  HealthClub: 'wellness',
  DaySpa: 'wellness',
  YogaStudio: 'wellness',
}

function extract(html, url) {
  if (!html) return null
  const slug = url.replace(/^https:\/\/baliforum\.ru\/places\//, '').replace(/\/$/, '')

  // Coordinates and Google place_id from the Maps deep-link.
  // Example: maps/search/?api=1&query=-8.5155%2C115.2637&query_place_id=ChIJ...
  const mapMatch = html.match(/maps\/search\/\?api=1&(?:amp;)?query=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)(?:&(?:amp;)?query_place_id=([A-Za-z0-9_-]+))?/)
  const lat = mapMatch ? Number(mapMatch[1]) : null
  const lng = mapMatch ? Number(mapMatch[2]) : null
  const google_place_id = mapMatch?.[3] ?? null

  // JSON-LD blocks — there can be several. First one with @type that matches
  // our type map wins; aggregateRating may live there too.
  let category = null
  let rating = null
  let reviews = null
  let name = null
  let address = null
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1])
      const items = Array.isArray(j) ? j : [j]
      for (const it of items) {
        if (!it || typeof it !== 'object') continue
        const t = Array.isArray(it['@type']) ? it['@type'][0] : it['@type']
        if (!category && typeof t === 'string' && TYPE_MAP[t]) category = TYPE_MAP[t]
        if (!name && typeof it.name === 'string') name = it.name
        if (!address) {
          if (typeof it.address === 'string') address = it.address
          else if (it.address && typeof it.address.streetAddress === 'string') address = it.address.streetAddress
        }
        const ar = it.aggregateRating
        if (ar) {
          if (rating == null && ar.ratingValue != null) rating = Number(ar.ratingValue)
          if (reviews == null && ar.reviewCount != null) reviews = Number(ar.reviewCount)
        }
      }
    } catch { /* ignore malformed JSON-LD */ }
  }

  // Rating + reviews aren't in baliforum's JSON-LD — they're rendered next to
  // the "Рейтинг на Google картах" link as plain text: " 4.9 / 535 <a ... ".
  if (rating == null || reviews == null) {
    const m = html.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)\s*<a[^>]*location-widget__rating-url/)
    if (m) {
      if (rating == null) rating = Number(m[1])
      if (reviews == null) reviews = Number(m[2])
    }
  }

  // Fallbacks from meta tags / title.
  if (!name) {
    const t = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]
    if (t) name = t.split(/[,|]/)[0].trim()
  }
  const photo = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null
  const tagsRaw = html.match(/<meta property="article:tag" content="([^"]+)"/)?.[1] ?? null
  const tags = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : []

  // District is rendered as a breadcrumb / inline text but isn't reliably in
  // structured data. Leave null for now — anchor selection works on coords.
  const district = null

  if (lat == null || lng == null || !name) return null
  return { slug, name, category, district, lat, lng, rating, reviews, google_place_id, address, tags, photo, url }
}

const urls = await fetchSlugs()
console.log('sitemap places:', urls.length)
if (urls.length === 0) throw new Error('empty sitemap — refusing to proceed')

// Streaming pipeline: workers push extracted rows into a pending buffer,
// drainer flushes batches to Supabase. Keeps memory bounded — the previous
// version held 4 290 HTML responses + 4 290 records in RAM and OOM'd at ~3 300.
const CONCURRENCY = 6
const BATCH_SIZE = 200
const liveSlugs = new Set()
let pending = []
let done = 0
let failed = 0
let skipped = 0
let upserted = 0
let flushPromise = Promise.resolve()

async function flush() {
  if (pending.length === 0) return
  const batch = pending.splice(0, pending.length).map(r => ({
    ...r,
    tags: r.tags && r.tags.length ? r.tags : null,
    synced_at: new Date().toISOString(),
  }))
  const { error } = await sb.from('baliforum_places').upsert(batch, { onConflict: 'slug' })
  if (error) { console.error('  ✖ upsert batch:', error.message); throw error }
  upserted += batch.length
}

async function worker(slice) {
  for (const url of slice) {
    try {
      const html = await fetchHtml(url)
      const rec = extract(html, url)
      if (rec) {
        liveSlugs.add(rec.slug)
        pending.push(rec)
        if (pending.length >= BATCH_SIZE) {
          // Chain flushes so we never run two batches in parallel (would race
          // on the same upsert path) but we don't block worker fetches.
          flushPromise = flushPromise.then(flush)
        }
      } else {
        skipped++
      }
    } catch (e) {
      failed++
      if (failed < 10) console.warn(`  ✖ ${url}: ${e.message}`)
    }
    done++
    if (done % 200 === 0) console.log(`  ${done}/${urls.length} (kept ${liveSlugs.size}, upserted ${upserted}, skipped ${skipped}, failed ${failed})`)
  }
}

const slices = Array.from({ length: CONCURRENCY }, (_, i) =>
  urls.filter((_, idx) => idx % CONCURRENCY === i)
)
await Promise.all(slices.map(worker))
await flushPromise
await flush() // final partial batch
console.log(`fetched ${liveSlugs.size}/${urls.length}, upserted ${upserted}, skipped ${skipped}, failed ${failed}`)

// Prune stale rows. Sanity guard: only if we got at least half the sitemap;
// a network blip that drops to 0 results shouldn't wipe the table.
if (liveSlugs.size > urls.length * 0.5) {
  const { data: existing } = await sb.from('baliforum_places').select('slug')
  const stale = (existing ?? []).map(r => r.slug).filter(s => !liveSlugs.has(s))
  if (stale.length > 0) {
    console.log('pruning', stale.length, 'stale rows')
    for (let i = 0; i < stale.length; i += 500) {
      const slice = stale.slice(i, i + 500)
      const { error } = await sb.from('baliforum_places').delete().in('slug', slice)
      if (error) console.warn('  ✖ prune:', error.message)
    }
  }
}
console.log('done')
