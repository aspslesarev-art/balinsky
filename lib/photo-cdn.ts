// Optional Bunny CDN rewriter — twin of scripts/_cdn.mjs, for code paths
// that build Supabase Storage URLs inside the Next.js app (not in sync
// scripts). Set NEXT_PUBLIC_PHOTO_CDN_BASE to enable; everything stays
// pointing at Supabase if the env var is absent.

const CDN_BASE = (process.env.NEXT_PUBLIC_PHOTO_CDN_BASE || '').replace(/\/$/, '')
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const PREFIX = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/` : ''

export function cdnRewrite(url: string | null | undefined): string | null {
  if (!url) return null
  if (!CDN_BASE || !PREFIX) return url
  return url.startsWith(PREFIX) ? CDN_BASE + '/' + url.slice(PREFIX.length) : url
}

// Replace the Supabase storage hostname for an entire bucket-prefix string —
// used when code hardcodes `${SUPABASE_URL}/storage/v1/object/public/<bucket>`
// as a base for further path concatenation.
export function cdnBucketBase(bucket: string): string {
  if (CDN_BASE) return `${CDN_BASE}/${bucket}`
  return SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}` : `/${bucket}`
}

// Rewrite every URL in a photo manifest (`{ <id>: [url1, url2, ...] }`).
// Lets us migrate to the CDN immediately, without waiting for the next sync
// run to re-emit the manifest with CDN URLs.
export function cdnRewriteManifest(
  manifest: Record<string, string[]> | null | undefined,
): Record<string, string[]> {
  if (!manifest) return {}
  if (!CDN_BASE || !PREFIX) return manifest
  const out: Record<string, string[]> = {}
  for (const [id, urls] of Object.entries(manifest)) {
    if (!Array.isArray(urls)) continue
    out[id] = urls.map(u => (typeof u === 'string' && u.startsWith(PREFIX) ? CDN_BASE + '/' + u.slice(PREFIX.length) : u))
  }
  return out
}
