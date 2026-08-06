// Серверный слой солнечно-теневой модели ЖК.
//
// Два разных источника данных:
//   - План застройки (SITE_PLANS) — снят из вектора генплана застройщика,
//     не меняется, поэтому лежит в коде.
//   - Настройки (complex_sun_settings) — ориентация по сторонам света и
//     высоты. Их администратор крутит в /admin/sun/:slug, поэтому в БД.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const TABLE = 'complex_sun_settings'

export type SunSettings = {
  complexSlug: string
  /** Азимут направления «первая секция → последняя», градусы от севера по часовой. */
  rowAzimuth: number
  latitude: number
  longitude: number
  eaveHeight: number
  ridgeRise: number
  yardWall: number
  enabled: boolean
}

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
  basemap: {
    url: '/sun/u-villas-i.jpg',
    sizePx: 1024,
    metersPerPixel: 0.295,
    anchorPx: { x: 735.3, y: 731.3 },
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

type SunSettingsRow = {
  complex_slug: string
  row_azimuth: number | string
  latitude: number | null
  longitude: number | null
  eave_height: number | string
  ridge_rise: number | string
  yard_wall: number | string
  enabled: boolean
}

function toSettings(row: SunSettingsRow): SunSettings {
  return {
    complexSlug: row.complex_slug,
    rowAzimuth: Number(row.row_azimuth),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    eaveHeight: Number(row.eave_height),
    ridgeRise: Number(row.ridge_rise),
    yardWall: Number(row.yard_wall),
    enabled: row.enabled,
  }
}

export async function loadSunSettings(slug: string): Promise<SunSettings | null> {
  const { data, error } = await sb.from(TABLE).select('*').eq('complex_slug', slug).maybeSingle()
  if (error) {
    console.error('[complex-sun] loadSunSettings failed', slug, error.message)
    return null
  }
  return data ? toSettings(data as SunSettingsRow) : null
}

export type SunSettingsInput = Omit<SunSettings, 'complexSlug'>

export async function saveSunSettings(
  slug: string,
  input: SunSettingsInput,
): Promise<SunSettings | null> {
  const { data, error } = await sb
    .from(TABLE)
    .upsert(
      {
        complex_slug: slug,
        row_azimuth: input.rowAzimuth,
        latitude: input.latitude,
        longitude: input.longitude,
        eave_height: input.eaveHeight,
        ridge_rise: input.ridgeRise,
        yard_wall: input.yardWall,
        enabled: input.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'complex_slug' },
    )
    .select()
    .single()

  if (error) {
    console.error('[complex-sun] saveSunSettings failed', slug, error.message)
    return null
  }
  return toSettings(data as SunSettingsRow)
}
