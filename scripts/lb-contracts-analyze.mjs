// Разбор драфтов договоров LB Group через Azure: зелёные/красные флаги
// + оценка баланса интересов «покупатель / застройщик».
//
// Вход — тексты, выкачанные scripts/lb-contracts-fetch.mjs в reports/lb-legal/.
// Выход по умолчанию НИКУДА не публикуется: _verdict.json на проект + сводка
// REVIEW.md. Запись в поля ЖК — только по --apply (как в legal-audit-ai.mjs).
//
//   node scripts/lb-contracts-analyze.mjs [--only <slug>] [--refresh] [--apply] [--force]
//
// Готовый _verdict.json переиспользуется — заново к модели ходим по --refresh.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const envFile = fs.readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
const AZURE_MODEL = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-5.4'
if (!AZURE_KEY || !AZURE_ENDPOINT) throw new Error('нет AZURE_OPENAI_* в .env.local')

const IN_DIR = 'reports/lb-legal'
const MAX_DOC_CHARS = 45_000
const MAX_TOTAL_CHARS = 260_000

// Поля на raw_complexes (см. lib/legal-audit.ts).
const OK_FIELD = 'Юр-проверка: в порядке'
const Q_FIELD = 'Юр-проверка: вопросы'
const BALANCE_FIELD = 'Юр-проверка: баланс'
const BALANCE_NOTES_FIELD = 'Юр-проверка: баланс обоснование'

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const apply = args.includes('--apply')
const force = args.includes('--force')
const refresh = args.includes('--refresh')

// ——— отбор документов ————————————————————————————————————————————————

// Не русские версии тех же договоров и служебные пометки самого застройщика.
const DROP = [/\bENGL?\b|English|Англ/i, /\bPOL\b|Polish|Польск|tlumaczenie/i, /\bUKR\b|Ukrain|Укр/i, /НЕ БРАТЬ/i, /Копия/i]
// Тип договора определяет, что в наборе оставить: по одному представителю.
const TYPES = [
  ['reservation', /reservation|бронирован|booking/i],
  ['moa', /\bMOA\b/i],
  ['investment', /invest|инвестирован/i],
  ['leasehold-transfer', /leasehold[_ ]?transfer|лизхолда/i],
  ['lease', /lease|аренд|sewa/i],
  ['construction', /construction|строитель/i],
  ['management', /management[_ ]?agreement|договор_?[ _]?управлени/i],
  ['service', /service[_ ]?contract|обслуживани/i],
  ['other', /.*/],
]

function classify(name) {
  return TYPES.find(([, re]) => re.test(name))[0]
}

/** Один представитель на тип: самый длинный русский вариант. */
function selectDocs(index) {
  const usable = index.files.filter(f => !f.error && f.chars > 500 && !f.duplicateOf)
  const ru = usable.filter(f => {
    const full = [...f.trail, f.name].join(' / ')
    return !DROP.some(re => re.test(full))
  })
  const pool = ru.length > 0 ? ru : usable
  const best = new Map()
  for (const f of pool) {
    const type = classify([...f.trail, f.name].join(' / '))
    const current = best.get(type)
    if (!current || f.chars > current.chars) best.set(type, f)
  }
  return [...best.values()].sort((a, b) => b.chars - a.chars)
}

// ——— промпт ————————————————————————————————————————————————————————

const RUBRIC = `
Оцени БАЛАНС интересов по десяти осям. По каждой оси реши, в чью пользу
условие: покупателя, паритет или застройщика.
 1. Ответственность за срыв срока сдачи: есть ли пени застройщику, их размер и потолок,
    и симметричны ли они пеням покупателю за просрочку платежа.
 2. Право покупателя расторгнуть договор и вернуть уплаченное.
 3. Удержания и штрафы при выходе покупателя (в т.ч. невозврат брони).
 4. Право застройщика в одностороннем порядке менять проект, площадь, спецификацию, сроки.
 5. Форс-мажор: насколько широко определён и как долго освобождает от обязательств.
 6. Гарантия на построенное: срок, что покрывает, сроки устранения дефектов.
 7. Оформление прав (переход лизхолда/SHM, регистрация у нотариуса, сроки, кто платит налоги и сборы).
 8. Разрешение споров: юрисдикция, арбитраж, язык, приоритет языковой версии.
 9. Управление и доход: срок обязательного управления, комиссия УК, право сменить УК,
    как считается и когда выплачивается доход, есть ли гарантия доходности и чем обеспечена.
10. Перепродажа, уступка прав, наследование.

balanceBuyer — доля в пользу покупателя от 0 до 100 (50 = паритет). Это не оценка
проекта и не оценка застройщика, а только распределение прав и рисков по тексту.
Шкала: 45–55 сбалансированный рыночный договор; 30–45 умеренный перекос к застройщику
(типично для Бали); 15–30 сильный перекос; ниже 15 — договор защищает только застройщика.
`.trim()

const SYSTEM = `Ты — юрист по недвижимости Индонезии (Бали), проверяешь драфты договоров
застройщика для покупателя. Пиши по-русски, сухо и конкретно, без маркетинга и без воды.

ЖЁСТКИЕ ПРАВИЛА:
• Опирайся ТОЛЬКО на текст переданных договоров. Ничего не додумывай.
• В каждом пункте ссылайся на номер статьи/пункта договора, если он есть в тексте.
• Числа, сроки, проценты и суммы бери дословно из текста.
• Если по какой-то оси в договорах ничего нет — это красный флаг «в договоре не урегулировано», а не выдумка.

${RUBRIC}

Ответь ОДНИМ JSON-объектом без markdown-обёртки:
{
  "ok": ["Заголовок пункта. Детали одним абзацем.", ...],
  "questions": ["Заголовок пункта. Детали одним абзацем.", ...],
  "balanceBuyer": <число 0-100>,
  "balanceSummary": "Одно предложение: в чью пользу перекос и из-за чего в первую очередь.",
  "balanceNotes": ["Ось. Что именно в договоре и в чью пользу.", ...]
}

Требования к пунктам:
• ok — 5–9 пунктов: что в договорах реально защищает покупателя.
• questions — 6–12 пунктов: перекосы, пробелы и что запросить у застройщика до подписания.
• balanceNotes — по одному пункту на каждую из десяти осей, в том же порядке.
• Каждый пункт — ОДНА строка, начинается с короткого заголовка, дальше «. » и детали.
  Внутри пункта не переноси строки и не используй списки и markdown.`

async function askAzure(messages, maxTokens = 8000) {
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_MODEL}/chat/completions?api-version=${AZURE_VERSION}`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AZURE_MODEL, temperature: 0.1, max_completion_tokens: maxTokens,
        response_format: { type: 'json_object' }, messages,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      return json.choices?.[0]?.message?.content ?? ''
    }
    const body = (await res.text()).slice(0, 300)
    if (res.status !== 429 && res.status < 500) throw new Error(`azure ${res.status}: ${body}`)
    await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
  }
  throw new Error('azure: три попытки не прошли')
}

function buildUserMessage(index, docs) {
  let budget = MAX_TOTAL_CHARS
  const parts = [`Проект: ${index.label}. Юрлицо застройщика: ${index.pt}.`, '']
  for (const doc of docs) {
    if (budget <= 0) break
    const raw = fs.readFileSync(path.join(IN_DIR, index.slug, doc.file), 'utf8')
    const slice = raw.slice(0, Math.min(MAX_DOC_CHARS, budget))
    budget -= slice.length
    parts.push(`===== ДОКУМЕНТ: ${doc.name} (${doc.trail.join(' / ')}) =====`, slice, '')
  }
  return parts.join('\n')
}

function normalizeItems(value) {
  if (!Array.isArray(value)) return []
  return value
    .map(v => String(v ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

async function analyze(slug) {
  // Разбор стоит денег, поэтому готовый вердикт переиспользуем: повторный
  // прогон только по --refresh.
  const cached = path.join(IN_DIR, slug, '_verdict.json')
  if (!refresh && fs.existsSync(cached)) {
    const verdict = JSON.parse(fs.readFileSync(cached, 'utf8'))
    console.log('  из кэша _verdict.json')
    return verdict
  }
  const index = JSON.parse(fs.readFileSync(path.join(IN_DIR, slug, '_index.json'), 'utf8'))
  const docs = selectDocs(index)
  if (docs.length === 0) throw new Error('нет пригодных документов')
  console.log(`  документы: ${docs.map(d => `${d.name} (${d.chars})`).join('; ')}`)

  const raw = await askAzure([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: buildUserMessage(index, docs) },
  ])
  let parsed
  try {
    parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''))
  } catch {
    throw new Error(`не разобрался ответ модели: ${raw.slice(0, 200)}`)
  }

  const balanceBuyer = Math.max(0, Math.min(100, Math.round(Number(parsed.balanceBuyer))))
  if (!Number.isFinite(balanceBuyer)) throw new Error('модель не вернула balanceBuyer')

  const verdict = {
    slug,
    label: index.label,
    pt: index.pt,
    sources: docs.map(d => ({ name: d.name, trail: d.trail, chars: d.chars })),
    ok: normalizeItems(parsed.ok),
    questions: normalizeItems(parsed.questions),
    balanceBuyer,
    balanceSummary: String(parsed.balanceSummary ?? '').replace(/\s+/g, ' ').trim(),
    balanceNotes: normalizeItems(parsed.balanceNotes),
  }
  fs.writeFileSync(path.join(IN_DIR, slug, '_verdict.json'), JSON.stringify(verdict, null, 2))
  return verdict
}

// ——— запись в базу ——————————————————————————————————————————————————

async function applyToDb(verdicts) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { data, error } = await sb.from('raw_complexes').select('airtable_id, data')
  if (error) throw error

  for (const verdict of verdicts) {
    const row = data.find(r => r.data['SEO:Slug'] === verdict.slug)
    if (!row) { console.warn(`  ! ${verdict.slug}: нет такого ЖК в базе`); continue }
    const next = { ...row.data }
    const filled = []
    const patch = {
      [OK_FIELD]: verdict.ok.join('\n'),
      [Q_FIELD]: verdict.questions.join('\n'),
      [BALANCE_FIELD]: String(verdict.balanceBuyer),
      [BALANCE_NOTES_FIELD]: [verdict.balanceSummary, ...verdict.balanceNotes].filter(Boolean).join('\n'),
    }
    for (const [field, value] of Object.entries(patch)) {
      const existing = typeof next[field] === 'string' ? next[field].trim() : ''
      if (existing && !force) continue
      next[field] = value
      filled.push(field)
    }
    if (filled.length === 0) { console.log(`  = ${verdict.slug}: всё заполнено, пропуск (нужен --force)`); continue }
    const { error: upErr } = await sb.from('raw_complexes').update({ data: next }).eq('airtable_id', row.airtable_id)
    if (upErr) { console.warn(`  ! ${verdict.slug}: ${upErr.message}`); continue }
    console.log(`  ✓ ${verdict.slug}: записано ${filled.length} пол.`)
  }

  const { error: bumpErr } = await sb.rpc('bump_content_version', { p_kind: 'complexes' })
  if (bumpErr) console.warn(`  ! bump_content_version: ${bumpErr.message}`)
}

function writeReview(verdicts) {
  const lines = ['# Разбор договоров LB Group (LOYO&BONDAR)', '']
  for (const v of [...verdicts].sort((a, b) => a.balanceBuyer - b.balanceBuyer)) {
    lines.push(`## ${v.label} — ${v.balanceBuyer} / ${100 - v.balanceBuyer}`, '', v.balanceSummary, '')
    lines.push('**Что в порядке**', ...v.ok.map(s => `- ${s}`), '')
    lines.push('**Вопросы**', ...v.questions.map(s => `- ${s}`), '')
    lines.push('**Баланс по осям**', ...v.balanceNotes.map(s => `- ${s}`), '')
    lines.push(`_Источники: ${v.sources.map(s => s.name).join('; ')}_`, '')
  }
  fs.writeFileSync(path.join(IN_DIR, 'REVIEW.md'), lines.join('\n'))
}

async function run() {
  const slugs = (only ? [only] : fs.readdirSync(IN_DIR))
    .filter(s => fs.existsSync(path.join(IN_DIR, s, '_index.json')))
  const verdicts = []
  for (const slug of slugs) {
    console.log(`\n## ${slug}`)
    try {
      const verdict = await analyze(slug)
      console.log(`  → баланс ${verdict.balanceBuyer}/${100 - verdict.balanceBuyer}, ` +
        `${verdict.ok.length} зелёных, ${verdict.questions.length} красных`)
      verdicts.push(verdict)
    } catch (e) {
      console.warn(`  ✗ ${e.message}`)
    }
  }
  writeReview(verdicts)
  console.log(`\nОтчёт: ${path.join(IN_DIR, 'REVIEW.md')}`)
  if (apply) {
    console.log('\n=== Запись в базу ===')
    await applyToDb(verdicts)
  } else {
    console.log('Без --apply в базу ничего не записано.')
  }
}

run().catch(e => { console.error(e); process.exit(1) })
