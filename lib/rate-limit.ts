// Lightweight in-memory rate limiting for public paid/AI endpoints.
// Per Vercel-region instance (not a global store), which is enough to
// blunt scripted abuse of the chat/transcribe endpoints without adding
// a KV dependency. For a hardened global limit, move to Vercel KV /
// Upstash or a WAF rate-limit rule.

const buckets = new Map<string, number[]>()

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

// Sliding-window limiter. Returns true if the call is allowed, false if
// the key has hit `max` within `windowMs`.
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const arr = (buckets.get(key) ?? []).filter(t => now - t < windowMs)
  if (arr.length >= max) { buckets.set(key, arr); return false }
  arr.push(now)
  buckets.set(key, arr)
  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) { if (v.every(t => now - t >= windowMs)) buckets.delete(k) }
  }
  return true
}
