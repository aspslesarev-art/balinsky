// Optional Bunny CDN rewriter for photo URLs. Set `PHOTO_CDN_BASE` to a Bunny
// pull-zone hostname (e.g. https://balinsky.b-cdn.net) and every Supabase
// Storage public-object URL gets rewritten before it lands in a manifest.
// Egress is then paid via Bunny ($0.005/GB) instead of Supabase.
export function cdnRewrite(url) {
  if (!url || typeof url !== 'string') return url
  const cdn = (process.env.PHOTO_CDN_BASE || '').replace(/\/$/, '')
  const sb = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  if (!cdn || !sb) return url
  // Host-only swap — keep the /storage/v1/object/public/ path. The Cloudflare
  // Worker at images.balinsky.info mirrors the FULL Supabase path, so the old
  // Bunny-style strip (`cdn + '/' + url.slice(prefix.length)`) produced 404s
  // for every freshly-synced photo after the CDN moved from Bunny to Cloudflare.
  return url.startsWith(sb + '/') ? cdn + url.slice(sb.length) : url
}
