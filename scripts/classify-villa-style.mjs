// Classifies the interior style of villas using gpt-4o-mini vision.
//
// Usage:
//   node scripts/classify-villa-style.mjs                  # 3 random villas (probe)
//   node scripts/classify-villa-style.mjs --all            # full catalog, write _styles.json
//   node scripts/classify-villa-style.mjs --id recXXX      # single villa
//
// Sends up to 3 photos per villa. Pure read of the photos manifest;
// nothing is written unless --all is passed.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const OPENAI_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_KEY) {
  console.error('OPENAI_API_KEY missing from .env.local')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const PHOTOS_PER_VILLA = 3

// Closed list — keeps results comparable. Adjust freely.
const STYLES = [
  'Балийский тропический',
  'Современный минимализм',
  'Тропический модерн',
  'Средиземноморский',
  'Скандинавский',
  'Японский / wabi-sabi',
  'Лофт / индустриальный',
  'Бохо / эклектика',
  'Классический',
  'Колониальный',
]

const SYSTEM_PROMPT = `Ты эксперт по интерьерному дизайну жилой недвижимости на Бали.
По фотографиям виллы определи доминирующий стиль интерьера.
Выбери ОДИН стиль из списка:
${STYLES.map(s => '- ' + s).join('\n')}

Если фотографии плохие, малоинформативные, или показывают только экстерьер — верни style: null.
Если стиль смешанный, выбери доминирующий и в notes объясни.

Верни ТОЛЬКО валидный JSON:
{"style": "<один из списка или null>", "confidence": "high"|"medium"|"low", "notes": "<1-2 фразы по-русски>"}`

async function classifyVilla(villaId, photoUrls) {
  const photos = photoUrls.slice(0, PHOTOS_PER_VILLA)
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: [
        { type: 'text', text: 'Определи стиль интерьера этой виллы по фотографиям.' },
        ...photos.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
      ] },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  }
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`OpenAI ${r.status}: ${text.slice(0, 300)}`)
  }
  const j = await r.json()
  const content = j.choices?.[0]?.message?.content ?? '{}'
  let parsed
  try { parsed = JSON.parse(content) } catch { parsed = { style: null, confidence: 'low', notes: 'parse failed: ' + content.slice(0, 100) } }
  return { villaId, photos, ...parsed, _usage: j.usage }
}

async function loadVillaName(villaId) {
  const { data } = await sb.from('raw_villas').select('data').eq('airtable_id', villaId).maybeSingle()
  if (!data) return null
  const d = data.data
  const ai = d?.['ИИ Имя']
  const name = (ai && typeof ai === 'object' && ai.value) ? ai.value : (typeof ai === 'string' ? ai : null)
  return name ?? d?.['Имя ENG']?.value ?? d?.['external_id'] ?? villaId
}

async function main() {
  const args = process.argv.slice(2)
  const all = args.includes('--all')
  const idArg = args.indexOf('--id')
  const onlyId = idArg >= 0 ? args[idArg + 1] : null

  const manifest = await (await fetch(MANIFEST_URL)).json()
  let ids = Object.keys(manifest)
  if (onlyId) ids = ids.filter(id => id === onlyId)
  else if (!all) {
    // Random 3 for probe
    ids = [...ids].sort(() => Math.random() - 0.5).slice(0, 3)
  }

  console.error(`Classifying ${ids.length} villa(s)...`)
  const out = {}
  let totalPromptTokens = 0
  let totalCompletionTokens = 0
  let n = 0
  for (const id of ids) {
    const photos = manifest[id]
    if (!Array.isArray(photos) || photos.length === 0) continue
    n++
    try {
      const name = await loadVillaName(id)
      const result = await classifyVilla(id, photos)
      totalPromptTokens += result._usage?.prompt_tokens ?? 0
      totalCompletionTokens += result._usage?.completion_tokens ?? 0
      const line = `[${n}/${ids.length}] ${id} ${name ? '— ' + name : ''}\n   style=${result.style} conf=${result.confidence}\n   notes: ${result.notes}\n`
      console.error(line)
      out[id] = { name, style: result.style, confidence: result.confidence, notes: result.notes }
    } catch (e) {
      console.error(`[${n}/${ids.length}] ${id}: ERROR ${e.message}`)
      out[id] = { error: e.message }
    }
  }

  // Cost estimate: gpt-4o-mini = $0.15/1M input, $0.60/1M output
  const cost = (totalPromptTokens * 0.15 + totalCompletionTokens * 0.60) / 1_000_000
  console.error(`\nTokens: ${totalPromptTokens} in / ${totalCompletionTokens} out  ≈ $${cost.toFixed(4)}`)

  if (all) {
    const outPath = path.join('scripts', 'out', '_villa-styles.json')
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), styles: out }, null, 2))
    console.error('Wrote', outPath)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
