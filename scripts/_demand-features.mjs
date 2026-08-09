// Признаки продукта, на которых строится балл востребованности юнита.
//
// Один и тот же экстрактор гоняется по двум мирам — по рынку аренды
// (booking_data_vision, где известны цена и загрузка) и по нашему каталогу
// (catalog_product_vision). Если бы их размечали разным кодом, коэффициенты
// модели, обученной на рынке, нельзя было бы приложить к юниту.
//
// Отбор признаков не произвольный. Взято только СТРУКТУРНОЕ — то, что одинаково
// читается и с реального снимка, и с рендера: тип бассейна, вид, планировка,
// материалы, ощущение объёма. Оценки «качества картинки» (цельность дизайна,
// инстаграмность, качество съёмки) у каталога системно завышены, потому что ЖК
// модель видит по рендерам — см. docs/booking-data.md, раздел «Гочи».
// Единственное исключение — finish_tier: это самый сильный денежный драйвер на
// рынке, выкидывать его значит терять половину сигнала. Он входит в модель, но
// у каталога предварительно выравнивается по квантилям (см. calibrateFinish).

/** Порядок ФИКСИРОВАН: на нём лежат коэффициенты модели в БД. */
export const FEATURES = [
  'pool_infinity',
  'pool_private',
  'pool_shared',
  'pool_none',
  'view_ocean_full',
  'view_ocean_partial',
  'view_nature',
  'open_air_living',
  'double_height',
  'glass_wall',
  'rooftop_terrace',
  'private_garden',
  'sala_gazebo',
  'thatch_alang',
  'bathtub',
  'outdoor_shower',
  'spacious',
  'cramped',
  'outdoor_living_hi',
  'finish_tier',
  'multi_level',
  'balcony',
]

const has = (arr, ...vals) => Array.isArray(arr) && vals.some(v => arr.includes(v))

/**
 * vision jsonb → вектор признаков в порядке FEATURES.
 * finish_tier масштабируется в 0..1, остальное — 0/1.
 */
export function extractFeatures(vision) {
  const v = vision ?? {}
  const views = v.views ?? []
  const arch = v.architecture ?? []
  const mats = v.materials ?? []
  const pool = v.pool_type ?? 'none'
  const space = v.space_feel ?? ''
  const finish = Number(v.finish_tier)

  return {
    pool_infinity: pool === 'infinity' ? 1 : 0,
    pool_private: pool === 'private_standard' || pool === 'plunge' || pool === 'lap' ? 1 : 0,
    pool_shared: pool === 'shared' ? 1 : 0,
    pool_none: pool === 'none' ? 1 : 0,
    view_ocean_full: has(views, 'ocean_full') ? 1 : 0,
    view_ocean_partial: has(views, 'ocean_partial') ? 1 : 0,
    view_nature: has(views, 'jungle', 'river_valley', 'rice_field', 'mountain') ? 1 : 0,
    open_air_living: has(arch, 'open_air_living') ? 1 : 0,
    double_height: has(arch, 'double_height_ceiling') ? 1 : 0,
    glass_wall: has(arch, 'floor_to_ceiling_glass') ? 1 : 0,
    rooftop_terrace: has(arch, 'rooftop_terrace') ? 1 : 0,
    private_garden: has(arch, 'private_garden') ? 1 : 0,
    sala_gazebo: has(arch, 'sala_gazebo') ? 1 : 0,
    thatch_alang: has(mats, 'thatch_alang') ? 1 : 0,
    bathtub: v.bathtub === true ? 1 : 0,
    outdoor_shower: v.outdoor_shower === true ? 1 : 0,
    spacious: space === 'spacious' || space === 'grand' ? 1 : 0,
    cramped: space === 'cramped' || space === 'compact' ? 1 : 0,
    outdoor_living_hi: Number(v.outdoor_living_share) >= 4 ? 1 : 0,
    // 1..5 → 0..1; отсутствие оценки читаем как середину рынка, а не как ноль,
    // иначе объект без разбора отделки штрафуется как «худшая отделка на рынке».
    finish_tier: Number.isFinite(finish) ? (finish - 1) / 4 : 0.5,
    multi_level: has(arch, 'multi_level') ? 1 : 0,
    balcony: has(arch, 'balcony') ? 1 : 0,
  }
}

/** Вектор признаков → плоский массив в порядке FEATURES. */
export function toVector(feats) {
  return FEATURES.map(f => feats[f] ?? 0)
}

// Какие кадры нужны, чтобы ОТСУТСТВИЕ признака было доказательством.
// Наличие доказывает само себя: если бассейн виден — он есть. А вот «бассейна
// нет» на подборке из одних интерьеров не значит ничего.
const EVIDENCE = {
  pool_infinity: ['pool_area', 'exterior'],
  pool_private: ['pool_area', 'exterior'],
  pool_shared: ['pool_area', 'exterior'],
  pool_none: ['pool_area', 'exterior'],
  view_ocean_full: ['exterior', 'pool_area', 'garden', 'rooftop'],
  view_ocean_partial: ['exterior', 'pool_area', 'garden', 'rooftop'],
  view_nature: ['exterior', 'pool_area', 'garden', 'rooftop'],
  private_garden: ['exterior', 'garden'],
  sala_gazebo: ['exterior', 'garden', 'pool_area'],
  rooftop_terrace: ['exterior', 'rooftop'],
  thatch_alang: ['exterior'],
  outdoor_shower: ['bathroom', 'exterior', 'garden'],
  outdoor_living_hi: ['exterior', 'garden', 'pool_area'],
  balcony: ['exterior'],
  bathtub: ['bathroom'],
}

/**
 * Признаки, по которым у этой подборки фото нет улик.
 *
 * Зачем: у объекта на продажу снимают интерьеры и рендеры, у объявления на
 * Booking — обязательно бассейн и вид, потому что они и продают аренду. Из-за
 * этого «бассейна не видно» у каталога встречается у 43% вилл против 5.6% на
 * рынке — это дыра в съёмке, а не отсутствие бассейна. Считать её отсутствием
 * значит штрафовать свои же юниты за пробел фотографа.
 *
 * Отсюда правило: наличие признака — улика, отсутствие — улика только тогда,
 * когда нужный кадр в подборке был. Неизвестные признаки на этапе счёта
 * замещаются средним по группе сравнения и дают нулевой вклад.
 *
 * @returns {Set<string>} имена признаков из FEATURES со статусом «неизвестно»
 */
export function unknownFeatures(vision) {
  const rooms = vision?.rooms_shown ?? []
  const feats = extractFeatures(vision)
  const unknown = new Set()
  for (const [feature, needed] of Object.entries(EVIDENCE)) {
    if (feats[feature] > 0) continue // видно — значит есть
    if (!needed.some(r => rooms.includes(r))) unknown.add(feature)
  }
  // pool_none — зеркало остальных бассейнов: если о бассейне вообще нет улик,
  // неизвестны все четыре колонки разом, иначе «нет бассейна» просочится в
  // счёт через единицу в pool_none.
  if (unknown.has('pool_infinity') && feats.pool_none > 0) unknown.add('pool_none')
  return unknown
}

/**
 * Выравнивание finish_tier каталога по рынку.
 *
 * Наши ЖК модель смотрит по рендерам, рынок — по реальным снимкам, поэтому
 * абсолютные уровни отделки несопоставимы: у каталога средний tier 4.27 и треть
 * объектов с высшим баллом, у рынка — 3.07 и 1.3% пятёрок. Без выравнивания
 * каждый наш юнит оказался бы в верхних процентах своего района, и балл стал бы
 * бессмысленным: finish_tier — самый сильный коэффициент модели (×2.57).
 * Но ПОРЯДОК внутри каталога осмыслен — люкс-проект рендерится богаче
 * бюджетного, — поэтому каталожный tier заменяется рыночным с тем же
 * перцентилем.
 *
 * ОПОРНЫЙ КЛАСС — не весь рынок, а его объекты с condition='new' (n≈1610,
 * средний tier 3.73). Наш каталог тоже новостройки; равнять их на стареющий
 * фонд значило бы отнимать у нового жилья реальное преимущество. Выравнивание
 * всё равно остаётся консервативным: заведомо более новый каталог получает
 * ровно то же распределение отделки, что и новые объекты рынка.
 *
 * @param {number[]} catalogTiers сырые finish_tier каталога (шкала 1..5)
 * @param {number[]} marketTiers  сырые finish_tier опорного класса (шкала 1..5)
 * @returns {(tier:number)=>number} пересчёт одного значения, та же шкала 1..5
 */
export function calibrateFinish(catalogTiers, marketTiers) {
  const cat = catalogTiers.filter(Number.isFinite).sort((a, b) => a - b)
  const mkt = marketTiers.filter(Number.isFinite).sort((a, b) => a - b)
  if (cat.length === 0 || mkt.length === 0) return t => t

  return tier => {
    if (!Number.isFinite(tier)) return tier
    // Середина «ступеньки» одинаковых значений: иначе весь каталог с tier=4
    // схлопнулся бы в один край своего диапазона перцентилей.
    const lo = cat.findIndex(x => x >= tier)
    const hi = cat.findLastIndex(x => x <= tier)
    if (lo < 0 || hi < 0) return tier
    const pct = ((lo + hi) / 2) / Math.max(1, cat.length - 1)
    return mkt[Math.min(mkt.length - 1, Math.round(pct * (mkt.length - 1)))]
  }
}
