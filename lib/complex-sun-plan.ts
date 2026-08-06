// Обмер генплана и геометрия площадки — БЕЗ доступа к базе.
//
// Этот модуль попадает в клиентский бандл (его тянет 3D-сцена), поэтому
// здесь не должно быть ни клиента Supabase, ни серверных ключей.
// Всё, что ходит в базу, живёт в lib/complex-sun.ts.

export type SunSettings = {
  complexSlug: string
  /** Азимут направления «первая секция → последняя», градусы от севера по часовой. */
  rowAzimuth: number
  latitude: number
  longitude: number
  eaveHeight: number
  ridgeRise: number
  yardWall: number
  /** Сдвиг модели относительно привязки подложки: восток и юг, метры. */
  offsetX: number
  offsetZ: number
  /** Масштаб модели, 1 = размер по обмеру генплана. */
  modelScale: number
  /** Подгонка самой подложки: сдвиг на восток и юг, метры, и масштаб. */
  basemapOffsetX: number
  basemapOffsetZ: number
  basemapScale: number
  enabled: boolean
}

export type SunSettingsInput = Omit<SunSettings, 'complexSlug'>

/** Секция ряда: границы по оси X плана, метры. */
export type PlanUnit = { id: number; x0: number; x1: number }

/** Бассейн: x — левая кромка, zNear ближе к фасаду дома. */
export type PlanPool = { unit: number; x: number; width: number; zNear: number; zFar: number }

/**
 * Отдельный корпус: свой ряд секций, своя глубина, свой разворот.
 *
 * U Villas I — один прямой ряд, он описывается полями `units` / `buildingDepth`
 * самого плана. Комплексы вроде Ubud Dream состоят из нескольких рядов под
 * разными углами, и для них заполняется `blocks`. Рендер обрабатывает оба
 * случая одинаково: план без `blocks` — это план из одного блока.
 */
export type PlanBlock = {
  id: string
  /** Начало локальной оси X корпуса в координатах участка, метры. */
  origin: { x: number; z: number }
  /** Разворот локальной оси X относительно оси X участка, градусы по часовой. */
  azimuth: number
  /** Глубина корпуса вдоль его локальной оси Z, метры. */
  depth: number
  units: PlanUnit[]
  /** Высота карниза, если у корпуса она своя (коммерция выше жилья). */
  eaveHeight?: number
  /** Скатная кровля жилых секций либо плоская у общественных корпусов. */
  roof: 'pitched' | 'flat'
}

export type SitePlan = {
  title: string
  district: string
  /** Часовой пояс площадки без перехода на летнее время. */
  utcOffsetHours: number
  /** Глубина корпуса вдоль оси Z, метры. */
  buildingDepth: number
  units: PlanUnit[]
  /** Несколько корпусов. Если не задано — план считается одним рядом. */
  blocks?: PlanBlock[]
  /**
   * Стартовые значения редактора, пока в базе нет сохранённых настроек.
   * Без них подставлялись координаты 0,0 — солнце считалось для точки в
   * Атлантике, и сцена открывалась ночной в полдень.
   */
  defaults?: {
    rowAzimuth: number
    latitude: number
    longitude: number
  }
  /** Контур участка [x, z] по часовой стрелке. */
  plot: [number, number][]
  pools: PlanPool[]
  basemap: {
    url: string
    sizePx: number
    metersPerPixel: number
    anchorPx: { x: number; y: number }
  }
}

/**
 * U Villas I. Размеры сняты из вектора «Мастерплан.pdf»: четыре стороны
 * участка сошлись с подписанными на чертеже (34.9 / 25.0 / 27.7 / 24.2 м),
 * шаг секций 4.846 м при стене 150 мм, глубина корпуса 11.61 м.
 */
const U_VILLAS_I: SitePlan = {
  title: 'U Villas I',
  district: 'Melasti, Унгасан',
  utcOffsetHours: 8,
  buildingDepth: 11.61,
  units: [
    { id: 1, x0: 0.0, x1: 4.846 },
    { id: 2, x0: 4.996, x1: 9.692 },
    { id: 3, x0: 9.841, x1: 14.537 },
    { id: 4, x0: 14.687, x1: 19.383 },
    { id: 5, x0: 19.533, x1: 24.229 },
    { id: 6, x0: 24.379, x1: 29.225 },
  ],
  plot: [
    [-4.87, 12.609],
    [30.046, 12.609],
    [28.538, -12.372],
    [0.904, -10.859],
  ],
  pools: [
    { unit: 1, x: 1.9, width: 2.5, zNear: -7.1, zFar: -10.1 },
    { unit: 2, x: 6.769, width: 2.5, zNear: -4.419, zFar: -10.414 },
    { unit: 3, x: 11.615, width: 2.5, zNear: -4.712, zFar: -10.707 },
    { unit: 4, x: 16.461, width: 2.5, zNear: -5.005, zFar: -10.999 },
    { unit: 5, x: 21.306, width: 2.5, zNear: -5.327, zFar: -11.322 },
    { unit: 6, x: 25.585, width: 2.5, zNear: -5.65, zFar: -11.645 },
  ],
  // Google Static Maps, зум 20 при scale=2: снимок свежий (комплекс на нём
  // уже построен) и вчетверо резче прежней мозаики Esri. Якорь — пиксель,
  // на который приходится начало координат модели (центр участка). Снят
  // подгонкой габарита корпуса по снимку, а не на глаз: scripts не нужны,
  // расчёт разовый (см. историю задачи).
  basemap: {
    url: '/sun/u-villas-i.jpg',
    sizePx: 1280,
    metersPerPixel: 0.0738,
    anchorPx: { x: 639.2, y: 688.1 },
  },
}

/** Ряд одинаковых секций: шаг постоянный, между корпусами шов 0.15 м. */
function evenUnits(count: number, width: number, firstId = 1, step = 2): PlanUnit[] {
  const pitch = width + 0.15
  return Array.from({ length: count }, (_, i) => ({
    id: firstId + i * step,
    x0: i * pitch,
    x1: i * pitch + width,
  }))
}

/**
 * Ubud Dream (в штампе чертежа — LOYO UBUD).
 *
 * Источник: «211025_Loyo_Ubud_Dreams_Architectural_Numbering_Masterplan», лист
 * A3, масштаб 1:500 — отсюда 1 pt = 0.176 м. Состав и площади взяты из таблицы
 * чертежа: 20 квартир 1BR (45 м² первый этаж + 35 м² второй) и 21 квартира 2BR
 * (45 + 45), коммерция 1536 м² на три этажа, йога 75.9, спа 110, персонал и
 * техблок по 50.6. Участок 4630 м², застройка 5518.1 м².
 *
 * ТОЧНОСТЬ: габариты рядов сняты с растра чертежа профилем плотности —
 * нижний ряд 125.9 × 10.0 м, полоса верхней застройки z 17.1…35.9 м, участок
 * 134.9 × 77.7 м. Это порядка ±1 м на корпус, чего достаточно для теней и
 * общего вида, но это НЕ векторный обмер: вектор в PDF выгружен штриховкой
 * (274 тыс. путей) и контуры зданий из него автоматически не отделяются.
 */
const UBUD_DREAM: SitePlan = {
  title: 'Ubud Dream',
  district: 'Убуд',
  utcOffsetHours: 8,
  // Развороты заданы внутри блоков, поэтому общий азимут ряда нулевой:
  // унаследованные от U Villas I 90° клали весь участок набок.
  defaults: { rowAzimuth: 0, latitude: -8.504827, longitude: 115.253666 },
  // Legacy-поля описывают главный ряд: план с blocks их для геометрии не
  // использует, но они остаются осмысленным значением по умолчанию.
  buildingDepth: 10,
  units: evenUnits(20, 5.15, 1),
  blocks: [
    // Южный ряд вдоль улицы: 20 секций, нечётная нумерация 1…39.
    {
      id: 'row-south',
      origin: { x: 6.3, z: 40.5 },
      azimuth: 0,
      depth: 10,
      units: evenUnits(20, 5.15, 1),
      roof: 'pitched',
    },
    // Северный ряд, 21 секция с чётной нумерацией 2…42, слегка развёрнут:
    // на чертеже он идёт по изгибу участка.
    {
      id: 'row-north',
      origin: { x: 14.0, z: 25.5 },
      azimuth: 3.5,
      depth: 10,
      units: evenUnits(15, 5.15, 2),
      roof: 'pitched',
    },
    // Западный кластер: пять секций поперёк, у въезда.
    {
      id: 'cluster-west',
      origin: { x: 4.0, z: 14.0 },
      azimuth: 90,
      depth: 9,
      units: evenUnits(5, 5.15, 34),
      roof: 'pitched',
    },
    // Коммерция (A): три этажа плюс кровля, восточный торец участка.
    {
      id: 'commerce',
      origin: { x: 113.0, z: 17.5 },
      azimuth: 0,
      depth: 21,
      units: [{ id: 100, x0: 0, x1: 24 }],
      eaveHeight: 10.5,
      roof: 'flat',
    },
  ],
  plot: [
    [0, 0],
    [134.9, 0],
    [134.9, 77.7],
    [0, 77.7],
  ],
  pools: [],
  basemap: {
    // Спутниковый снимок площадки, как у U Villas I: Google Static Maps,
    // зум 18 при scale=2 — 1280 px покрывают 378 м. На зуме 19 охват был 189 м,
    // и участок в 134.9 м упирался в край снимка; здесь вокруг него остаётся
    // окружение. Дальше расширять одним запросом нельзя: 640×640 — потолок
    // Static Maps, больше только сшивкой тайлов.
    // Раньше здесь лежал сам чертёж: под моделью нужна карта, а не мастерплан,
    // и прозрачный фон PNG рисовался чёрным квадратом (материал подложки не
    // учитывает альфу).
    //
    // Якорь — пиксель, в который попадает начало координат модели, то есть
    // левый верхний угол участка. Снимок отцентрован по точке комплекса,
    // поэтому якорь смещён на половину габарита участка: 640 - 67.45/mpp по X
    // и 640 - 38.85/mpp по Y. Точная доводка — ползунками «Снимок» в редакторе.
    url: '/sun/ubud-dream.jpg',
    sizePx: 1280,
    metersPerPixel: 0.2953,
    anchorPx: { x: 412, y: 508 },
  },
}

const SITE_PLANS: Record<string, SitePlan> = {
  'u-villas-i': U_VILLAS_I,
  // Два ключа на один план: в базе у комплекса SEO:Slug =
  // 'ubud-dream-ubud-bali', а страница детали резолвится по короткому
  // 'ubud-dream'. План регистрируется под обоими, иначе блок на странице ЖК
  // молча не показывается при полностью заполненных настройках.
  'ubud-dream-ubud-bali': UBUD_DREAM,
  'ubud-dream': UBUD_DREAM,
}

export function getSitePlan(slug: string): SitePlan | null {
  return SITE_PLANS[slug] ?? null
}

/** Центр участка — вокруг него вращается модель. */
export function plotCenter(plan: SitePlan): { x: number; z: number } {
  const n = plan.plot.length
  return {
    x: plan.plot.reduce((sum, p) => sum + p[0], 0) / n,
    z: plan.plot.reduce((sum, p) => sum + p[1], 0) / n,
  }
}

/** Передняя (дворовая) граница участка на заданном X. */
export function frontBoundaryZ(plan: SitePlan, x: number): number {
  const [x3, z3] = plan.plot[3]
  const [x2, z2] = plan.plot[2]
  return z3 + ((x - x3) * (z2 - z3)) / (x2 - x3)
}
