// Google Search Console — demand & opportunity report.
//
// Pulls Search Analytics (queries / pages / positions) for balinsky.info and
// prints an actionable SEO report: top queries, top pages, "striking distance"
// queries (rank 8–20 — almost in the top, worth a push), and a buy-intent
// slice (купить / продажа / buy / price …) so we can size transactional demand
// before leaning the site harder into "купить недвижимость".
//
// Auth: a Google service account with read access to the GSC property. No npm
// deps — the OAuth2 JWT is signed with Node's built-in crypto.
//
// Setup (one-off, in the existing GCP project):
//   1. APIs & Services → enable "Google Search Console API".
//   2. Create a service account, add a JSON key, download it.
//   3. In Search Console → Settings → Users and permissions, add the service
//      account e-mail (…@…iam.gserviceaccount.com) as a Restricted user on the
//      balinsky.info property.
//   4. Save the JSON somewhere gitignored and point GSC_SA_KEY_FILE at it.
//
// .env.local:
//   GSC_SA_KEY_FILE=./gsc-service-account.json
//   GSC_SITE_URL=sc-domain:balinsky.info        # Domain property (default)
//   # …or for a URL-prefix property: GSC_SITE_URL=https://balinsky.info/
//
// Run:  node scripts/gsc-report.mjs [days]      (default 28)

import fs from 'node:fs'
import crypto from 'node:crypto'

// ---- env (.env.local, same tiny parser the sync scripts use) --------------
try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local — rely on real env */ }

const KEY_FILE = process.env.GSC_SA_KEY_FILE || './gsc-service-account.json'
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:balinsky.info'
const DAYS = Number(process.argv[2]) || 28

// ---- service-account auth (JWT → access token), zero deps -----------------
const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function getAccessToken() {
  let key
  try {
    key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'))
  } catch {
    console.error(`\n✗ Не найден ключ сервис-аккаунта: ${KEY_FILE}`)
    console.error('  Создайте его (см. шапку файла) и пропишите GSC_SA_KEY_FILE в .env.local.\n')
    process.exit(1)
  }
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claim}`
  const signature = b64url(
    crypto.createSign('RSA-SHA256').update(signingInput).sign(key.private_key),
  )
  const assertion = `${signingInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const j = await res.json()
  if (!res.ok || !j.access_token) {
    console.error('\n✗ Не удалось получить токен:', JSON.stringify(j))
    process.exit(1)
  }
  return j.access_token
}

// ---- Search Analytics query ----------------------------------------------
function dateNDaysAgo(n) {
  const d = new Date(Date.now() - n * 86400_000)
  return d.toISOString().slice(0, 10)
}

async function query(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await res.json()
  if (!res.ok) {
    console.error('\n✗ Ошибка API:', JSON.stringify(j))
    if (res.status === 403) {
      console.error(`  Проверьте, что сервис-аккаунт добавлен в права property ${SITE_URL}.`)
    }
    process.exit(1)
  }
  return j.rows ?? []
}

// ---- formatting -----------------------------------------------------------
const pad = (s, n) => String(s).slice(0, n).padEnd(n)
const padNum = (n, w) => String(n).padStart(w)
const pct = (x) => `${(x * 100).toFixed(1)}%`

function table(title, rows, label) {
  console.log(`\n${'─'.repeat(78)}\n${title}\n${'─'.repeat(78)}`)
  console.log(`${pad(label, 46)} ${padNum('clicks', 7)} ${padNum('impr', 8)} ${padNum('CTR', 6)} ${padNum('pos', 5)}`)
  for (const r of rows) {
    console.log(
      `${pad(r.keys[0], 46)} ${padNum(r.clicks, 7)} ${padNum(r.impressions, 8)} ${padNum(pct(r.ctr), 6)} ${padNum(r.position.toFixed(1), 5)}`,
    )
  }
}

const BUY_INTENT = /купить|куплю|продаж|на продажу|стоимость|цена|цены|buy|for sale|price|invest|инвест/i

async function main() {
  const startDate = dateNDaysAgo(DAYS)
  const endDate = dateNDaysAgo(1)
  console.log(`\nGSC отчёт · ${SITE_URL} · ${startDate} → ${endDate} (${DAYS} дней)`)

  const token = await getAccessToken()

  const byQuery = await query(token, { startDate, endDate, dimensions: ['query'], rowLimit: 1000 })
  const byPage = await query(token, { startDate, endDate, dimensions: ['page'], rowLimit: 1000 })

  const sortByImpr = (a, b) => b.impressions - a.impressions
  const sortByClicks = (a, b) => b.clicks - a.clicks

  table('ТОП-ЗАПРОСЫ (по кликам)', [...byQuery].sort(sortByClicks).slice(0, 40), 'запрос')

  // Striking distance: ranked 8–20, real impressions — one good push lands them
  // on page 1. The highest-leverage SEO work usually lives here.
  const striking = byQuery
    .filter(r => r.position >= 8 && r.position <= 20 && r.impressions >= 20)
    .sort(sortByImpr)
    .slice(0, 40)
  table('STRIKING DISTANCE (поз. 8–20, есть показы → дожать)', striking, 'запрос')

  // Buy-intent slice — sizes transactional demand for the "купить" pivot.
  const buyIntent = byQuery.filter(r => BUY_INTENT.test(r.keys[0])).sort(sortByImpr).slice(0, 40)
  table('ТРАНЗАКЦИОННЫЕ ЗАПРОСЫ (купить / продажа / buy / price)', buyIntent, 'запрос')

  table('ТОП-СТРАНИЦЫ (по кликам)', [...byPage].sort(sortByClicks).slice(0, 30), 'страница')

  // Persist raw rows for follow-up analysis without re-hitting the API.
  const out = {
    site: SITE_URL, startDate, endDate,
    generatedAt: new Date().toISOString(),
    byQuery, byPage,
  }
  fs.mkdirSync('reports', { recursive: true })
  fs.writeFileSync('reports/gsc-latest.json', JSON.stringify(out, null, 2))
  console.log(`\n✓ Сырьё сохранено в reports/gsc-latest.json (${byQuery.length} запросов, ${byPage.length} страниц)\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
