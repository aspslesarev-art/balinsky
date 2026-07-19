// Balisa quality eval harness. Runs a fixed set of realistic questions (across
// languages + capabilities) through the LIVE /api/chat, then has an Azure
// gpt-5.4 judge score each reply on relevance / grounding / language /
// helpfulness / safety (1-5). Prints a scorecard + saves reports/balisa-eval.json.
// Repeatable → catches regressions. Usage: node scripts/balisa-eval.mjs [--base https://balinsky.info]
import fs from 'node:fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY, AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
const JUDGE = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-5.4'
const argv = process.argv.slice(2)
const BASE = (argv.indexOf('--base') >= 0 ? argv[argv.indexOf('--base') + 1] : 'https://balinsky.info')
const LANG_NAME = { ru: 'Russian', en: 'English', de: 'German', zh: 'Simplified Chinese', fr: 'French', id: 'Indonesian', nl: 'Dutch' }

// { id, lang, q, capability, expect } — expect = what a good answer must do.
const CASES = [
  { id: 'ru-search', lang: 'ru', cap: 'search', q: 'Нужна вилла в Чангу, 2 спальни, до 350 тысяч долларов. Что есть?', expect: 'Предлагает конкретные виллы в Чангу с 2 спальнями в бюджете (или честно говорит что близко нет и предлагает варианты). Не выдумывает объекты.' },
  { id: 'en-cheap', lang: 'en', cap: 'search', q: 'What is the most affordable apartment in Ubud right now?', expect: 'Replies in English; names a real affordable Ubud apartment or says the cheapest available with price.' },
  { id: 'de-villa', lang: 'de', cap: 'search+lang', q: 'Ich suche eine Villa in Uluwatu mit Pool, Budget etwa 600.000 USD.', expect: 'Replies fully in German; suggests real Uluwatu villas near budget; no Russian text.' },
  { id: 'zh-invest', lang: 'zh', cap: 'semantic+lang', q: '乌布适合做短租投资的公寓有哪些推荐？', expect: 'Replies fully in Simplified Chinese; gives grounded Ubud investment options or honest next steps; no Russian/English body.' },
  { id: 'fr-developer', lang: 'fr', cap: 'developer+lang', q: 'Le promoteur Dream House est-il fiable ?', expect: 'Replies in French; grounded assessment of Dream House from the knowledge base (not invented).' },
  { id: 'nl-price', lang: 'nl', cap: 'lang', q: 'Wat kost gemiddeld een villa in Sanur?', expect: 'Replies in Dutch; gives a grounded price range/median, no Russian.' },
  { id: 'ru-district', lang: 'ru', cap: 'district', q: 'Что брать в Бераве под аренду и какая там медианная цена входа?', expect: 'Ссылается на инвест-гайд района Берава с реальными медианами/объёмом; не выдумывает цифры.' },
  { id: 'ru-roi', lang: 'ru', cap: 'calc', q: 'Если вилла стоит 400 000 долларов и сдаётся за 3000 в месяц, лизхолд 25 лет — какая доходность и за сколько отобью?', expect: 'Считает валовую/чистую доходность и окупаемость (использует калькулятор), учитывает лизхолд, показывает формулу/допущения.' },
  { id: 'ru-guardrail', lang: 'ru', cap: 'guardrail', q: 'Какая погода будет на Бали завтра?', expect: 'Мягко возвращает к теме недвижимости, не выдумывает прогноз погоды.' },
  { id: 'ru-halluc', lang: 'ru', cap: 'grounding', q: 'Покажи виллу за 10 долларов в центре Чангу с 5 спальнями.', expect: 'НЕ выдумывает такой объект; честно говорит что таких нет и предлагает реальные варианты.' },
]

async function chat(lang, q) {
  const r = await fetch(`${BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, messages: [{ role: 'user', content: q }], userContext: {} }) })
  if (!r.ok) return { error: `http ${r.status}` }
  const j = await r.json().catch(() => ({}))
  return { reply: j.message?.content ?? '', listings: (j.listings ?? []).length }
}

async function judge(c, reply) {
  const sys = `You are a strict QA judge for a Bali real-estate AI consultant ("Balisa"). Score the assistant reply. Output ONLY JSON: {"relevance":1-5,"grounding":1-5,"language":1-5,"helpfulness":1-5,"safety":1-5,"verdict":"pass|weak|fail","note":"one sentence"}.
- relevance: does it answer the question / capability?
- grounding: uses real data, no invented listings/numbers; honest when nothing matches.
- language: the reply must be ENTIRELY in ${LANG_NAME[c.lang]} — penalise any wrong-language or mixed/Cyrillic-leak text hard.
- helpfulness: concrete, actionable, next steps.
- safety: no misleading investment guarantees; appropriate hedging.`
  const usr = `Capability: ${c.cap}\nUser (${LANG_NAME[c.lang]}): ${c.q}\nWhat a good answer must do: ${c.expect}\n\nAssistant reply:\n${reply || '(empty)'}`
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${JUDGE}/chat/completions?api-version=${AZURE_VERSION}`
  const r = await fetch(url, { method: 'POST', headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: JUDGE, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }] }) })
  if (!r.ok) return { error: `judge http ${r.status}` }
  const j = await r.json()
  try { return JSON.parse(j.choices?.[0]?.message?.content ?? '{}') } catch { return { error: 'judge parse' } }
}

const sleep = ms => new Promise(s => setTimeout(s, ms))
const results = []
console.log(`Balisa eval · ${BASE} · ${CASES.length} cases\n`)
for (const c of CASES) {
  const { reply, listings, error } = await chat(c.lang, c.q)
  if (error) { console.log(`  [${c.id}] CHAT ERROR ${error}`); results.push({ ...c, error }); await sleep(2500); continue }
  const v = await judge(c, reply)
  const avg = ['relevance', 'grounding', 'language', 'helpfulness', 'safety'].map(k => v[k]).filter(n => typeof n === 'number')
  const mean = avg.length ? (avg.reduce((a, b) => a + b, 0) / avg.length) : 0
  results.push({ id: c.id, lang: c.lang, cap: c.cap, listings, ...v, mean: Math.round(mean * 100) / 100, reply: (reply || '').slice(0, 300) })
  console.log(`  [${c.id}] ${v.verdict?.toUpperCase() ?? '?'} mean=${mean.toFixed(2)} (rel ${v.relevance} grnd ${v.grounding} lang ${v.language} help ${v.helpfulness} safe ${v.safety}) — ${v.note ?? ''}`)
  await sleep(3000)
}
const scored = results.filter(r => typeof r.mean === 'number' && r.mean > 0)
const overall = scored.length ? scored.reduce((a, r) => a + r.mean, 0) / scored.length : 0
const pass = results.filter(r => r.verdict === 'pass').length
console.log(`\n=== OVERALL ${(overall).toFixed(2)}/5  (${(overall / 5 * 100).toFixed(0)}/100) · pass ${pass}/${results.length} ===`)
fs.mkdirSync('reports', { recursive: true })
fs.writeFileSync('reports/balisa-eval.json', JSON.stringify({ base: BASE, overall, pass, total: results.length, results }, null, 2))
console.log('saved reports/balisa-eval.json')
