// Google Search Console — sitemap submission manager.
//
// Lists / submits / deletes the sitemaps registered for balinsky.info in GSC.
// The single sitemap we want submitted is https://balinsky.info/sitemap.xml
// (the index). Older per-cluster names (arenda.xml, arenda-2.xml, …) were
// dropped from the site (rental excluded for crawl budget — see
// lib/sitemap-data.ts) and now 404, so GSC keeps reporting them as
// "Couldn't fetch". This tool removes those stale entries.
//
// Auth: reuses Application Default Credentials, same as scripts/gsc-report.mjs.
//   - `list` needs the webmasters.readonly scope (already granted).
//   - `submit` / `delete` need the WRITE scope. Re-auth once:
//       gcloud auth application-default login \
//         --scopes=https://www.googleapis.com/auth/webmasters,https://www.googleapis.com/auth/cloud-platform
//
// Usage:
//   node scripts/gsc-sitemaps.mjs list
//   node scripts/gsc-sitemaps.mjs submit https://balinsky.info/sitemap.xml
//   node scripts/gsc-sitemaps.mjs delete https://balinsky.info/sitemap/arenda.xml
//   node scripts/gsc-sitemaps.mjs prune          # delete every registered
//                                                 # sitemap except sitemap.xml

import fs from 'node:fs'

// ---- env (.env.local, same tiny parser the sync scripts use) --------------
try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local — rely on real env */ }

const ADC_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || `${process.env.HOME}/.config/gcloud/application_default_credentials.json`
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:balinsky.info'
const KEEP = process.env.GSC_KEEP_SITEMAP || 'https://balinsky.info/sitemap.xml'

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }

const QUOTA_PROJECT =
  process.env.GSC_QUOTA_PROJECT || readJson(ADC_FILE)?.quota_project_id || null

async function tokenRequest(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const j = await res.json()
  if (!res.ok || !j.access_token) {
    console.error('\n✗ Не удалось получить токен:', JSON.stringify(j))
    process.exit(1)
  }
  return j.access_token
}

async function getAccessToken() {
  const adc = readJson(ADC_FILE)
  if (adc?.type !== 'authorized_user') {
    console.error('\n✗ Нет ADC (authorized_user). Выполните один раз:')
    console.error('    gcloud auth application-default login \\')
    console.error('      --scopes=https://www.googleapis.com/auth/webmasters,https://www.googleapis.com/auth/cloud-platform\n')
    process.exit(1)
  }
  return tokenRequest({
    grant_type: 'refresh_token',
    client_id: adc.client_id,
    client_secret: adc.client_secret,
    refresh_token: adc.refresh_token,
  })
}

const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps`
const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  ...(QUOTA_PROJECT ? { 'x-goog-user-project': QUOTA_PROJECT } : {}),
})

async function apiCall(token, method, feedpath) {
  const url = feedpath ? `${base}/${encodeURIComponent(feedpath)}` : base
  const res = await fetch(url, { method, headers: authHeaders(token) })
  if (method === 'GET') {
    const j = await res.json()
    if (!res.ok) { console.error('\n✗ Ошибка API:', JSON.stringify(j)); process.exit(1) }
    return j
  }
  if (!res.ok) {
    const body = await res.text()
    console.error(`\n✗ ${method} ${feedpath} → HTTP ${res.status}: ${body}`)
    if (res.status === 403) {
      console.error('  Нужен write-scope. Пере-авторизуйтесь:')
      console.error('    gcloud auth application-default login \\')
      console.error('      --scopes=https://www.googleapis.com/auth/webmasters,https://www.googleapis.com/auth/cloud-platform')
    }
    process.exit(1)
  }
  return null
}

async function list(token) {
  const j = await apiCall(token, 'GET')
  const rows = j.sitemap ?? []
  console.log(`\nЗарегистрированные sitemap в GSC (${SITE_URL}): ${rows.length}\n`)
  for (const s of rows) {
    const errors = Number(s.errors || 0)
    const warnings = Number(s.warnings || 0)
    const fetched = s.lastDownloaded ? s.lastDownloaded.slice(0, 10) : '—'
    const flag = s.isPending ? 'PENDING' : errors ? `ERRORS:${errors}` : warnings ? `WARN:${warnings}` : 'ok'
    console.log(`  [${flag.padEnd(9)}] fetched ${fetched}  ${s.path}`)
  }
  return rows
}

async function main() {
  const [cmd, arg] = process.argv.slice(2)
  const token = await getAccessToken()

  if (!cmd || cmd === 'list') { await list(token); return }

  if (cmd === 'submit') {
    if (!arg) { console.error('usage: submit <sitemap-url>'); process.exit(1) }
    await apiCall(token, 'PUT', arg)
    console.log(`✓ submitted ${arg}`)
    return
  }

  if (cmd === 'delete') {
    if (!arg) { console.error('usage: delete <sitemap-url>'); process.exit(1) }
    await apiCall(token, 'DELETE', arg)
    console.log(`✓ deleted ${arg}`)
    return
  }

  if (cmd === 'prune') {
    const rows = await apiCall(token, 'GET').then(j => j.sitemap ?? [])
    const stale = rows.filter(s => s.path !== KEEP)
    if (!stale.length) { console.log(`\nНечего удалять — оставлен только ${KEEP}`); return }
    console.log(`\nУдаляю ${stale.length} устаревших sitemap (оставляю ${KEEP}):`)
    for (const s of stale) {
      await apiCall(token, 'DELETE', s.path)
      console.log(`  ✓ deleted ${s.path}`)
    }
    return
  }

  console.error(`Unknown command: ${cmd}. Use list | submit <url> | delete <url> | prune`)
  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
