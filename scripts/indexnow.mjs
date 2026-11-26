// IndexNow ping: tells Bing (which ChatGPT search and Copilot read), Yandex,
// Seznam and Naver that pages changed, so they recrawl in hours, not weeks.
// Free, no account. The key is public by design: it sits at
// public/<key>.txt, and the engines fetch it to check we own the host.
//
// Run:  node scripts/indexnow.mjs --since=2026-11-20   (sitemap URLs whose lastmod >= date)
//       node scripts/indexnow.mjs --all                (every sitemap URL)
//       node scripts/indexnow.mjs https://balinsky.info/en/how-to-buy ...
//       add --dry to print the URLs without sending.

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HOST = 'balinsky.info'
const ORIGIN = `https://${HOST}`
// Firewall: the site challenges non-browser traffic — this UA is allow-listed.
const TOOL_UA = 'balinsky-tools/1.0'

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const keyFile = readdirSync(pub).find(f => /^[0-9a-f]{32}\.txt$/.test(f))
if (!keyFile) throw new Error('IndexNow key file public/<32 hex>.txt not found')
const KEY = readFileSync(join(pub, keyFile), 'utf8').trim()

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const all = args.includes('--all')
const since = args.find(a => a.startsWith('--since='))?.slice(8)
const explicit = args.filter(a => a.startsWith('http'))

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': TOOL_UA } })
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`)
  return r.text()
}

async function sitemapUrls() {
  const index = await get(`${ORIGIN}/sitemap.xml`)
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  const out = []
  for (const sm of maps) {
    const xml = await get(sm)
    for (const u of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const loc = u[1].match(/<loc>([^<]+)<\/loc>/)?.[1]
      const lastmod = u[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]
      if (!loc) continue
      if (all || (since && lastmod && lastmod.slice(0, 10) >= since)) out.push(loc)
    }
  }
  return out
}

const urls = explicit.length ? explicit : (all || since) ? await sitemapUrls() : null
if (!urls) {
  console.error('Nothing to send: pass URLs, --since=YYYY-MM-DD or --all')
  process.exit(1)
}
const unique = [...new Set(urls)].filter(u => u.startsWith(ORIGIN))
console.log(`${unique.length} URL(s)`)
if (dry) { unique.slice(0, 20).forEach(u => console.log(' ', u)); process.exit(0) }

// The protocol takes up to 10 000 URLs per request.
for (let i = 0; i < unique.length; i += 10000) {
  const batch = unique.slice(i, i + 10000)
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${keyFile}`, urlList: batch }),
  })
  // 200 = accepted, 202 = accepted, key check pending. Anything else is an error.
  if (r.status !== 200 && r.status !== 202) {
    throw new Error(`IndexNow batch ${i / 10000 + 1}: HTTP ${r.status} ${await r.text()}`)
  }
  console.log(`batch ${i / 10000 + 1}: ${batch.length} sent, HTTP ${r.status}`)
}
