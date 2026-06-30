// Regression check for VideoObject JSON-LD across the whole site.
//
// Every page that renders <VideoGrid> (villa / apartment / complex /
// developer detail pages) builds its VideoObject schema from the same
// _videos.json manifest, so validating every manifest item through the
// component's exact normalization logic = validating the whole site.
//
// Asserts, per video:
//   1. uploadDate is ISO 8601 *with* a timezone (no bare yyyy-mm-dd).
//   2. contentUrl carries no tracking params (?si=, utm_*, feature).
//
// Run: node scripts/check-video-schema.mjs
import fs from 'node:fs'

const env = fs.readFileSync('.env.local', 'utf8')
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

const MANIFEST_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feeds/_videos.json`

// --- mirror of components/VideoGrid.tsx logic (keep in sync) ---
function toUploadDate(raw) {
  const s = (raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T10:00:00+08:00`
  if (s && !Number.isNaN(Date.parse(s))) return s
  return `${new Date().toISOString().slice(0, 10)}T10:00:00+08:00`
}
function cleanVideoUrl(url) {
  try {
    const u = new URL(url)
    for (const k of [...u.searchParams.keys()]) {
      if (k === 'si' || k === 'feature' || k.startsWith('utm_')) u.searchParams.delete(k)
    }
    return u.toString()
  } catch { return url }
}
// ----------------------------------------------------------------

const hasTz = (s) => /(?:Z|[+-]\d{2}:?\d{2})$/.test(s)
const hasTracking = (s) => /[?&](si|feature|utm_[a-z]+)=/i.test(s)

console.log('▶ fetching', MANIFEST_URL)
const r = await fetch(MANIFEST_URL)
if (!r.ok) { console.error(`✗ manifest fetch failed: ${r.status}`); process.exit(1) }
const { items = [] } = await r.json()

let bad = 0
for (const v of items) {
  const uploadDate = toUploadDate(v.addedAt)
  const contentUrl = cleanVideoUrl(v.url)
  const problems = []
  if (!hasTz(uploadDate)) problems.push(`uploadDate missing TZ: ${uploadDate}`)
  if (hasTracking(contentUrl)) problems.push(`contentUrl has tracking: ${contentUrl}`)
  if (problems.length) {
    bad++
    console.log(`✗ ${v.id} (${v.name ?? '—'})`)
    for (const p of problems) console.log(`    ${p}`)
  }
}

console.log(`\nchecked ${items.length} videos · ${bad} failing`)
process.exit(bad ? 1 : 0)
