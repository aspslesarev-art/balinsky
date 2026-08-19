// Отнесение юнита к типу продукта и к корпусу.
//
// Между комплексом и юнитом нужен промежуточный уровень, но «здание» в
// прайсах почти никто не указывает: имя корпуса даёт только Unitbox, у
// таблиц и презентаций его нет. Поэтому группой служит тип продукта —
// вилла, апартамент, коммерция, — а корпус подставляется там, где
// застройщик его назвал.

import type { ScrapedUnit } from './types'

export type UnitKind = 'villa' | 'apartment' | 'commercial' | 'unknown'

const VILLA_RE = /(villa|вилл|townhouse|таунхаус|bungalow|бунгало)/i
const APARTMENT_RE = /(apart|апарт|studio|студи|suite|room|номер|loft|лофт|penthouse|пентхаус)/i
const COMMERCIAL_RE = /(commercial|коммерч|office|офис|shop|магазин|retail|warehouse)/i

// Ключи, под которыми в прайсах встречается корпус или очередь. Порядок
// важен: имя корпуса точнее, чем очередь строительства.
const BUILDING_KEYS = ['blockName', 'Building', 'building', 'Блок', 'Корпус', 'Completion phase']

export function classifyKind(
  unit: Pick<ScrapedUnit, 'unitType' | 'landM2'>,
  sourceUnitTypes: string | null,
): UnitKind {
  const text = unit.unitType ?? ''

  if (COMMERCIAL_RE.test(text)) return 'commercial'
  if (VILLA_RE.test(text)) return 'villa'
  if (APARTMENT_RE.test(text)) return 'apartment'

  // Участок бывает только у виллы — квартире земля не принадлежит.
  if (unit.landM2 !== null && unit.landM2 > 0) return 'villa'

  // Последняя подсказка — как сам комплекс описан в мастер-таблице.
  // Годится, только когда он однороден: у «Апартаменты, Виллы» тип
  // юнита из этого не выводится.
  const fromSource = (sourceUnitTypes ?? '').trim().toLowerCase()
  if (fromSource === 'виллы') return 'villa'
  if (fromSource === 'апартаменты') return 'apartment'

  return 'unknown'
}

export function buildingOf(raw: Record<string, string> | null | undefined): string | null {
  if (!raw) return null
  for (const key of BUILDING_KEYS) {
    const value = raw[key]?.trim()
    // Отсекаем ячейки, где под видом корпуса лежит метраж или ссылка.
    if (value && value.length <= 60 && !/^\d+([.,]\d+)?$/.test(value)) return value
  }
  return null
}

// Перепродажа: юнит выставлен не застройщиком, а инвестором, который
// купил его раньше и теперь выходит. Для оценки спроса это
// противоположность нераспроданному остатку — такой юнит когда-то
// успешно продали.
export function isResale(raw: Record<string, string> | null | undefined): boolean {
  if (!raw) return false
  if (raw.legendStatus === 'Resale') return true
  if (raw.resale === 'true') return true
  return false
}

export const KIND_LABEL: Record<UnitKind, string> = {
  villa: 'Виллы',
  apartment: 'Апартаменты',
  commercial: 'Коммерция',
  unknown: 'Тип не определён',
}
