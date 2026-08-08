// Форма закрытого отчёта «что и где строить» (/insights/product-premium)
// и чистые функции над ней.
//
// Модуль КЛИЕНТОБЕЗОПАСНЫЙ: его импортирует таблица районов ('use client'),
// поэтому здесь не должно появляться ни Supabase-клиента, ни серверных
// ключей. Загрузка данных — в lib/product-premium-data.ts.
// Сама арифметика живёт в SQL-функции product_premium_report(): считать те же
// перцентили в приложении означало бы десяток тяжёлых сканов на каждый рендер.

export type PremiumMeta = {
  listings: number
  photos: number
  complexes: number
  priced: number
  updated: string | null
}

export type PremiumFeature = {
  k: string
  premium: number | null
  premium_without: number | null
  share_market: number | null
  share_top: number | null
  share_ours: number | null
  n: number
}

export type PremiumZone = {
  kind: 'villa' | 'apartment'
  zone: string
  n: number
  med_adr: number
  med_occ: number
  share_hi: number
  adr_t3: number | null
  adr_t45: number | null
}

export type PremiumTier = {
  tier: number
  n: number
  adr_idx: number | null
  occ_idx: number | null
}

export type PremiumReport = {
  meta: PremiumMeta
  features: PremiumFeature[]
  zones: PremiumZone[]
  finish: PremiumTier[]
}

// Во сколько раз объект с отделкой 4–5 дороже объекта с отделкой 3 в этой зоне.
export function finishGap(zone: PremiumZone): number | null {
  if (!zone.adr_t3 || !zone.adr_t45) return null
  return zone.adr_t45 / zone.adr_t3
}

export type ZoneVerdict = 'free' | 'room' | 'crowded' | 'flat'

// Вердикт по зоне — то, ради чего застройщик открывает страницу.
// «Свободно» = за качество платят много, а качественного предложения мало.
export function zoneVerdict(zone: PremiumZone): ZoneVerdict {
  const gap = finishGap(zone)
  if (gap === null) return 'flat'
  if (zone.share_hi >= 50) return 'crowded'
  if (gap >= 2.2) return 'free'
  if (gap >= 1.6) return 'room'
  return 'flat'
}
