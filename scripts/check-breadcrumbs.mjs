// Regression: fetch pages and assert every BreadcrumbList ListItem has a
// non-empty absolute `item`. Catches the GSC "missing field item" error.
//
// Usage:
//   node scripts/check-breadcrumbs.mjs                      # sample per type on prod
//   node scripts/check-breadcrumbs.mjs --base http://localhost:3000
//   node scripts/check-breadcrumbs.mjs --sitemap           # crawl full sitemap
//   node scripts/check-breadcrumbs.mjs --per 40            # cap URLs per sitemap
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const BASE = (arg('--base', 'https://balinsky.info')).replace(/\/$/, '')
const HOST = 'https://balinsky.info'
const useSitemap = args.includes('--sitemap')
const PER = parseInt(arg('--per', '1000'), 10)

// A representative hand-picked set (the flagged listing-card types) used when
// not crawling the full sitemap.
const SAMPLE = [
  '/ru/villy/o/desa-harmonis-cliff-uluwatu-75m2-1-bedroom',
  '/en/villas/o/desa-harmonis-cliff-uluwatu-75m2-1-bedroom',
]

async function urlsFromSitemap() {
  const idx = await (await fetch(`${HOST}/sitemap.xml`)).text()
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  const leaves = maps.some(u => u.endsWith('.xml')) ? maps.filter(u => u.endsWith('.xml')) : [`${HOST}/sitemap.xml`]
  const urls = []
  for (const sm of leaves) {
    const xml = await (await fetch(sm)).text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => !u.endsWith('.xml'))
    urls.push(...locs.slice(0, PER))
  }
  return [...new Set(urls)]
}

function extractBreadcrumbs(html) {
  const out = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) {
    let json
    try { json = JSON.parse(m[1]) } catch { continue }
    for (const node of Array.isArray(json) ? json : (json['@graph'] ?? [json])) {
      if (node && node['@type'] === 'BreadcrumbList') out.push(node)
    }
  }
  return out
}

function checkUrl(url, html) {
  const problems = []
  const lists = extractBreadcrumbs(html)
  if (lists.length === 0) return problems // pages without breadcrumbs are fine
  lists.forEach((bl, li) => {
    const items = bl.itemListElement ?? []
    items.forEach((it, i) => {
      const item = it.item
      const val = typeof item === 'string' ? item : item?.['@id']
      if (!val) problems.push(`[list ${li}] pos ${it.position ?? i + 1} "${it.name}" → MISSING item`)
      else if (!val.startsWith(HOST)) problems.push(`[list ${li}] pos ${it.position ?? i + 1} "${it.name}" → non-absolute item: ${val}`)
    })
  })
  return problems
}

const urls = (useSitemap ? await urlsFromSitemap() : SAMPLE).map(u => u.startsWith('http') ? u.replace(HOST, BASE) : `${BASE}${u}`)
console.log(`Checking ${urls.length} URL(s) on ${BASE}${useSitemap ? ' (sitemap)' : ' (sample)'}\n`)

let bad = 0, checked = 0
for (const url of urls) {
  try {
    const r = await fetch(url, { redirect: 'follow' })
    if (!r.ok) { console.log(`⚠️  ${r.status} ${url}`); continue }
    const problems = checkUrl(url, await r.text())
    checked++
    if (problems.length) { bad++; console.log(`❌ ${url}`); problems.forEach(p => console.log(`     ${p}`)) }
  } catch (e) { console.log(`⚠️  ERR ${url}: ${e.message}`) }
}
console.log(`\n${bad === 0 ? '✅' : '❌'} ${checked} checked, ${bad} URL(s) with missing/invalid items`)
process.exit(bad === 0 ? 0 : 1)
