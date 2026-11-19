import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

// «Оценить для Booking» (владелец 19.11.2026): что видно на фото виллы и
// сколько каждый такой признак даёт к цене ночи на Booking. Признаки и
// коэффициенты — те же, что у балла востребованности (scripts/_demand-features.mjs,
// scripts/demand-model-fit.mjs → public.demand_model, разбор фото →
// public.catalog_product_vision). Здесь только чтение.

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type Vision = {
  views?: string[]; architecture?: string[]; materials?: string[]; pool_type?: string; space_feel?: string
  bathtub?: boolean; outdoor_shower?: boolean; outdoor_living_share?: number; rooms_shown?: string[]
  workspace_desk?: boolean; wow_element?: string
}

export type BookingFit = {
  /** Признак → есть (1) / нет (0) / по фото не понять (null). */
  feats: Record<string, 0 | 1 | null>
  /** Признак → во сколько раз меняется цена ночи у тех, у кого он есть (exp(coef)). */
  adr: Record<string, number>
  nMarket: number
  photos: number
  wow: string | null
}

const has = (a: string[] | undefined, ...v: string[]) => Array.isArray(a) && v.some(x => a.includes(x))

// Копия extractFeatures/unknownFeatures из scripts/_demand-features.mjs — без
// finish_tier (по рендерам он завышен, в модели его вклад обнулён).
function features(v: Vision): Record<string, 0 | 1 | null> {
  const pool = v.pool_type ?? 'none', space = v.space_feel ?? ''
  const f: Record<string, 0 | 1> = {
    pool_infinity: pool === 'infinity' ? 1 : 0,
    pool_private: pool === 'private_standard' || pool === 'plunge' || pool === 'lap' ? 1 : 0,
    pool_shared: pool === 'shared' ? 1 : 0,
    pool_none: pool === 'none' ? 1 : 0,
    view_ocean_full: has(v.views, 'ocean_full') ? 1 : 0,
    view_ocean_partial: has(v.views, 'ocean_partial') ? 1 : 0,
    view_nature: has(v.views, 'jungle', 'river_valley', 'rice_field', 'mountain') ? 1 : 0,
    open_air_living: has(v.architecture, 'open_air_living') ? 1 : 0,
    double_height: has(v.architecture, 'double_height_ceiling') ? 1 : 0,
    glass_wall: has(v.architecture, 'floor_to_ceiling_glass') ? 1 : 0,
    rooftop_terrace: has(v.architecture, 'rooftop_terrace') ? 1 : 0,
    private_garden: has(v.architecture, 'private_garden') ? 1 : 0,
    sala_gazebo: has(v.architecture, 'sala_gazebo') ? 1 : 0,
    thatch_alang: has(v.materials, 'thatch_alang') ? 1 : 0,
    bathtub: v.bathtub === true ? 1 : 0,
    outdoor_shower: v.outdoor_shower === true ? 1 : 0,
    spacious: space === 'spacious' || space === 'grand' ? 1 : 0,
    cramped: space === 'cramped' || space === 'compact' ? 1 : 0,
    outdoor_living_hi: Number(v.outdoor_living_share) >= 4 ? 1 : 0,
    multi_level: has(v.architecture, 'multi_level') ? 1 : 0,
    balcony: has(v.architecture, 'balcony') ? 1 : 0,
  }
  // Отсутствие — улика, только если нужный кадр был в подборке.
  const EVIDENCE: Record<string, string[]> = {
    pool_infinity: ['pool_area', 'exterior'], pool_private: ['pool_area', 'exterior'], pool_shared: ['pool_area', 'exterior'], pool_none: ['pool_area', 'exterior'],
    view_ocean_full: ['exterior', 'pool_area', 'garden', 'rooftop'], view_ocean_partial: ['exterior', 'pool_area', 'garden', 'rooftop'], view_nature: ['exterior', 'pool_area', 'garden', 'rooftop'],
    private_garden: ['exterior', 'garden'], sala_gazebo: ['exterior', 'garden', 'pool_area'], rooftop_terrace: ['exterior', 'rooftop'], thatch_alang: ['exterior'],
    outdoor_shower: ['bathroom', 'exterior', 'garden'], outdoor_living_hi: ['exterior', 'garden', 'pool_area'], balcony: ['exterior'], bathtub: ['bathroom'],
  }
  const rooms = v.rooms_shown ?? []
  const out: Record<string, 0 | 1 | null> = { ...f }
  for (const [k, need] of Object.entries(EVIDENCE)) if (!f[k] && !need.some(r => rooms.includes(r))) out[k] = null
  if (out.pool_infinity === null && f.pool_none) out.pool_none = null
  return out
}

const loadModel = unstable_cache(async () => {
  const { data, error } = await sb.from('demand_model').select('target, coef, n_train, n_holdout, version').eq('target', 'adr').order('version', { ascending: false }).limit(1)
  if (error) throw new Error(`demand_model: ${error.message}`)
  const m = data?.[0]
  if (!m) throw new Error('demand_model: empty')
  return { coef: m.coef as Record<string, number>, n: Number(m.n_train) + Number(m.n_holdout) }
}, ['analytics-booking-model-v1'], { revalidate: 86400 })

export async function loadBookingFit(kind: 'villa' | 'apartment', airtableId: string): Promise<BookingFit | null> {
  const [model, vis] = await Promise.all([
    loadModel(),
    sb.from('catalog_product_vision').select('vision, photos_used').eq('kind', kind).eq('airtable_id', airtableId).maybeSingle(),
  ])
  if (vis.error) throw new Error(`catalog_product_vision: ${vis.error.message}`)
  if (!vis.data?.vision) return null
  const v = vis.data.vision as Vision
  const adr: Record<string, number> = {}
  for (const [k, c] of Object.entries(model.coef)) if (k !== 'finish_tier') adr[k] = Math.exp(c)
  const wow = typeof v.wow_element === 'string' && v.wow_element !== 'none' ? v.wow_element : null
  return { feats: features(v), adr, nMarket: model.n, photos: Number(vis.data.photos_used) || 0, wow }
}
