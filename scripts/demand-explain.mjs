#!/usr/bin/env node
// Текст «почему» под баллом востребованности.
//
// Модель здесь НЕ оценивает объект и не придумывает фактов: балл и его
// разложение уже посчитаны (scripts/demand-score.mjs), в промпт уходят только
// готовые числа, и задача — сложить из них две-три живые фразы. Поэтому
// объяснение всегда сходится с цифрой: оно пересказывает те самые слагаемые,
// которые её и создали.
//
// Текст кэшируется в unit_demand_score.why_* и переписывается только когда
// балл пересчитан заново (why_built_at старше computed_at).
//
// Usage:
//   node scripts/demand-explain.mjs --dry-run --limit=3
//   node scripts/demand-explain.mjs --force        # переписать всё
//   node scripts/demand-explain.mjs                # дописать недостающее

import { createClient } from '@supabase/supabase-js'
import { AzureOpenAI } from 'openai'
import { loadEnv } from './_kb-build.mjs'

loadEnv()

const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const val = k => argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? null

const DRY = has('--dry-run')
const FORCE = has('--force')
const LIMIT = val('limit') ? parseInt(val('limit'), 10) : Infinity
const CONC = val('conc') ? parseInt(val('conc'), 10) : 8

const PRICE_IN = 2.50 / 1e6
const PRICE_OUT = 15.00 / 1e6

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
})
const MODEL = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'

// Человеческие имена признаков: модель не должна догадываться, что значит
// `outdoor_living_hi`, иначе начнёт сочинять.
const FEATURE_RU = {
  pool_infinity: 'бассейн-инфинити',
  pool_private: 'собственный бассейн',
  pool_shared: 'общий бассейн',
  pool_none: 'бассейна нет',
  view_ocean_full: 'полный вид на океан',
  view_ocean_partial: 'частичный вид на океан',
  view_nature: 'вид на природу (джунгли, рисовые поля, горы)',
  open_air_living: 'открытая гостиная',
  double_height: 'двусветный потолок',
  glass_wall: 'панорамное остекление',
  rooftop_terrace: 'терраса на крыше',
  private_garden: 'собственный сад',
  sala_gazebo: 'сала (беседка)',
  thatch_alang: 'кровля аланг-аланг',
  bathtub: 'ванна',
  outdoor_shower: 'душ под открытым небом',
  spacious: 'просторные комнаты',
  cramped: 'тесные комнаты',
  outdoor_living_hi: 'много открытых зон',
  finish_tier: 'уровень отделки',
  multi_level: 'несколько уровней',
  balcony: 'балкон',
}

const SYSTEM = `Ты пишешь короткое пояснение к баллу востребованности объекта недвижимости на Бали для сайта balinsky.info.

Балл 1–100 УЖЕ посчитан и означает: объект ожидаемо сильнее N% объектов, которые сдаются в краткосрочную аренду рядом, в том же типе и размере. Он выведен из признаков продукта, чьё влияние на ставку и загрузку измерено на 12 тысячах сдающихся объектов Бали.

ЖЁСТКИЕ ПРАВИЛА:
1. Пиши ТОЛЬКО о том, что есть во входных данных. Ни одного факта сверх них.
2. Не называй сам балл числом и не пересказывай формулу — читатель видит цифру рядом.
3. Опирайся на конкретику: доля соседей с признаком, эффект на ставку, загрузка сегмента.
4. Если признак назван «неизвестен» — о нём молчи, не утверждай ни наличия, ни отсутствия.
4а. Строго различай «У ОБЪЕКТА ЕСТЬ» и «У ОБЪЕКТА НЕТ». Признак из списка сильных сторон с пометкой «НЕТ» — это отсутствие недостатка (например, комнаты не тесные, тогда как у части соседей тесные), и писать надо именно так.
5. Слабые стороны называй прямо, без смягчения: доверие важнее продажи.
6. Никаких обещаний доходности, гарантий и слов «инвестиции», «доход», «прибыль».
7. 2–3 предложения, 220–320 знаков. Живой язык, без канцелярита и без восклицаний.

Верни JSON: {"ru": "...", "en": "..."} — en это перевод ru, а не отдельный текст.`

function buildPrompt(row) {
  const f = row.facts ?? {}
  const m = f.market ?? {}
  const p = f.predicted ?? {}
  // Драйверы слабее 3% дают путаные обороты вроде «в плюс работает отсутствие
  // многоуровневости» — формально верно, читать невозможно. В текст идёт
  // только то, что заметно двигает балл.
  const MIN_EFFECT = 3
  const drivers = (f.drivers ?? []).filter(d => Math.abs(d.adr_effect_pct) >= MIN_EFFECT)
  // Отсутствие признака идёт в плюсы только если сам признак — недостаток
  // («не тесно», «бассейн есть, в отличие от соседей»). Иначе получается
  // «здесь нет недостатка с несколькими уровнями»: формально верно, по-русски
  // невозможно. Нейтральные признаки попадают в плюсы только когда они ЕСТЬ.
  const DRAWBACKS = new Set(['cramped', 'pool_none'])
  const strong = drivers
    .filter(d => d.adr_effect_pct > 0 && (d.present || DRAWBACKS.has(d.feature)))
    .slice(0, 2)
  const weak = drivers.filter(d => d.adr_effect_pct < 0).slice(0, 2)
  const name = d => FEATURE_RU[d.feature] ?? d.feature
  const line = d =>
    `  • ${d.present ? 'У ОБЪЕКТА ЕСТЬ' : 'У ОБЪЕКТА НЕТ'}: ${name(d)}` +
    ` — у соседей встречается в ${d.share_in_stratum}% случаев,` +
    ` вклад в ставку ${d.adr_effect_pct > 0 ? '+' : ''}${d.adr_effect_pct}%`

  const lines = [
    `Объект: ${f.title ?? 'без названия'}`,
    `Тип: ${row.kind === 'villa' ? 'вилла' : 'апартаменты'}, спален: ${f.bedrooms ?? 'не указано'}`,
    `Зона рынка: ${row.zone}${f.district ? ` (район ${f.district})` : ''}`,
    `Сравнение: ${f.comparison}, ${row.comps_n} сдающихся объектов рядом`,
    `Рынок сегмента: медиана ${m.median_adr_usd ?? '?'} $/ночь, средняя загрузка ${m.mean_occupancy_pct ?? '?'}%, простаивает (загрузка ниже 70%) ${m.idle_share_pct ?? '?'}% объектов`,
    `Ожидание по объекту: ставка ×${p.adr_vs_neighbours} к соседям${p.expected_adr_usd ? ` (~${p.expected_adr_usd} $/ночь)` : ''}, загрузка ${p.occupancy_pct}%`,
    '',
    // Наличие признака указывается явно. Иначе строку «тесные комнаты, влияние
    // +1.9%» модель читает как «объект тесный, и это плюс», хотя плюс возникает
    // ровно наоборот: комнаты НЕ тесные, а у 16% соседей — тесные.
    'Сильные стороны против соседей:',
    ...(strong.length ? strong.map(line) : ['  • ничего заметного']),
    'Слабые стороны против соседей:',
    ...(weak.length ? weak.map(line) : ['  • ничего заметного']),
  ]
  const gaps = (f.evidence_gaps ?? []).map(g => FEATURE_RU[g] ?? g)
  if (gaps.length) lines.push(`Неизвестно (не попало на фото, в расчёте нейтрально): ${gaps.join(', ')}`)
  return lines.join('\n')
}

const { data: rows, error } = await sb
  .from('unit_demand_score')
  .select('kind, airtable_id, score, basis, zone, comps_n, facts, why_ru, why_built_at, computed_at')
if (error) throw new Error(`unit_demand_score: ${error.message}`)

const pending = rows
  .filter(r => FORCE || !r.why_ru || !r.why_built_at || new Date(r.why_built_at) < new Date(r.computed_at))
  .slice(0, LIMIT === Infinity ? undefined : LIMIT)

console.log(`К разбору: ${pending.length} из ${rows.length}`)
if (!pending.length) process.exit(0)

let done = 0, failed = 0, tokIn = 0, tokOut = 0
const results = []

async function explain(row) {
  const res = await ai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildPrompt(row) },
    ],
    response_format: { type: 'json_object' },
  })
  tokIn += res.usage?.prompt_tokens ?? 0
  tokOut += res.usage?.completion_tokens ?? 0
  const parsed = JSON.parse(res.choices[0].message.content)
  if (!parsed.ru || !parsed.en) throw new Error('в ответе нет ru/en')
  return parsed
}

const queue = [...pending]
await Promise.all(
  Array.from({ length: Math.min(CONC, queue.length) }, async () => {
    while (queue.length) {
      const row = queue.shift()
      try {
        const { ru, en } = await explain(row)
        results.push({ kind: row.kind, airtable_id: row.airtable_id, why_ru: ru, why_en: en })
        done++
        if (DRY && results.length <= 5) console.log(`\n[${row.score}] ${row.facts?.title ?? row.airtable_id}\n  ${ru}`)
      } catch (e) {
        failed++
        console.error(`  ошибка ${row.kind}/${row.airtable_id}: ${e.message}`)
      }
      if (done && done % 50 === 0) console.log(`  ${done}/${pending.length}`)
    }
  }),
)

const cost = tokIn * PRICE_IN + tokOut * PRICE_OUT
console.log(`\nГотово: ${done}, ошибок: ${failed}, стоимость $${cost.toFixed(2)}`)

if (DRY) {
  console.log('--dry-run: ничего не записано')
  process.exit(0)
}

// Именно update, а не upsert: строка балла уже существует, а upsert частичного
// объекта Postgres выполняет как INSERT и спотыкается о NOT NULL на score.
const builtAt = new Date().toISOString()
let written = 0
const writeQueue = [...results]
await Promise.all(
  Array.from({ length: Math.min(12, writeQueue.length) }, async () => {
    while (writeQueue.length) {
      const r = writeQueue.shift()
      const { error: upErr } = await sb
        .from('unit_demand_score')
        .update({ why_ru: r.why_ru, why_en: r.why_en, why_built_at: builtAt })
        .eq('kind', r.kind)
        .eq('airtable_id', r.airtable_id)
      if (upErr) throw new Error(`запись why ${r.kind}/${r.airtable_id}: ${upErr.message}`)
      written++
    }
  }),
)
console.log(`Записано ${written} пояснений`)
