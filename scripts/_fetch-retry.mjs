// Self-installing global fetch retry — loaded in CI via
// NODE_OPTIONS=--import=./scripts/_fetch-retry.mjs, so every `node scripts/*.mjs`
// step in the sync workflows gets it without per-script edits.
//
// Why: the sync scripts hit external APIs (Airtable / Supabase / Azure) with bare
// fetch() and no retry, so a single transient network blip on the GitHub runner
// (ETIMEDOUT / ENETUNREACH / ECONNRESET) failed the whole workflow run. Here we
// wrap globalThis.fetch to retry transient network errors and 429/5xx with
// exponential backoff. A first-try success is unchanged.
//
// Reads are idempotent and dominate the sync; the few writes (Supabase upserts,
// Azure translate) are safe to replay. Tunable via FETCH_RETRIES / FETCH_RETRY_BASE_MS.
//
// Defensive by design: any failure installing the wrapper is swallowed so this
// preload can never break an otherwise-healthy `node` invocation (incl. npm ci).

try {
  if (!globalThis.__fetchRetryInstalled && typeof globalThis.fetch === 'function') {
    globalThis.__fetchRetryInstalled = true

    const RETRIES = Number(process.env.FETCH_RETRIES || 4)
    const BASE_MS = Number(process.env.FETCH_RETRY_BASE_MS || 800)
    const orig = globalThis.fetch
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

    const NET_CODES = new Set([
      'ETIMEDOUT', 'ENETUNREACH', 'ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH',
      'EAI_AGAIN', 'EPIPE', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET',
    ])
    // Walk the error chain (cause + AggregateError.errors) for a transient code.
    const isTransient = (err) => {
      const seen = new Set()
      const walk = (e, depth) => {
        if (!e || depth > 6 || seen.has(e)) return false
        seen.add(e)
        if (e.code && NET_CODES.has(e.code)) return true
        if (Array.isArray(e.errors) && e.errors.some((x) => walk(x, depth + 1))) return true
        return walk(e.cause, depth + 1)
      }
      return walk(err, 0)
    }

    globalThis.fetch = async (input, init) => {
      let lastErr
      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
          const res = await orig(input, init)
          if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
            const ra = Number(res.headers.get('retry-after'))
            const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : BASE_MS * 2 ** attempt
            await sleep(wait + Math.floor(Math.random() * 250))
            continue
          }
          return res
        } catch (err) {
          lastErr = err
          if (attempt < RETRIES && isTransient(err)) {
            await sleep(BASE_MS * 2 ** attempt + Math.floor(Math.random() * 250))
            continue
          }
          throw err
        }
      }
      throw lastErr
    }
  }
} catch {
  // Never let the preload itself break a node invocation.
}
