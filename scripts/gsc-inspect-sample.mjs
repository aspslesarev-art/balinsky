// GSC URL Inspection — stratified sample across sitemaps, bucketed by the
// coverage state Google actually assigns + structured-data (rich) verdict.
// Surfaces the real "Page indexing" errors the Sitemaps API can't show.
//
// Auth: ADC (gcloud auth application-default login). The v1 urlInspection
// endpoint needs a quota project → x-goog-user-project header.
// Usage: node scripts/gsc-inspect-sample.mjs [--per 6] [--project balinsky-info-maps]
import { execSync } from 'node:child_process'

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const PER = parseInt(arg('--per', '6'), 10)          // URLs sampled per child sitemap
const PROJECT = arg('--project', 'balinsky-info-maps')
const SITE = 'sc-domain:balinsky.info'
const HOST = 'https://balinsky.info'

const TOKEN = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim()
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function childSitemaps() {
  const idx = await (await fetch(`${HOST}/sitemap.xml`)).text()
  const maps = [...idx.matchAll(/<loc>([^<]+\.xml)<\/loc>/g)].map(m => m[1])
  return maps.length ? maps : [`${HOST}/sitemap.xml`]
}

async function sampleUrls() {
  const out = []
  // Always inspect the locale homepages + a couple of hub pages.
  const fixed = ['/', '/ru/apartamenty', '/ru/villy', '/ru/zhilye-kompleksy', '/en/apartments', '/de/apartments', '/zh/gongyu', '/fr/appartements']
  for (const p of fixed) out.push({ sm: 'fixed', url: HOST + p })
  for (const sm of await childSitemaps()) {
    const xml = await (await fetch(sm)).text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => !u.endsWith('.xml'))
    const step = Math.max(1, Math.floor(locs.length / PER))
    for (let i = 0; i < locs.length && out.filter(o => o.sm === sm).length < PER; i += step) out.push({ sm, url: locs[i] })
  }
  return out
}

async function inspect(url) {
  const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'x-goog-user-project': PROJECT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
  })
  const j = await r.json().catch(() => ({}))
  if (j.error) return { error: `${j.error.code} ${j.error.status}` }
  const isr = j.inspectionResult?.indexStatusResult ?? {}
  const rich = j.inspectionResult?.richResultsResult?.verdict ?? null
  return { verdict: isr.verdict, coverage: isr.coverageState, fetch: isr.pageFetchState, robots: isr.robotsTxtState, rich, crawl: (isr.lastCrawlTime || '').slice(0, 10) }
}

const urls = await sampleUrls()
console.log(`Inspecting ${urls.length} URLs (per=${PER})…\n`)
const byCoverage = new Map()
const problems = []
let done = 0
for (const { url } of urls) {
  const r = await inspect(url)
  done++
  if (r.error) { console.log(`  [err ${r.error}] ${url}`); await sleep(1500); continue }
  const key = r.coverage || '(none)'
  if (!byCoverage.has(key)) byCoverage.set(key, [])
  byCoverage.get(key).push(url)
  // Anything that isn't a clean indexed/canonical/alternate state, or a rich FAIL, is a candidate problem.
  const okStates = ['Submitted and indexed', 'Indexed, not submitted in sitemap']
  if (!okStates.includes(key) || r.rich === 'FAIL') problems.push({ url, ...r })
  await sleep(1200)
}

console.log('\n=== Coverage buckets ===')
for (const [k, v] of [...byCoverage.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(v.length).padStart(3)}  ${k}`)
}
console.log('\n=== Problem / non-indexed samples ===')
for (const p of problems.slice(0, 40)) {
  console.log(`  [${p.coverage}]${p.rich === 'FAIL' ? ' RICH-FAIL' : ''} fetch=${p.fetch} robots=${p.robots}\n     ${p.url.replace(HOST, '')}`)
}
console.log(`\n${done} inspected · ${problems.length} flagged`)
