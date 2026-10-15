// Сводка загрузки Booking для /admin/booking. Всё считает SQL-функция
// booking_occ_dashboard() (миграция 105, ~6 с), данные меняются раз в сутки
// после сбора — поэтому кэш на час.

import { unstable_cache } from 'next/cache'
import { sbAdmin } from '@/lib/market/apply'

export type OccRun = { d: string; hotel_pct: number | null; singles: number | null; multis: number | null; errors: number | null; finished_at: string | null; alerts: string | null }
export type OccZone = {
  zone: string
  hotel_rooms: number | null; hotel_free: number | null; hotel_rooms_prev: number | null; hotel_free_prev: number | null; hotel_props: number | null
  villas: number | null; villa_booked: number | null; villa_open: number | null
  c14: number | null; n14: number | null; cfar: number | null; nfar: number | null
}
export type OccHotelSeg = { zone: string | null; seg: string; props: number; inv: number; free: number }
export type OccVillaSeg = { zone: string | null; seg: string; units: number; booked: number; open: number; c14: number; n14: number; cfar: number; nfar: number }
export type OccDashboard = {
  run_date: string | null
  prev_date: string | null
  runs: OccRun[]
  villa_trend: { d: string; booked: number; open: number }[]
  closed_by_day: { d: string; nights: number; villas: number }[]
  zones: OccZone[]
  total: { hotel_rooms: number; hotel_free: number; hotel_rooms_prev: number | null; hotel_free_prev: number | null; hotel_props: number; villas: number; villa_booked: number; villa_open: number }
  hotel_segments: OccHotelSeg[]
  villa_segments: OccVillaSeg[]
}

export const loadOccDashboard = unstable_cache(
  async (): Promise<OccDashboard> => {
    const { data, error } = await sbAdmin().rpc('booking_occ_dashboard')
    if (error) throw new Error(`booking_occ_dashboard: ${error.message}`)
    if (!data?.run_date) throw new Error('booking_occ_dashboard: пустой ответ')
    return data as OccDashboard
  },
  ['booking-occ-dashboard-v3'],
  { revalidate: 3600, tags: ['booking-occ'] },
)

// «Что влияет на загрузку»: считается раз в сутки booking_occ_drivers_refresh()
// (pg_cron, 15:00 WITA, миграция 108) — страница только читает готовое.
export type OccDriver = {
  kind: 'hotel' | 'villa'; source: 'fac' | 'ph' | 'pl'; feature: string
  n_with: number; n_without: number; occ_with: number; occ_without: number
  lift: number; se: number; strata: number; coverage: number | null
}
export type OccDriversMeta = {
  computed_at: string | null; hotel_units: number; villa_units: number; hotel_vision: number; villa_vision: number
  days: number; first_day: string | null; last_day: string | null
}

export const loadOccDrivers = unstable_cache(
  async (): Promise<{ rows: OccDriver[]; meta: OccDriversMeta | null }> => {
    const sb = sbAdmin()
    const [d, m] = await Promise.all([
      sb.from('booking_occ_drivers').select('kind,source,feature,n_with,n_without,occ_with,occ_without,lift,se,strata,coverage').range(0, 4999),
      sb.from('booking_occ_drivers_meta').select('*').maybeSingle(),
    ])
    if (d.error) throw new Error(`booking_occ_drivers: ${d.error.message}`)
    if (m.error) throw new Error(`booking_occ_drivers_meta: ${m.error.message}`)
    const rows = (d.data ?? []).map(r => ({ ...r, n_with: +r.n_with, n_without: +r.n_without, occ_with: +r.occ_with,
      occ_without: +r.occ_without, lift: +r.lift, se: +r.se, strata: +r.strata })) as OccDriver[]
    return { rows, meta: m.data as OccDriversMeta | null }
  },
  ['booking-occ-drivers-v1'],
  { revalidate: 3600, tags: ['booking-occ'] },
)
