// Optional CDN rewriter — twin of scripts/_cdn.mjs, for code paths that build
// Supabase Storage URLs inside the Next.js app (not in sync scripts). Set
// NEXT_PUBLIC_PHOTO_CDN_BASE to enable; everything stays pointing at Supabase
// if the env var is absent.
//
// The CDN is a Cloudflare Worker at images.balinsky.info that mirrors the FULL
// Supabase path (`/storage/v1/object/public/...`) — only the hostname is
// swapped. The old Bunny CDN stripped that path prefix; after the Bunny →
// Cloudflare move the strip started 404/401-ing every rewritten URL, so all
// helpers below keep the full path (matching scripts/_cdn.mjs and
// cdnManifestUrl).

const CDN_BASE = (process.env.NEXT_PUBLIC_PHOTO_CDN_BASE || '').replace(/\/$/, '')
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const STORAGE_PATH = '/storage/v1/object/public/'

// Host-only swap for a Supabase Storage public URL — keep the storage path.
export function cdnRewrite(url: string | null | undefined): string | null {
  if (!url) return null
  if (!CDN_BASE || !SUPABASE_URL) return url
  return url.startsWith(SUPABASE_URL + '/') ? CDN_BASE + url.slice(SUPABASE_URL.length) : url
}

// Public base for an entire bucket, on the CDN host when enabled — used when
// code concatenates `<base>/<key>` to build object URLs. Keeps the full
// `/storage/v1/object/public/<bucket>` path so the Cloudflare Worker resolves it.
export function cdnBucketBase(bucket: string): string {
  const base = CDN_BASE || SUPABASE_URL
  return base ? `${base}${STORAGE_PATH}${bucket}` : `/${bucket}`
}

// Repair a legacy path-stripped CDN URL left over from the Bunny era, e.g.
// `https://images.balinsky.info/news-photos/admin/x.jpg` (which 401/404s on the
// current Cloudflare Worker) → the full `/storage/v1/object/public/...` form.
// No-op for already-correct CDN URLs, raw Supabase URLs, and when CDN is unset.
export function cdnNormalize(url: string | null | undefined): string | null {
  if (!url) return url ?? null
  if (!CDN_BASE || !url.startsWith(CDN_BASE + '/')) return url
  const rest = url.slice(CDN_BASE.length + 1)
  return rest.startsWith(STORAGE_PATH.slice(1)) ? url : `${CDN_BASE}${STORAGE_PATH}${rest}`
}

// Route a Supabase Storage URL through the Cloudflare-fronted CDN host —
// same `/storage/v1/object/public/...` path, only the hostname swapped — and
// append a coarse time-bucket cache-bust. Repeated reads then hit Cloudflare's
// edge (cf-cache HIT) instead of Supabase egress; Supabase sees ≈one origin
// fetch per `ttlSec` bucket per file, and edge staleness is bounded to ttlSec
// (the sync does not purge the CDN, so the time-bucket is what keeps it fresh).
//
// Unlike cdnRewrite, this also appends the cache-bust; NEXT_PUBLIC_PHOTO_CDN_BASE=
// https://images.balinsky.info maps host-only. No-op (returns the original URL)
// when the CDN base is unset, e.g. local dev — so Next's own fetch cache still
// applies there.
export function cdnManifestUrl(storageUrl: string, ttlSec = 600): string {
  if (!CDN_BASE || !SUPABASE_URL || !storageUrl.startsWith(SUPABASE_URL)) return storageUrl
  const onCdn = CDN_BASE + storageUrl.slice(SUPABASE_URL.length)
  const bucket = Math.floor(Date.now() / (ttlSec * 1000))
  return `${onCdn}${onCdn.includes('?') ? '&' : '?'}v=${bucket}`
}

// Rewrite every URL in a photo manifest (`{ <id>: [url1, url2, ...] }`).
// Lets us migrate to the CDN immediately, without waiting for the next sync
// run to re-emit the manifest with CDN URLs.
export function cdnRewriteManifest(
  manifest: Record<string, string[]> | null | undefined,
): Record<string, string[]> {
  if (!manifest) return {}
  if (!CDN_BASE || !SUPABASE_URL) return manifest
  const out: Record<string, string[]> = {}
  for (const [id, urls] of Object.entries(manifest)) {
    if (!Array.isArray(urls)) continue
    out[id] = urls.map(u => (typeof u === 'string' && u.startsWith(SUPABASE_URL + '/') ? CDN_BASE + u.slice(SUPABASE_URL.length) : u))
  }
  return out
}
