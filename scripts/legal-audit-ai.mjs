// Юр-разбор документов объекта через Azure: скачиваем due-diligence из Google
// Drive, извлекаем текст и получаем структурный вердикт — зелёные флаги
// (что в порядке) и красные (что спрашивать у застройщика).
//
// Результат по умолчанию НИКУДА не публикуется: складывается в
// reports/legal-audit/ + сводка REVIEW.md для ревью. Запись в живые поля
// страницы ЖК («Юр-проверка: в порядке» / «…: вопросы») — только по --apply,
// и только в ПУСТЫЕ поля: то, что редактор написал руками, не перетирается
// (тот же принцип, что в lib/admin/ai-autofill.ts).
//
// Usage:
//   node scripts/legal-audit-ai.mjs                     # разобрать всё, отчёт
//   node scripts/legal-audit-ai.mjs --only amani-melasti
//   node scripts/legal-audit-ai.mjs --limit 5 --refresh
//   node scripts/legal-audit-ai.mjs --apply             # записать в пустые поля
//   node scripts/legal-audit-ai.mjs --apply --force     # перетереть и заполненные
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import {
  parseDriveLink, downloadDriveFile, exportGoogleDoc, listDriveFolder,
  extractText, pdfPagesToPng,
} from './_drive-doc.mjs'

const envFile = fs.readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview'
const AZURE_MODEL = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-5.4'
const DRIVE_KEY = process.env.GOOGLE_DRIVE_KEY || null
if (!SUPABASE_URL || !SERVICE_KEY || !AZURE_KEY || !AZURE_ENDPOINT) throw new Error('env not set')
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const DD_FIELD = 'Due diligence'
const OK_FIELD = 'Юр-проверка: в порядке'
const Q_FIELD = 'Юр-проверка: вопросы'
const OUT_DIR = 'reports/legal-audit'
const MAX_DOC_CHARS = 40_000   // сколько символов документа отдаём модели
const MAX_OCR_PAGES = 10       // сканы: сколько страниц гоним через vision

const args = process.argv.slice(2)
const argValue = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const ONLY = argValue('--only')
const LIMIT = Number(argValue('--limit') ?? 0) || null
const APPLY = args.includes('--apply')
const FORCE = args.includes('--force')
const REFRESH = args.includes('--refresh')       // перекачать документ И переразобрать
const REANALYZE = args.includes('--reanalyze')   // документ из кэша, разбор заново

const firstString = v => {
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v) && v.length) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString(v.value)
  return null
}

// ── промпт ────────────────────────────────────────────────────────────────
// Ядро — роль юриста по индонезийской недвижимости. Главное требование:
// никакой отсебятины. Всё, что попадёт на сайт, должно опираться на строку
// документа, иначе объект получит красный флаг из воздуха.
const SYSTEM = `
Ты — юрист по сделкам с недвижимостью на Бали (Индонезия), работающий на стороне ПОКУПАТЕЛЯ-иностранца. Тебе дают документы по объекту (обычно due-diligence от нотариуса, сертификаты, разрешения) и просят вынести вердикт для карточки объекта на сайте.

ЧТО ТЫ ЗНАЕШЬ И ОБЯЗАН ПРОВЕРЯТЬ:
- Титул: Hak Milik (SHM, полная собственность — только для граждан Индонезии), HGB/SHGB (право строения, доступно PT PMA), Hak Pakai (право пользования, резидент с KITAS), Hak Sewa (leasehold, аренда на срок). Nominee (SHM на индонезийца + сайд-договоры) — ВСЕГДА высокий риск.
- Обременения: ипотека/залог (Hak Tanggungan), незакрытая Roya, споры, арест, наследственные права, совместная собственность.
- Соответствие: имя держателя в сертификате vs продавец/застройщик; площадь в сертификате vs заявленная; границы и Letter of Measurement.
- Разрешения: PBG (бывш. IMB), SLF. Их отсутствие — стройка/эксплуатация вне закона.
- Зонирование: RTRW/RDTR, ITR/KRK. Зелёная зона (jalur hijau) под виллы — красный флаг.
- Срок и продление leasehold: гарантировано ли продление, по какой цене, право переуступки, наследование, судьба строения в конце срока.
- Налоги и платежи: PBB, PPh/BPHTB, кто платит.

ЖЁСТКИЕ ПРАВИЛА:
1. Пиши ТОЛЬКО то, что прямо следует из текста документа. Ни одного факта из головы. Если чего-то в документе нет — это не «в порядке», это вопрос.
2. В каждом пункте — конкретика из документа: номер сертификата, дата проверки, площадь, имя держателя, номер разрешения. Без этого пункт не нужен.
3. Никакой рекламы и оценок вроде «отличный объект». Сухо, по делу.
4. Русский язык. Индонезийские термины оставляй как есть (SHM, HGB, PBG, SLF, BPN, Roya, PT PMA).
5. Если документ — не юридический (презентация, прайс, маркетинг), верни verdict "unknown" и пустые массивы.

КАК СТАВИТЬ severity (критично — от этого зависит вердикт объекта):
- "high" — ТОЛЬКО факт, НАЙДЕННЫЙ в документе, который ломает или обесценивает сделку: залог/Hak Tanggungan, непогашенная Roya, арест, спор или судебное дело, зелёная зона под жильё, титул на умершего без оформленного наследования, держатель в сертификате не совпадает с продавцом/застройщиком, ограничение на отчуждение, признаки nominee-схемы, площадь в сертификате меньше заявленной, истекающий или непродлеваемый срок.
- "medium" — расхождение документа с карточкой объекта, а также то, чего в пакете НЕТ и что нужно запросить отдельно.
- "low" — формальности и мелкие уточнения.
- ОТСУТСТВИЕ документа в пакете НИКОГДА не "high". Нотариальный due diligence по земле не обязан содержать PBG, SLF, ITR/KRK или договор аренды покупателя — это нормальный объём такого документа, а не риск. Пиши такие пункты как "medium" в формулировке «запросить отдельно».
- НЕ выноси в issues общеправовые констатации без привязки к находке в документе («иностранец не может владеть SHM», «leasehold не даёт прав на землю»). Это общее знание, а не результат проверки.

ФОРМАТ ОТВЕТА — строго один JSON-объект:
{
  "doc_summary": "что это за документ, одной фразой",
  "tenure": "leasehold | shm | hgb | hak_pakai | nominee | unknown",
  "verdict": "green | amber | red | unknown",
  "verdict_reason": "одна фраза: почему именно такой вердикт",
  "confidence": "high | medium | low",
  "ok": [{"headline": "короткий лид", "detail": "детали с цифрами/датами", "source": "цитата или пункт документа"}],
  "issues": [{"headline": "короткий лид", "detail": "чем это грозит покупателю простыми словами", "severity": "high | medium | low", "source": "цитата или пункт документа"}]
}
"ok" — зелёные флаги: что реально проверено и в порядке. "issues" — красные и жёлтые: риски, несоответствия, отсутствующие документы, вопросы к застройщику.
headline — 2-5 слов, без точки в конце. detail — 1-2 предложения.
verdict: red — есть высокий риск (nominee, обременение, зелёная зона, нет PBG); amber — есть вопросы, но блокеров нет; green — существенных вопросов нет.
Только JSON, без markdown-заборов.
`.trim()

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function callAzure(messages, { maxTokens = 4000 } = {}) {
  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${AZURE_MODEL}/chat/completions?api-version=${AZURE_VERSION}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': AZURE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: AZURE_MODEL, temperature: 0.2, max_completion_tokens: maxTokens, messages }),
      })
      if (!res.ok) {
        const body = (await res.text()).slice(0, 200)
        if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue }
        throw new Error(`azure ${res.status}: ${body}`)
      }
      const json = await res.json()
      return json.choices?.[0]?.message?.content ?? ''
    } catch (e) {
      if (attempt === 2) throw e
      await sleep(2000 * (attempt + 1))
    }
  }
  return ''
}

/** Достать JSON из ответа модели, даже если она обернула его в ```-забор. */
function parseJson(raw) {
  const text = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('в ответе нет JSON')
  return JSON.parse(text.slice(start, end + 1))
}

// ── шаг 1: получить текст документа ───────────────────────────────────────
async function loadDocText(row, dir) {
  const cached = path.join(dir, 'doc.txt')
  if (!REFRESH && fs.existsSync(cached)) {
    return { text: fs.readFileSync(cached, 'utf8'), method: 'cache' }
  }
  const link = parseDriveLink(firstString(row.data[DD_FIELD]))
  if (!link.id) throw new Error('ссылка не распознана')

  let text = ''
  let method = ''
  if (link.kind === 'doc' || link.kind === 'sheet') {
    text = await exportGoogleDoc(link.id, link.kind)
    method = 'gdoc'
  } else if (link.kind === 'folder') {
    // Папку читаем только с Drive API; берём документы, пропускаем картинки.
    const files = await listDriveFolder(link.id, DRIVE_KEY)
    const docs = files.filter(f => /pdf|document|text/.test(f.mimeType ?? ''))
    if (docs.length === 0) throw new Error('в папке нет документов')
    const parts = []
    for (const f of docs.slice(0, 5)) {
      const { buffer, contentType } = await downloadDriveFile(f.id)
      const got = await extractText({ buffer, contentType, name: f.name })
      if (got.text) parts.push(`=== ${f.name} ===\n${got.text}`)
    }
    text = parts.join('\n\n')
    method = 'folder'
  } else {
    const { buffer, contentType } = await downloadDriveFile(link.id)
    const got = await extractText({ buffer, contentType })
    text = got.text
    method = got.method
    if (got.method === 'unsupported') throw new Error(`тип файла не поддержан (${contentType})`)
    if (got.method === 'pdf-scan') {
      text = await ocrScan(buffer, path.join(dir, 'pages'))
      method = 'pdf-ocr'
    }
  }

  if (!text.trim()) throw new Error('пустой текст после извлечения')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cached, text)
  return { text, method }
}

/** Скан без текстового слоя: страницы → PNG → распознавание моделью. */
async function ocrScan(buffer, dir) {
  const pages = await pdfPagesToPng(buffer, { dir, maxPages: MAX_OCR_PAGES })
  const content = [{ type: 'text', text: 'Извлеки весь текст из этих страниц документа дословно, сохраняя структуру. Не переводи и не пересказывай.' }]
  for (const p of pages) {
    const b64 = fs.readFileSync(p).toString('base64')
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } })
  }
  return await callAzure(
    [{ role: 'system', content: 'Ты — OCR документов. Возвращай только извлечённый текст на языке оригинала.' },
     { role: 'user', content }],
    { maxTokens: 12_000 },
  )
}

// ── шаг 2: разбор ─────────────────────────────────────────────────────────
async function analyze(row, text, dir) {
  const cached = path.join(dir, 'analysis.json')
  if (!REFRESH && !REANALYZE && fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, 'utf8'))

  const context = [
    `Объект: ${firstString(row.data['Project']) ?? row.slug}`,
    `Застройщик: ${firstString(row.data['Developer1']) ?? '—'}`,
    `Район: ${firstString(row.data['Location 2']) ?? '—'}`,
    `Заявлено в карточке: разрешения «${firstString(row.data['Разрешительные документы']) ?? '—'}», статус «${firstString(row.data['Статус']) ?? '—'}», leasehold ${firstString(row.data['Leasehold']) ?? '—'} лет.`,
  ].join('\n')

  const raw = await callAzure([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `${context}\n\n=== ДОКУМЕНТ ===\n${text.slice(0, MAX_DOC_CHARS)}` },
  ])
  const result = normalize(parseJson(raw))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cached, JSON.stringify(result, null, 2))
  return result
}

/** Привести ответ модели к предсказуемой форме и пересчитать вердикт по фактам. */
function normalize(parsed) {
  const item = i => ({
    headline: String(i?.headline ?? '').trim().replace(/[.:]$/, ''),
    detail: String(i?.detail ?? '').trim(),
    severity: i?.severity === 'high' || i?.severity === 'medium' ? i.severity : 'low',
    source: String(i?.source ?? '').trim(),
  })
  const ok = (Array.isArray(parsed.ok) ? parsed.ok : []).map(item).filter(i => i.headline)
  const issues = (Array.isArray(parsed.issues) ? parsed.issues : []).map(item).filter(i => i.headline)
  // Вердикт считаем сами: у модели он «плывёт» между запусками, а тяжесть
  // пунктов — это факт, который она уже проставила.
  let verdict = parsed.verdict === 'unknown' ? 'unknown' : 'green'
  if (verdict !== 'unknown') {
    if (issues.some(i => i.severity === 'high')) verdict = 'red'
    else if (issues.length > 0) verdict = 'amber'
  }
  return {
    doc_summary: String(parsed.doc_summary ?? '').trim(),
    tenure: String(parsed.tenure ?? 'unknown'),
    verdict,
    verdict_reason: String(parsed.verdict_reason ?? '').trim(),
    confidence: String(parsed.confidence ?? 'medium'),
    ok,
    issues,
  }
}

// ── шаг 3: рендер в поля сайта ────────────────────────────────────────────
// Формат полей: одна позиция на строку, «Лид. Детали» — lib/legal-audit.ts
// режет строку по первой точке с пробелом.
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }
const bySeverity = (x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]
const toLine = i => `${i.headline}. ${i.detail}`
const renderOk = a => a.ok.map(toLine).join('\n')
const renderQuestions = a => [...a.issues].sort(bySeverity).map(toLine).join('\n')

// ── прогон ────────────────────────────────────────────────────────────────
const { data: rows, error } = await sb.from('raw_complexes').select('airtable_id, slug, data')
if (error) throw new Error(error.message)

const targets = rows
  .filter(r => firstString(r.data?.[DD_FIELD]))
  .filter(r => (ONLY ? r.slug === ONLY : true))
  .slice(0, LIMIT ?? undefined)

console.log(`ЖК с ссылкой на документы: ${targets.length}${APPLY ? ' | режим записи' : ' | только отчёт'}`)

const results = []
for (const row of targets) {
  const dir = path.join(OUT_DIR, row.airtable_id)
  const name = firstString(row.data['Project']) ?? row.slug
  try {
    const { text, method } = await loadDocText(row, dir)
    const analysis = await analyze(row, text, dir)
    results.push({ row, name, analysis, method, chars: text.length })
    const mark = { green: '🟢', amber: '🟡', red: '🔴', unknown: '⚪️' }[analysis.verdict]
    console.log(`  ${mark} ${row.slug} — ${analysis.ok.length} в порядке, ${analysis.issues.length} вопросов (${method})`)
  } catch (e) {
    results.push({ row, name, error: e.message })
    console.log(`  ⚠️  ${row.slug} — ${e.message}`)
  }
}

// Сводка для ревью человеком: цитаты-основания видны здесь, на сайт не идут.
fs.mkdirSync(OUT_DIR, { recursive: true })
const report = ['# Юр-разбор документов ЖК', '']
for (const r of results) {
  report.push(`## ${r.name} (${r.row.slug})`)
  if (r.error) {
    report.push('', `⚠️ **не разобрано:** ${r.error}`, '', `Ссылка: ${firstString(r.row.data[DD_FIELD])}`, '')
    continue
  }
  const a = r.analysis
  const mark = { green: '🟢 всё чисто', amber: '🟡 есть вопросы', red: '🔴 красные флаги', unknown: '⚪️ не юр-документ' }[a.verdict]
  report.push('', `**${mark}** — ${a.verdict_reason}`, '',
    `- Документ: ${a.doc_summary}`,
    `- Титул: ${a.tenure} | уверенность: ${a.confidence} | источник: ${r.method}, ${r.chars} симв.`, '')
  if (a.ok.length) {
    report.push('**Зелёные флаги**', '')
    for (const i of a.ok) report.push(`- **${i.headline}.** ${i.detail}${i.source ? `  \n  _основание: ${i.source}_` : ''}`)
    report.push('')
  }
  if (a.issues.length) {
    report.push('**Красные флаги и вопросы**', '')
    for (const i of [...a.issues].sort(bySeverity)) {
      const sev = { high: '🔴', medium: '🟡', low: '⚪️' }[i.severity]
      report.push(`- ${sev} **${i.headline}.** ${i.detail}${i.source ? `  \n  _основание: ${i.source}_` : ''}`)
    }
    report.push('')
  }
}
const reportPath = path.join(OUT_DIR, 'REVIEW.md')
fs.writeFileSync(reportPath, report.join('\n'))
console.log(`\nОтчёт: ${reportPath}`)

if (!APPLY) {
  console.log('Запись в поля сайта не делалась. Проверь отчёт и запусти с --apply.')
  process.exit(0)
}

let written = 0
let skipped = 0
for (const r of results) {
  if (r.error || r.analysis.verdict === 'unknown') { skipped++; continue }
  const data = r.row.data
  const hasOwn = firstString(data[OK_FIELD]) || firstString(data[Q_FIELD])
  if (hasOwn && !FORCE) { skipped++; console.log(`  пропуск ${r.row.slug}: поля уже заполнены (--force перетрёт)`); continue }
  const next = { ...data, [OK_FIELD]: renderOk(r.analysis), [Q_FIELD]: renderQuestions(r.analysis) }
  const { error: upErr } = await sb.from('raw_complexes').update({ data: next }).eq('airtable_id', r.row.airtable_id)
  if (upErr) { console.error(`  ошибка записи ${r.row.slug}: ${upErr.message}`); continue }
  written++
}
if (written > 0) {
  // Модульные кэши каталога видят правку только через content_version.
  await sb.rpc('bump_content_version', { p_kind: 'complexes' }).catch(e => console.error('bump:', e.message))
}
console.log(`Записано: ${written}, пропущено: ${skipped}`)
console.log('Переводы на остальные языки: node scripts/translate-complex-legal.mjs --lang en (и далее по языкам)')
