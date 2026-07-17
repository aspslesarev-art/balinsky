// Best-effort in-memory rate limit for the LLM text layer.
//
// Serverless instances are ephemeral and load-balanced, so this is not a hard
// global cap — it only throttles a burst hitting the same warm instance, which
// is enough to make bulk dumping annoying. The real gate is bots.ts.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 60

const hits = new Map<string, number[]>()

export function rateLimited(ip: string | null): boolean {
  if (!ip) return false
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) {
    // Evict cold entries to bound memory.
    for (const [k, v] of hits) if (v.every(t => now - t >= WINDOW_MS)) hits.delete(k)
  }
  return arr.length > MAX_PER_WINDOW
}

export function clientIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip')
}
