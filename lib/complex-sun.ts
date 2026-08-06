import 'server-only'

// Доступ к настройкам солнечно-теневой модели ЖК.
//
// Обмер генплана и геометрия — в lib/complex-sun-plan.ts: тот модуль
// безопасен для клиента и его тянет 3D-сцена. Здесь только база, поэтому
// файл помечен server-only: если он случайно попадёт в клиентский бандл,
// сборка упадёт, а не отдаст в браузер модуль с сервисным ключом.

import { createClient } from '@supabase/supabase-js'
import type { SunSettings, SunSettingsInput } from './complex-sun-plan'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const TABLE = 'complex_sun_settings'

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
