// Next.js calls register() once per worker on cold start. We use it
// to install a global handler that swallows ONE specific kind of
// noise: the "items over 2MB can not be cached" rejection that Next
// throws when a fetch / unstable_cache payload exceeds its data-cache
// cap. The cached value isn't needed (the loader already returned the
// data); the unhandled rejection just crashes the Lambda → 500. By
// catching it here, the page renders correctly and Lambda stays alive.
export async function register() {
  if (typeof process !== 'undefined' && process.on) {
    process.on('unhandledRejection', (reason) => {
      const msg = reason instanceof Error ? reason.message : String(reason)
      if (msg.includes('items over 2MB can not be cached') ||
          msg.includes('over 2MB can not be cached')) {
        // Known Next.js fetch/data-cache cap. Loader already returned
        // the payload — only the background cache-set failed. Safe to
        // ignore so the Lambda doesn't crash.
        return
      }
      // Anything else is a real bug — surface it.
      // eslint-disable-next-line no-console
      console.error('[unhandledRejection]', reason)
    })
  }
}
