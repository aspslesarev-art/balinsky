#!/usr/bin/env node
// Подгонка модели востребованности на рынке краткосрочной аренды.
//
// Зачем модель, а не прямые премии по признакам: признаки коррелируют между
// собой (инфинити-бассейн почти всегда идёт с дорогой отделкой и видом), и
// перемножение одномерных премий засчитывает один и тот же эффект по три раза.
// Гребневая регрессия делит эффект между признаками один раз.
//
// Две мишени, потому что «востребованность» на Бали двусоставная:
//   adr — сколько объект берёт СВЕРХ соседей своей страты (adr_ratio уже
//         нормирован на медиану «зона × тип × спальни», поэтому это не премия
//         за район);
//   occ — насколько он заполнен относительно средней загрузки своей страты.
// Медианные отношения по загрузке брать нельзя: рынок зацензурен сверху
// (у трети объектов ровно 100%), медиана отношения выходит 1.000 у любого
// признака. Разброс живёт в левом хвосте, его ловит средняя.
//
// Модель ничего не решает, пока не проверена: скрипт держит отложенную выборку
// и печатает ранговую корреляцию предсказания с фактическим revpar_ratio.
// Если она развалится — балл на сайт выпускать нельзя.
//
// Usage:
//   node scripts/demand-model-fit.mjs --dry-run    # только отчёт, без записи
//   node scripts/demand-model-fit.mjs --no-finish  # без оценки отделки
//   node scripts/demand-model-fit.mjs              # записать коэффициенты

import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './_kb-build.mjs'
import { FEATURES, extractFeatures, toVector } from './_demand-features.mjs'

loadEnv()

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
// finish_tier — не структурный признак, а сводная оценка качества: модель
// ставила его, глядя на объект целиком, поэтому он коррелирует с бассейном,
// видом и объёмом и в многомерной подгонке забирает их вклад себе. У каталога
// это поле снято с рендеров и завышено, так что модель на нём фактически
// оценивала бы качество картинки. Колонка обнуляется до подгонки — тогда
// регуляризация раздаёт её эффект тем признакам, которые видны и на рендере,
// и на реальном снимке одинаково.
const NO_FINISH = argv.includes('--no-finish')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Страта тоньше 8 объектов даёт шумную медиану, а на неё нормированы обе
// мишени. Разбор с confidence<3 — модель сама сказала, что плохо разглядела.
const MIN_STRATUM = 8
const MIN_CONFIDENCE = 3
// Сила регуляризации на стандартизованных признаках. При 22 признаках и 10k+
// наблюдений почти не смещает оценки, но глушит вырожденные комбинации
// (pool_none и pool_private — почти зеркальные колонки).
const RIDGE_LAMBDA = 1.0
// Каждый пятый объект в отложенную выборку. Отбор по остатку хеша id, а не
// случайный: прогон должен воспроизводиться.
const HOLDOUT_EVERY = 5
export const MODEL_VERSION = 1

// ─── Линейная алгебра ──────────────────────────────────────────────────────

/** Решение A·x = b методом Гаусса с выбором главного элемента. */
function solve(A, b) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (Math.abs(M[piv][col]) < 1e-12) throw new Error(`вырожденная матрица на колонке ${col}`)
    ;[M[col], M[piv]] = [M[piv], M[col]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col] / M[col][col]
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

/**
 * Гребневая регрессия на стандартизованных признаках.
 * Возвращает коэффициенты в ИСХОДНОМ масштабе плюс свободный член.
 */
function ridge(X, y, lambda) {
  const n = X.length
  const p = X[0].length
  const mean = Array(p).fill(0)
  const sd = Array(p).fill(0)
  for (const row of X) for (let j = 0; j < p; j++) mean[j] += row[j] / n
  for (const row of X) for (let j = 0; j < p; j++) sd[j] += (row[j] - mean[j]) ** 2 / n
  for (let j = 0; j < p; j++) sd[j] = Math.sqrt(sd[j]) || 1

  const yMean = y.reduce((s, v) => s + v, 0) / n
  const Z = X.map(row => row.map((v, j) => (v - mean[j]) / sd[j]))
  const yc = y.map(v => v - yMean)

  const XtX = Array.from({ length: p }, () => Array(p).fill(0))
  const Xty = Array(p).fill(0)
  for (let i = 0; i < n; i++) {
    const zi = Z[i]
    for (let j = 0; j < p; j++) {
      Xty[j] += zi[j] * yc[i]
      for (let k = j; k < p; k++) XtX[j][k] += zi[j] * zi[k]
    }
  }
  for (let j = 0; j < p; j++) {
    for (let k = 0; k < j; k++) XtX[j][k] = XtX[k][j]
    XtX[j][j] += lambda
  }

  const bz = solve(XtX, Xty)
  const coef = bz.map((b, j) => b / sd[j])
  const intercept = yMean - coef.reduce((s, c, j) => s + c * mean[j], 0)
  return { coef, intercept }
}

const predict = (model, vec) =>
  model.intercept + vec.reduce((s, v, j) => s + v * model.coef[j], 0)

// ─── Статистика проверки ───────────────────────────────────────────────────

function rank(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const r = Array(values.length).fill(0)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg
    i = j + 1
  }
  return r
}

function spearman(a, b) {
  const ra = rank(a)
  const rb = rank(b)
  const n = ra.length
  const ma = ra.reduce((s, v) => s + v, 0) / n
  const mb = rb.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb)
    da += (ra[i] - ma) ** 2
    db += (rb[i] - mb) ** 2
  }
  return num / Math.sqrt(da * db)
}

/** Устойчивый мелкий хеш строки — только для детерминированного сплита. */
function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ─── Загрузка рынка ────────────────────────────────────────────────────────

async function loadMarket() {
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('booking_market_relative')
      .select('id, zone, unit_kind, beds_bucket, adr_ratio, occupancy, revpar_ratio, stratum_n, vision')
      .gte('stratum_n', MIN_STRATUM)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`booking_market_relative: ${error.message}`)
    if (!data.length) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows.filter(
    r =>
      Number(r.vision?.confidence) >= MIN_CONFIDENCE &&
      Number.isFinite(Number(r.adr_ratio)) && Number(r.adr_ratio) > 0 &&
      Number.isFinite(Number(r.occupancy)) &&
      Number.isFinite(Number(r.revpar_ratio)) && Number(r.revpar_ratio) > 0,
  )
}

// ─── Основной прогон ───────────────────────────────────────────────────────

const t0 = Date.now()
const market = await loadMarket()
console.log(`Рынок: ${market.length} объектов с ценой, загрузкой и разбором фото`)
if (market.length < 2000) throw new Error('слишком мало данных для подгонки — прогон остановлен')

// Средняя загрузка своей страты: обе мишени должны быть «относительно соседей»,
// иначе модель выучит, что Улувату дороже Денпасара, и на этом успокоится.
const strataKey = r => `${r.zone}|${r.unit_kind ?? '?'}|${r.beds_bucket}`
const occByStratum = new Map()
for (const r of market) {
  const k = strataKey(r)
  const cur = occByStratum.get(k) ?? { sum: 0, n: 0 }
  cur.sum += Number(r.occupancy)
  cur.n += 1
  occByStratum.set(k, cur)
}
const stratumOcc = k => {
  const s = occByStratum.get(k)
  return s && s.n > 0 ? s.sum / s.n : null
}

const FINISH_IDX = FEATURES.indexOf('finish_tier')
const maybeDropFinish = vec => {
  if (!NO_FINISH) return vec
  // Константная колонка не имеет ковариации с мишенью — коэффициент выходит
  // ровно 0, и признак перестаёт влиять как на подгонку, так и на счёт.
  const out = [...vec]
  out[FINISH_IDX] = 0
  return out
}

const prepared = market.map(r => ({
  ...r,
  vec: maybeDropFinish(toVector(extractFeatures(r.vision))),
  yAdr: Math.log(Number(r.adr_ratio)),
  // Отклонение загрузки от средней по страте, в долях единицы.
  yOcc: (Number(r.occupancy) - stratumOcc(strataKey(r))) / 100,
  stratumOccPct: stratumOcc(strataKey(r)),
  holdout: hash(String(r.id)) % HOLDOUT_EVERY === 0,
}))

const train = prepared.filter(r => !r.holdout)
const test = prepared.filter(r => r.holdout)
console.log(`Обучение: ${train.length} · отложено: ${test.length}`)

const mAdr = ridge(train.map(r => r.vec), train.map(r => r.yAdr), RIDGE_LAMBDA)
const mOcc = ridge(train.map(r => r.vec), train.map(r => r.yOcc), RIDGE_LAMBDA)

// Предсказанный относительный RevPAR: во сколько раз объект отличается от
// среднего соседа своей страты по деньгам с ночи.
const predIndex = r => {
  const adrMult = Math.exp(predict(mAdr, r.vec))
  const occPct = Math.min(100, Math.max(5, r.stratumOccPct + predict(mOcc, r.vec) * 100))
  return adrMult * (occPct / r.stratumOccPct)
}

const testPred = test.map(predIndex)
const testActual = test.map(r => Number(r.revpar_ratio))
const rhoAll = spearman(testPred, testActual)
const rhoAdr = spearman(test.map(r => predict(mAdr, r.vec)), test.map(r => Number(r.adr_ratio)))
const rhoOcc = spearman(test.map(r => predict(mOcc, r.vec)), test.map(r => Number(r.occupancy)))

console.log('\n── Проверка на отложенной выборке ──')
console.log(`  ранговая корреляция предсказания и факта, RevPAR : ${rhoAll.toFixed(3)}`)
console.log(`  то же по цене (ADR)                              : ${rhoAdr.toFixed(3)}`)
console.log(`  то же по загрузке                                : ${rhoOcc.toFixed(3)}`)

// Насколько предсказание разводит объекты по деньгам: делим отложенную выборку
// на пятые доли по предсказанию и смотрим фактический RevPAR каждой доли.
// Это проверка, которую видно глазами: доли должны идти по возрастанию.
const sorted = test.map((r, i) => ({ p: testPred[i], a: testActual[i] })).sort((x, y) => x.p - y.p)
const bucket = Math.ceil(sorted.length / 5)
console.log('\n── Фактический RevPAR по пятым долям предсказания ──')
for (let i = 0; i < 5; i++) {
  const slice = sorted.slice(i * bucket, (i + 1) * bucket)
  if (!slice.length) continue
  const med = slice.map(s => s.a).sort((a, b) => a - b)[Math.floor(slice.length / 2)]
  console.log(`  доля ${i + 1}: n=${String(slice.length).padStart(4)}  медианный RevPAR к соседям = ${med.toFixed(2)}`)
}

console.log('\n── Вклад признаков (цена / загрузка) ──')
FEATURES.map((f, j) => ({ f, a: mAdr.coef[j], o: mOcc.coef[j] * 100 }))
  .sort((x, y) => y.a - x.a)
  .forEach(({ f, a, o }) =>
    console.log(`  ${f.padEnd(20)} цена ×${Math.exp(a).toFixed(3)}   загрузка ${o >= 0 ? '+' : ''}${o.toFixed(1)} п.п.`),
  )

if (DRY) {
  console.log(`\n--dry-run: коэффициенты не сохранены (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  process.exit(0)
}

const asObject = model => Object.fromEntries(FEATURES.map((f, j) => [f, model.coef[j]]))
const fittedAt = new Date().toISOString()
const rows = [
  {
    version: MODEL_VERSION, target: 'adr',
    coef: asObject(mAdr), intercept: mAdr.intercept,
    n_train: train.length, n_holdout: test.length,
    holdout_spearman: Number(rhoAdr.toFixed(4)), fitted_at: fittedAt,
  },
  {
    version: MODEL_VERSION, target: 'occ',
    coef: asObject(mOcc), intercept: mOcc.intercept,
    n_train: train.length, n_holdout: test.length,
    holdout_spearman: Number(rhoOcc.toFixed(4)), fitted_at: fittedAt,
  },
]
const { error } = await sb.from('demand_model').upsert(rows, { onConflict: 'version,target' })
if (error) throw new Error(`запись demand_model: ${error.message}`)
console.log(`\nКоэффициенты сохранены (версия ${MODEL_VERSION}), ${((Date.now() - t0) / 1000).toFixed(1)}s`)
