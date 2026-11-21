// Шахматка юнитов поверх генплана (компонент EcoWoodChessBoard).
//
// Раньше включалась только для EcoWood — проверкой complexId === 'adm_ecowood_001'
// прямо в коде страниц ЖК и застройщика. Теперь это данные: site_content,
// раздел 'unit-grid', элемент = airtable_id ЖК:
//   { "masterplanUrl": "https://…/render.jpg",
//     "idPrefix": "adm_ecowood_v",        // id вилл ЖК: <prefix><номер юнита>
//     "maxUnit": 10,
//     "pins": { "1": { "x": 42, "y": 20 }, … } }   // необязательно: точки на генплане, %
// Новая шахматка = строка в базе, выкладка не нужна. Пусто в базе — EcoWood из кода.

import { createClient } from '@supabase/supabase-js'
import { loadSiteSection } from './site-content'
import type { VillaUnit } from '@/components/EcoWoodChessBoard'

export type UnitGridConfig = {
  masterplanUrl: string
  idPrefix: string
  maxUnit: number
  pins?: Record<string, { x: number; y: number }>
}

export const UNIT_GRID_FALLBACK: Readonly<Record<string, UnitGridConfig>> = {
  adm_ecowood_001: {
    masterplanUrl: 'https://images.balinsky.info/storage/v1/object/public/complex-photos/adm_ecowood_001/render.jpg',
    idPrefix: 'adm_ecowood_v',
    maxUnit: 10,
  },
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export type UnitGrid = { complexId: string; config: UnitGridConfig; villas: VillaUnit[] }

/** Шахматка первого ЖК из списка, у которого она настроена; иначе null. */
export async function loadUnitGrid(complexIds: string[]): Promise<UnitGrid | null> {
  const all = await loadSiteSection<UnitGridConfig>('unit-grid', UNIT_GRID_FALLBACK)
  const complexId = complexIds.find(id => all[id]?.idPrefix && all[id]?.masterplanUrl)
  if (!complexId) return null
  const config = all[complexId]
  const { data } = await sb.from('raw_villas')
    .select('airtable_id, data')
    .like('airtable_id', `${config.idPrefix}%`)
  if (!data) return null
  const max = config.maxUnit || 99
  const villas = data
    .filter(r => String(r.airtable_id).startsWith(config.idPrefix))
    .map(r => {
      const d = r.data as Record<string, unknown>
      const unit = parseInt(String(r.airtable_id).slice(config.idPrefix.length), 10)
      return {
        unit,
        bedrooms: Number(d['Спальни']) || 1,
        area: Number(d['Площадь']) || 70,
        price: Number(d['Цена']) || 159000,
        sold: d['Продано'] === true || d['Продано'] === 'true',
        slug: String(d['SEO:Slug'] ?? ''),
      }
    })
    .filter(v => v.slug && v.unit >= 1 && v.unit <= max)
    .sort((a, b) => a.unit - b.unit)
  return villas.length ? { complexId, config, villas } : null
}
