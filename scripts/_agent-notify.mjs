// Bridge from sync-* scripts to /api/agent/notify. Sync scripts can't import
// the TS notification lib, so they call the API endpoint instead. Authorised
// with the same REVALIDATE_TOKEN those scripts already use for cache busting.
//
// Usage at the tail of a sync script:
//   await notifyAgents('news', [
//     { sourceId: rec.id, developerNames: [...], title: '...', body: '...', path: '/ru/novosti/<slug>' },
//   ])
export async function notifyAgents(source, items) {
  if (!items || items.length === 0) return
  const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://balinsky.info'
  const TOKEN = process.env.REVALIDATE_TOKEN
  if (!TOKEN) { console.warn('[agent-notify] REVALIDATE_TOKEN missing — skipping push'); return }
  try {
    const r = await fetch(`${SITE_URL}/api/agent/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ source, items }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) console.warn(`[agent-notify] ${source} -> ${r.status}: ${JSON.stringify(j).slice(0, 200)}`)
    else console.log(`[agent-notify] ${source}: notified ${j.notified ?? 0} items, ${j.recipients ?? 0} messages`)
  } catch (e) {
    console.warn(`[agent-notify] ${source} fetch failed:`, e?.message ?? e)
  }
}
