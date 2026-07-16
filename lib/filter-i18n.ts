// Hard-coded labels for enum-like filter dimensions whose values are
// stable taxonomy strings (status / permit / interior style / type),
// stored in Russian in Airtable. We translate them per language without
// requiring matching `<col> EN/ID/FR` columns.
//
// Used by buildOptions() in villy/_lib.ts, apartamenty/_lib.ts and
// zhilye-kompleksy/_lib.ts (filter chips) and by card/detail renderers.
//
// Any value not in a map falls through facetLabel(): for non-RU it is
// transliterated to Latin (never leaves Cyrillic on an en/id/fr page).

import type { Lang } from './i18n'
import { translit, hasCyrillic } from './translit'

export const STATUS_EN: Record<string, string> = {
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
const STATUS_ID: Record<string, string> = {
  'Строится': 'Dalam pembangunan',
  'Построен': 'Selesai dibangun',
  'Под заказ': 'Sesuai pesanan',
  'Сдан': 'Serah terima',
  'Готов': 'Siap',
  'Готовый': 'Siap',
  'Готовые': 'Siap',
  'Планируется': 'Direncanakan',
  'На стадии планирования': 'Tahap perencanaan',
  'Проектирование': 'Tahap perancangan',
  'Подготовка к строительству': 'Persiapan konstruksi',
  'Заморожен': 'Dibekukan',
}
const STATUS_FR: Record<string, string> = {
  'Строится': 'En construction',
  'Построен': 'Achevé',
  'Под заказ': 'Sur commande',
  'Сдан': 'Livré',
  'Готов': 'Prêt',
  'Готовый': 'Prêt',
  'Готовые': 'Prêts',
  'Планируется': 'Planifié',
  'На стадии планирования': 'En planification',
  'Проектирование': 'En conception',
  'Подготовка к строительству': 'Pré-construction',
  'Заморожен': 'Gelé',
}

export const PERMIT_EN: Record<string, string> = {
  'Лизхолд': 'Leasehold', 'Фрихолд': 'Freehold', 'Хак Пакай': 'Hak Pakai',
  'PBG': 'PBG', 'SLF': 'SLF', 'IMB': 'IMB', 'SHM': 'SHM', 'HGB': 'HGB', 'Hak Pakai': 'Hak Pakai',
  'Туристическая зона': 'Tourism zone', 'Жилая зона': 'Residential zone',
  'С разрешением': 'With permit', 'Без разрешения': 'No permit',
  'В процессе оформления': 'Permit in progress', 'Получено': 'Granted', 'Получены': 'Granted',
  'Не получено': 'Not granted', 'Не получены': 'Not granted',
  'Заявка PBG': 'PBG pending', 'Заявка SLF': 'SLF pending', 'Заявка': 'Applied', 'нет': 'None',
}
const PERMIT_ID: Record<string, string> = {
  'Лизхолд': 'Hak sewa', 'Фрихолд': 'Hak milik', 'Хак Пакай': 'Hak Pakai',
  'PBG': 'PBG', 'SLF': 'SLF', 'IMB': 'IMB', 'SHM': 'SHM', 'HGB': 'HGB', 'Hak Pakai': 'Hak Pakai',
  'Туристическая зона': 'Zona pariwisata', 'Жилая зона': 'Zona hunian',
  'С разрешением': 'Dengan izin', 'Без разрешения': 'Tanpa izin',
  'В процессе оформления': 'Sedang diproses', 'Получено': 'Diterima', 'Получены': 'Diterima',
  'Не получено': 'Belum diterima', 'Не получены': 'Belum diterima',
  'Заявка PBG': 'PBG diajukan', 'Заявка SLF': 'SLF diajukan', 'Заявка': 'Diajukan', 'нет': 'tidak ada',
}
const PERMIT_FR: Record<string, string> = {
  'Лизхолд': 'Bail (leasehold)', 'Фрихолд': 'Pleine propriété', 'Хак Пакай': 'Hak Pakai',
  'PBG': 'PBG', 'SLF': 'SLF', 'IMB': 'IMB', 'SHM': 'SHM', 'HGB': 'HGB', 'Hak Pakai': 'Hak Pakai',
  'Туристическая зона': 'Zone touristique', 'Жилая зона': 'Zone résidentielle',
  'С разрешением': 'Avec permis', 'Без разрешения': 'Sans permis',
  'В процессе оформления': 'Permis en cours', 'Получено': 'Obtenu', 'Получены': 'Obtenus',
  'Не получено': 'Non obtenu', 'Не получены': 'Non obtenus',
  'Заявка PBG': 'PBG en cours', 'Заявка SLF': 'SLF en cours', 'Заявка': 'Demande déposée', 'нет': 'aucun',
}

export const STYLE_EN: Record<string, string> = {
  'Балийский тропический': 'Balinese tropical', 'Современный минимализм': 'Modern minimalism',
  'Тропический модерн': 'Tropical modern', 'Средиземноморский': 'Mediterranean',
  'Скандинавский': 'Scandinavian', 'Японский / wabi-sabi': 'Japanese / wabi-sabi',
  'Лофт / индустриальный': 'Loft / industrial', 'Бохо / эклектика': 'Boho / eclectic',
  'Классический': 'Classic', 'Колониальный': 'Colonial',
}
const STYLE_ID: Record<string, string> = {
  'Балийский тропический': 'Tropis Bali', 'Современный минимализм': 'Minimalis modern',
  'Тропический модерн': 'Tropis modern', 'Средиземноморский': 'Mediterania',
  'Скандинавский': 'Skandinavia', 'Японский / wabi-sabi': 'Jepang / wabi-sabi',
  'Лофт / индустриальный': 'Loft / industrial', 'Бохо / эклектика': 'Boho / eklektik',
  'Классический': 'Klasik', 'Колониальный': 'Kolonial',
}
const STYLE_FR: Record<string, string> = {
  'Балийский тропический': 'Tropical balinais', 'Современный минимализм': 'Minimalisme moderne',
  'Тропический модерн': 'Tropical moderne', 'Средиземноморский': 'Méditerranéen',
  'Скандинавский': 'Scandinave', 'Японский / wabi-sabi': 'Japonais / wabi-sabi',
  'Лофт / индустриальный': 'Loft / industriel', 'Бохо / эклектика': 'Bohème / éclectique',
  'Классический': 'Classique', 'Колониальный': 'Colonial',
}

export const TYPE_EN: Record<string, string> = {
  'Виллы': 'Villas', 'Апартаменты': 'Apartments', 'Таунхаусы': 'Townhouses',
  'Hotel': 'Hotel', 'Смарт виллы': 'Smart villas', 'Пентхаусы': 'Penthouses', 'Commercial': 'Commercial',
}
const TYPE_ID: Record<string, string> = {
  'Виллы': 'Vila', 'Апартаменты': 'Apartemen', 'Таунхаусы': 'Rumah bandar',
  'Hotel': 'Hotel', 'Смарт виллы': 'Vila pintar', 'Пентхаусы': 'Penthouse', 'Commercial': 'Komersial',
}
const TYPE_FR: Record<string, string> = {
  'Виллы': 'Villas', 'Апартаменты': 'Appartements', 'Таунхаусы': 'Maisons de ville',
  'Hotel': 'Hôtel', 'Смарт виллы': 'Villas intelligentes', 'Пентхаусы': 'Penthouses', 'Commercial': 'Commercial',
}

export type FilterDim = 'status' | 'permit' | 'style' | 'type'

const TABLE: Record<Lang, Record<FilterDim, Record<string, string>>> = {
  ru: { status: {}, permit: {}, style: {}, type: {} },
  en: { status: STATUS_EN, permit: PERMIT_EN, style: STYLE_EN, type: TYPE_EN },
  id: { status: STATUS_ID, permit: PERMIT_ID, style: STYLE_ID, type: TYPE_ID },
  fr: { status: STATUS_FR, permit: PERMIT_FR, style: STYLE_FR, type: TYPE_FR },
}

/**
 * Localize an enum-like facet value. RU returns the source. For en/id/fr,
 * return the mapped label; if the value isn't mapped, try EN, and finally
 * transliterate any leftover Cyrillic so no facet ever renders Cyrillic on
 * a non-RU page.
 */
export function facetLabel(dim: FilterDim, ruValue: string, lang: Lang): string {
  if (lang === 'ru') return ruValue
  const hit = TABLE[lang][dim][ruValue] ?? TABLE.en[dim][ruValue]
  if (hit) return hit
  return hasCyrillic(ruValue) ? translit(ruValue) : ruValue
}

/** Back-compat: EN label (used where lang isn't threaded yet). */
export function enLabel(dim: FilterDim, ruValue: string): string {
  return facetLabel(dim, ruValue, 'en')
}
