// Hard-coded EN labels for enum-like filter dimensions whose values
// are stable taxonomy strings (status / permit / interior style / type).
// District labels are still resolved per-row from Airtable, since the
// district list is open-ended; these are closed.
//
// Used by buildOptions() in villy/_lib.ts, apartamenty/_lib.ts and
// zhilye-kompleksy/_lib.ts to translate filter chip labels on /en/*
// without requiring matching `<col> EN` columns in Airtable.

export const STATUS_EN: Record<string, string> = {
  // Apartment / villa / complex status values (mixed sources)
  'Строится': 'Under construction',
  'Построен': 'Completed',
  'Под заказ': 'On request',
  'Сдан': 'Handed over',
  'Готов': 'Ready',
  'Готовый': 'Ready',
  'Готовые': 'Ready',
  'Планируется': 'Planned',
  'На стадии планирования': 'Planning stage',
  'Проектирование': 'In design',
  'Подготовка к строительству': 'Pre-construction',
  'Заморожен': 'Frozen',
}

export const PERMIT_EN: Record<string, string> = {
  // Common Indonesian land/title abbreviations stay as-is, but
  // RU descriptions translate.
  'Лизхолд': 'Leasehold',
  'Фрихолд': 'Freehold',
  'Хак Пакай': 'Hak Pakai',
  'PBG': 'PBG',
  'SLF': 'SLF',
  'IMB': 'IMB',
  'SHM': 'SHM',
  'HGB': 'HGB',
  'Hak Pakai': 'Hak Pakai',
  'Туристическая зона': 'Tourism zone',
  'Жилая зона': 'Residential zone',
  'С разрешением': 'With permit',
  'Без разрешения': 'No permit',
  'В процессе оформления': 'Permit in progress',
  'Получено': 'Granted',
  'Получены': 'Granted',
  'Не получено': 'Not granted',
  'Не получены': 'Not granted',
}

export const STYLE_EN: Record<string, string> = {
  'Балийский тропический': 'Balinese tropical',
  'Современный минимализм': 'Modern minimalism',
  'Тропический модерн': 'Tropical modern',
  'Средиземноморский': 'Mediterranean',
  'Скандинавский': 'Scandinavian',
  'Японский / wabi-sabi': 'Japanese / wabi-sabi',
  'Лофт / индустриальный': 'Loft / industrial',
  'Бохо / эклектика': 'Boho / eclectic',
  'Классический': 'Classic',
  'Колониальный': 'Colonial',
}

export const TYPE_EN: Record<string, string> = {
  'Виллы': 'Villas',
  'Апартаменты': 'Apartments',
  'Таунхаусы': 'Townhouses',
  'Hotel': 'Hotel',
  'Смарт виллы': 'Smart villas',
  'Пентхаусы': 'Penthouses',
  'Commercial': 'Commercial',
}

export type FilterDim = 'status' | 'permit' | 'style' | 'type'

const TABLE: Record<FilterDim, Record<string, string>> = {
  status: STATUS_EN,
  permit: PERMIT_EN,
  style: STYLE_EN,
  type: TYPE_EN,
}

// Lookup helper: returns EN label if known, else the original RU value
// (never the broken `${ruCol} EN` placeholder).
export function enLabel(dim: FilterDim, ruValue: string): string {
  return TABLE[dim][ruValue] ?? ruValue
}
