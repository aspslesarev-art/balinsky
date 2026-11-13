import type { Routes } from './complex-access'

// «Убуд» в routes — дворец в центре, где пробки; ubud_south — Пенгосекан, жилая
// часть с магазинами и кафе (scripts/routes-ubud-south.ts, владелец 13.11.2026).
// Вторую строку показываем, только когда до юга заметно ближе (≥3 мин).
export const showUbudSouth = (r: Routes | null | undefined) =>
  !!(r?.ubud && r.ubud_south && r.ubud.s - r.ubud_south.s >= 180)
export const UBUD_CENTER_LABEL = { ru: 'Центр Убуда', en: 'Ubud centre', id: 'Pusat Ubud', fr: 'Centre d’Ubud', de: 'Ubud Zentrum', zh: '乌布中心', nl: 'Centrum Ubud', ban: 'Pusat Ubud', pl: 'Centrum Ubud', uk: 'Центр Убуда' }
export const UBUD_SOUTH_LABEL = { ru: 'Южный Убуд', en: 'South Ubud', id: 'Ubud Selatan', fr: 'Ubud Sud', de: 'Süd-Ubud', zh: '乌布南部', nl: 'Zuid-Ubud', ban: 'Ubud Kelod', pl: 'Południowe Ubud', uk: 'Південний Убуд' }
