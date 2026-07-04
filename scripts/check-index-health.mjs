// Crawl a sitemap sample and bucket URLs by the GSC "not indexed" reasons:
//   404, redirect (3xx), 5xx, and canonical mismatch (declared canonical ≠ URL).
// Usage: node scripts/check-index-health.mjs [--per 12]
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const HOST = 'https://balinsky.info'
const PER = parseInt(arg('--per', '12'), 10)

async function urlsFromSitemap() {
  const idx = await (await fetch(`${HOST}/sitemap.xml`)).text()
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  const leaves = maps.some(u => u.endsWith('.xml')) ? maps.filter(u => u.endsWith('.xml')) : [`${HOST}/sitemap.xml`]
  const urls = []
  for (const sm of leaves) {
    const xml = await (await fetch(sm)).text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => !u.endsWith('.xml'))
    // even sample across the file
    const step = Math.max(1, Math.floor(locs.length / PER))
    for (let i = 0; i < locs.length && urls.length < 100000; i += step) urls.push({ sm, url: locs[i] })
  }
  return urls
}

const norm = u => u.replace(/\/$/, '')
const buckets = { redirect: [], notfound: [], server: [], canonical: [], other: [] }
let ok = 0, checked = 0

const urls = await urlsFromSitemap()
console.log(`Crawling ${urls.length} sampled sitemap URLs (per=${PER})…\n`)

for (const { sm, url } of urls) {
  checked++
  try {
    const r = await fetch(url, { redirect: 'manual' })
    const smName = sm.split('/').pop()
    if (r.status >= 300 && r.status < 400) {
      buckets.redirect.push(`[${smName}] ${url} → ${r.status} → ${r.headers.get('location')}`)
    } else if (r.status === 404) {
      buckets.notfound.push(`[${smName}] ${url}`)
    } else if (r.status >= 500) {
      buckets.server.push(`[${smName}] ${r.status} ${url}`)
    } else if (r.status === 200) {
      const html = await r.text()
      const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)
      const canon = m ? (m[0].match(/href=["']([^"']+)["']/) || [])[1] : null
      if (canon && norm(canon) !== norm(url)) {
        buckets.canonical.push(`[${smName}] ${url}\n     canonical → ${canon}`)
      } else ok++
    } else {
      buckets.other.push(`[${smName}] ${r.status} ${url}`)
    }
  } catch (e) { buckets.other.push(`ERR ${url}: ${e.message}`) }
}

for (const [k, list] of Object.entries(buckets)) {
  if (!list.length) continue
  console.log(`\n=== ${k.toUpperCase()} (${list.length}) ===`)
  list.slice(0, 25).forEach(x => console.log('  ' + x))
  if (list.length > 25) console.log(`  … +${list.length - 25} more`)
}
console.log(`\nSummary: ${checked} checked · ${ok} clean · redirect ${buckets.redirect.length} · 404 ${buckets.notfound.length} · 5xx ${buckets.server.length} · canonical-mismatch ${buckets.canonical.length}`)
