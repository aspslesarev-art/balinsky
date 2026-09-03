// Google Search Console — динамика (рост/падение), а не срез.
//
// gsc-report.mjs показывает «что есть сейчас». Этот скрипт отвечает на вопрос
// «есть ли рост»: помесячные итоги, сравнение последних N дней с предыдущими
// N днями и с тем же периодом год назад, а также разбивки, которые двигают
// цифру (страны, устройства, разделы сайта) и списки запросов/страниц,
// которые выросли и просели сильнее всего.
//
// Auth — тот же, что у gsc-report.mjs (ADC пользователя или SA-ключ):
//   gcloud auth application-default login \
//     --scopes=https://www.googleapis.com/auth/webmasters.readonly,https://www.googleapis.com/auth/cloud-platform
//
// Run:  node scripts/gsc-trend.mjs [days]        (default 28)

import fs from 'node:fs'
import crypto from 'node:crypto'

try {
  const env = fs.readFileSync('.env.local', 'utf8')
  for (const l of env.split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* no .env.local */ }

const KEY_FILE = process.env.GSC_SA_KEY_FILE || './gsc-service-account.json'
const ADC_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || `${process.env.HOME}/.config/gcloud/application_default_credentials.json`
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:balinsky.info'
const DAYS = Number(process.argv[2]) || 28

const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const QUOTA_PROJECT = process.env.GSC_QUOTA_PROJECT || readJson(ADC_FILE)?.quota_project_id || null

async function tokenRequest(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const j = await res.json()
  if (!res.ok || !j.access_token) {
    console.error('\n✗ Не удалось получить токен:', JSON.stringify(j))
    console.error('  Скорее всего протух ADC. Выполните:')
    console.error('    gcloud auth application-default login \\')
    console.error('      --scopes=https://www.googleapis.com/auth/webmasters.readonly,https://www.googleapis.com/auth/cloud-platform\n')
    process.exit(1)
  }
  return j.access_token
}

async function getAccessToken() {
  const adc = readJson(ADC_FILE)
  if (adc?.type === 'authorized_user') {
    return tokenRequest({
      grant_type: 'refresh_token',
      client_id: adc.client_id,
      client_secret: adc.client_secret,
      refresh_token: adc.refresh_token,
    })
  }
  const key = readJson(KEY_FILE)
  if (!key) {
    console.error('\n✗ Нет учётных данных (ни ADC, ни ключа сервис-аккаунта).\n')
    process.exit(1)
  }
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }))
  const input = `${header}.${claim}`
  const sig = b64url(crypto.createSign('RSA-SHA256').update(input).sign(key.private_key))
  return tokenRequest({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${sig}` })
}

async function query(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(QUOTA_PROJECT ? { 'x-goog-user-project': QUOTA_PROJECT } : {}),
    },
    body: JSON.stringify(body),
  })
  const j = await res.json()
  if (!res.ok) { console.error('\n✗ Ошибка API:', JSON.stringify(j)); process.exit(1) }
  return j.rows ?? []
}

const iso = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400_000))
const pctStr = (x) => `${(x * 100).toFixed(1)}%`
const pad = (s, n) => String(s).slice(0, n).padEnd(n)
const padN = (s, n) => String(s).padStart(n)
const delta = (cur, prev) => {
  if (!prev) return cur ? '  new' : '   —'
  const d = (cur / prev - 1) * 100
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`
}
const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0)

/** Раздел сайта по URL — чтобы видеть, что именно растёт. */
function section(url) {
  const p = url.replace(/^https?:\/\/[^/]+/, '')
  const seg = p.split('/').filter(Boolean)
  if (!seg.length) return '/ (главная)'
  const LANGS = new Set(['en', 'id', 'fr', 'de', 'zh', 'nl', 'ban', 'pl', 'uk'])
  const lang = LANGS.has(seg[0]) ? seg.shift() : 'ru'
  const top = seg[0] ?? '(главная)'
  return `${lang}:/${top}`
}

async function totals(token, startDate, endDate) {
  const rows = await query(token, { startDate, endDate, dimensions: ['date'], rowLimit: 500 })
  const clicks = sum(rows, r => r.clicks)
  const impressions = sum(rows, r => r.impressions)
  return {
    clicks, impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? sum(rows, r => r.position * r.impressions) / impressions : 0,
    rows,
  }
}

function head(title) { console.log(`\n${'─'.repeat(84)}\n${title}\n${'─'.repeat(84)}`) }

/** Сравнение двух периодов по одному измерению. */
async function compare(token, dim, cur, prev, { title, label, limit = 20, minClicks = 0, key = r => r.keys[0] }) {
  const [a, b] = await Promise.all([
    query(token, { ...cur, dimensions: [dim], rowLimit: 5000 }),
    query(token, { ...prev, dimensions: [dim], rowLimit: 5000 }),
  ])
  const agg = (rows) => {
    const m = new Map()
    for (const r of rows) {
      const k = key(r)
      const v = m.get(k) || { clicks: 0, impressions: 0, posW: 0 }
      v.clicks += r.clicks; v.impressions += r.impressions; v.posW += r.position * r.impressions
      m.set(k, v)
    }
    return m
  }
  const A = agg(a), B = agg(b)
  const keys = [...new Set([...A.keys(), ...B.keys()])]
  const merged = keys.map(k => {
    const x = A.get(k) || { clicks: 0, impressions: 0, posW: 0 }
    const y = B.get(k) || { clicks: 0, impressions: 0, posW: 0 }
    return {
      k,
      clicks: x.clicks, prevClicks: y.clicks, diff: x.clicks - y.clicks,
      impressions: x.impressions, prevImpressions: y.impressions, imprDiff: x.impressions - y.impressions,
      pos: x.impressions ? x.posW / x.impressions : 0,
      prevPos: y.impressions ? y.posW / y.impressions : 0,
    }
  })
  const print = (rows) => {
    console.log(`${pad(label, 42)} ${padN('клики', 6)} ${padN('было', 6)} ${padN('Δ', 6)} ${padN('показы', 8)} ${padN('Δ пок.', 8)} ${padN('поз.', 6)}`)
    for (const r of rows) {
      const posMove = r.prevPos && r.pos ? (r.prevPos - r.pos).toFixed(1) : '—'
      console.log(
        `${pad(r.k, 42)} ${padN(r.clicks, 6)} ${padN(r.prevClicks, 6)} ${padN((r.diff >= 0 ? '+' : '') + r.diff, 6)} ` +
        `${padN(r.impressions, 8)} ${padN((r.imprDiff >= 0 ? '+' : '') + r.imprDiff, 8)} ${padN(r.pos.toFixed(1), 6)} ${posMove !== '—' ? `(${posMove >= 0 ? '↑' : '↓'}${Math.abs(posMove)})` : ''}`,
      )
    }
  }
  head(title)
  print(merged.filter(r => r.clicks + r.prevClicks >= minClicks).sort((x, y) => y.clicks - x.clicks).slice(0, limit))

  head(`${title} · ВЫРОСЛИ сильнее всего`)
  print(merged.sort((x, y) => y.diff - x.diff).slice(0, 12))

  head(`${title} · ПРОСЕЛИ сильнее всего`)
  print(merged.sort((x, y) => x.diff - y.diff).slice(0, 12))

  return merged
}

async function main() {
  const token = await getAccessToken()
  const cur = { startDate: daysAgo(DAYS + 2), endDate: daysAgo(2) }
  const prev = { startDate: daysAgo(DAYS * 2 + 2), endDate: daysAgo(DAYS + 3) }
  const yearAgo = { startDate: daysAgo(DAYS + 367), endDate: daysAgo(367) }

  console.log(`\nGSC ДИНАМИКА · ${SITE_URL}`)
  console.log(`период        : ${cur.startDate} → ${cur.endDate} (${DAYS} дн.)`)
  console.log(`сравнение с   : ${prev.startDate} → ${prev.endDate}`)

  const [C, P, Y] = await Promise.all([
    totals(token, cur.startDate, cur.endDate),
    totals(token, prev.startDate, prev.endDate),
    totals(token, yearAgo.startDate, yearAgo.endDate).catch(() => null),
  ])

  head('ИТОГО')
  console.log(`${pad('', 14)} ${padN('сейчас', 10)} ${padN('пред. период', 14)} ${padN('Δ', 8)} ${padN('год назад', 12)} ${padN('Δ г/г', 8)}`)
  const line = (name, c, p, y, fmt = (v) => v) =>
    console.log(`${pad(name, 14)} ${padN(fmt(c), 10)} ${padN(fmt(p), 14)} ${padN(delta(c, p), 8)} ${padN(y == null ? '—' : fmt(y), 12)} ${padN(y ? delta(c, y) : '—', 8)}`)
  line('клики', C.clicks, P.clicks, Y?.clicks)
  line('показы', C.impressions, P.impressions, Y?.impressions)
  line('CTR', C.ctr, P.ctr, Y?.ctr, pctStr)
  line('ср. позиция', C.position, P.position, Y?.position, (v) => v.toFixed(1))

  // Помесячная динамика за 16 месяцев — общий тренд без шума недель.
  const monthStart = iso(new Date(Date.now() - 480 * 86400_000))
  const daily = await query(token, { startDate: monthStart, endDate: daysAgo(2), dimensions: ['date'], rowLimit: 1000 })
  const byMonth = new Map()
  for (const r of daily) {
    const m = r.keys[0].slice(0, 7)
    const v = byMonth.get(m) || { clicks: 0, impressions: 0 }
    v.clicks += r.clicks; v.impressions += r.impressions
    byMonth.set(m, v)
  }
  head('ПО МЕСЯЦАМ (клики / показы)')
  const maxClicks = Math.max(...[...byMonth.values()].map(v => v.clicks), 1)
  for (const [m, v] of [...byMonth.entries()].sort()) {
    console.log(`${m}  ${padN(v.clicks, 7)}  ${padN(v.impressions, 9)}  ${'█'.repeat(Math.round(v.clicks / maxClicks * 46))}`)
  }

  await compare(token, 'query', cur, prev, { title: 'ЗАПРОСЫ', label: 'запрос', limit: 25, minClicks: 1 })
  await compare(token, 'page', cur, prev, { title: 'РАЗДЕЛЫ САЙТА', label: 'раздел', limit: 25, key: r => section(r.keys[0]) })
  await compare(token, 'page', cur, prev, { title: 'СТРАНИЦЫ', label: 'страница', limit: 25, minClicks: 1, key: r => r.keys[0].replace(/^https?:\/\/[^/]+/, '') })
  await compare(token, 'country', cur, prev, { title: 'СТРАНЫ', label: 'страна', limit: 15 })
  await compare(token, 'device', cur, prev, { title: 'УСТРОЙСТВА', label: 'устройство', limit: 5 })

  fs.mkdirSync('reports', { recursive: true })
  fs.writeFileSync('reports/gsc-trend.json', JSON.stringify({
    site: SITE_URL, generatedAt: new Date().toISOString(),
    windows: { cur, prev, yearAgo },
    totals: { cur: { ...C, rows: undefined }, prev: { ...P, rows: undefined }, yearAgo: Y && { ...Y, rows: undefined } },
    byMonth: Object.fromEntries(byMonth),
    daily,
  }, null, 2))
  console.log('\n✓ Сохранено в reports/gsc-trend.json\n')
}

main().catch(e => { console.error(e); process.exit(1) })
