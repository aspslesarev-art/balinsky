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

export type SitePlan = {
  title: string
  district: string
  /** Часовой пояс площадки без перехода на летнее время. */
  utcOffsetHours: number
  /** Глубина корпуса вдоль оси Z, метры. */
  buildingDepth: number
  units: PlanUnit[]
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

const SITE_PLANS: Record<string, SitePlan> = {
  'u-villas-i': U_VILLAS_I,
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
