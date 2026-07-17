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
const STATUS_DE: Record<string, string> = {
  'Строится': 'Im Bau',
  'Построен': 'Fertiggestellt',
  'Под заказ': 'Auf Bestellung',
  'Сдан': 'Übergeben',
  'Готов': 'Bezugsfertig',
  'Готовый': 'Bezugsfertig',
  'Готовые': 'Bezugsfertig',
  'Планируется': 'Geplant',
  'На стадии планирования': 'In Planung',
  'Проектирование': 'In Planung',
  'Подготовка к строительству': 'Bauvorbereitung',
  'Заморожен': 'Eingefroren',
}
const STATUS_ZH: Record<string, string> = {
  'Строится': '在建',
  'Построен': '已建成',
  'Под заказ': '按需定制',
  'Сдан': '已交付',
  'Готов': '现房',
  'Готовый': '现房',
  'Готовые': '现房',
  'Планируется': '规划中',
  'На стадии планирования': '规划阶段',
  'Проектирование': '设计阶段',
  'Подготовка к строительству': '施工准备',
  'Заморожен': '已停工',
}
const STATUS_NL: Record<string, string> = {
  'Строится': 'In aanbouw',
  'Построен': 'Voltooid',
  'Под заказ': 'Op bestelling',
  'Сдан': 'Opgeleverd',
  'Готов': 'Instapklaar',
  'Готовый': 'Instapklaar',
  'Готовые': 'Instapklaar',
  'Планируется': 'Gepland',
  'На стадии планирования': 'In planning',
  'Проектирование': 'In ontwerp',
  'Подготовка к строительству': 'Voorbereiding bouw',
  'Заморожен': 'Bevroren',
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
const PERMIT_DE: Record<string, string> = {
  'Лизхолд': 'Leasehold (Erbpacht)', 'Фрихолд': 'Volleigentum', 'Хак Пакай': 'Hak Pakai',
  'PBG': 'PBG', 'SLF': 'SLF', 'IMB': 'IMB', 'SHM': 'SHM', 'HGB': 'HGB', 'Hak Pakai': 'Hak Pakai',
  'Туристическая зона': 'Tourismuszone', 'Жилая зона': 'Wohngebiet',
  'С разрешением': 'Mit Genehmigung', 'Без разрешения': 'Ohne Genehmigung',
  'В процессе оформления': 'Genehmigung in Bearbeitung', 'Получено': 'Erteilt', 'Получены': 'Erteilt',
  'Не получено': 'Nicht erteilt', 'Не получены': 'Nicht erteilt',
  'Заявка PBG': 'PBG beantragt', 'Заявка SLF': 'SLF beantragt', 'Заявка': 'Beantragt', 'нет': 'keine',
}
const PERMIT_ZH: Record<string, string> = {
  'Лизхолд': '租赁产权', 'Фрихолд': '永久产权', 'Хак Пакай': 'Hak Pakai',
  'PBG': 'PBG', 'SLF': 'SLF', 'IMB': 'IMB', 'SHM': 'SHM', 'HGB': 'HGB', 'Hak Pakai': 'Hak Pakai',
  'Туристическая зона': '旅游区', 'Жилая зона': '住宅区',
  'С разрешением': '有许可', 'Без разрешения': '无许可',
  'В процессе оформления': '许可办理中', 'Получено': '已获批', 'Получены': '已获批',
  'Не получено': '未获批', 'Не получены': '未获批',
  'Заявка PBG': 'PBG 申请中', 'Заявка SLF': 'SLF 申请中', 'Заявка': '已申请', 'нет': '无',
}
const PERMIT_NL: Record<string, string> = {
  'Лизхолд': 'Erfpacht (leasehold)', 'Фрихолд': 'Volle eigendom', 'Хак Пакай': 'Hak Pakai',
  'PBG': 'PBG', 'SLF': 'SLF', 'IMB': 'IMB', 'SHM': 'SHM', 'HGB': 'HGB', 'Hak Pakai': 'Hak Pakai',
  'Туристическая зона': 'Toeristische zone', 'Жилая зона': 'Woongebied',
  'С разрешением': 'Met vergunning', 'Без разрешения': 'Zonder vergunning',
  'В процессе оформления': 'Vergunning in behandeling', 'Получено': 'Verleend', 'Получены': 'Verleend',
  'Не получено': 'Niet verleend', 'Не получены': 'Niet verleend',
  'Заявка PBG': 'PBG aangevraagd', 'Заявка SLF': 'SLF aangevraagd', 'Заявка': 'Aangevraagd', 'нет': 'geen',
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
const STYLE_DE: Record<string, string> = {
  'Балийский тропический': 'Balinesisch tropisch', 'Современный минимализм': 'Moderner Minimalismus',
  'Тропический модерн': 'Tropische Moderne', 'Средиземноморский': 'Mediterran',
  'Скандинавский': 'Skandinavisch', 'Японский / wabi-sabi': 'Japanisch / Wabi-Sabi',
  'Лофт / индустриальный': 'Loft / Industrial', 'Бохо / эклектика': 'Boho / Eklektisch',
  'Классический': 'Klassisch', 'Колониальный': 'Kolonial',
}
const STYLE_ZH: Record<string, string> = {
  'Балийский тропический': '巴厘热带风', 'Современный минимализм': '现代极简',
  'Тропический модерн': '热带现代', 'Средиземноморский': '地中海风',
  'Скандинавский': '北欧风', 'Японский / wabi-sabi': '日式 / 侘寂',
  'Лофт / индустриальный': '工业 / Loft', 'Бохо / эклектика': '波西米亚 / 混搭',
  'Классический': '古典', 'Колониальный': '殖民地风',
}
const STYLE_NL: Record<string, string> = {
  'Балийский тропический': 'Balinees tropisch', 'Современный минимализм': 'Modern minimalisme',
  'Тропический модерн': 'Tropisch modern', 'Средиземноморский': 'Mediterraan',
  'Скандинавский': 'Scandinavisch', 'Японский / wabi-sabi': 'Japans / wabi-sabi',
  'Лофт / индустриальный': 'Loft / industrieel', 'Бохо / эклектика': 'Boho / eclectisch',
  'Классический': 'Klassiek', 'Колониальный': 'Koloniaal',
}

export const TYPE_EN: Record<string, string> = {
  'Виллы': 'Villas', 'Апартаменты': 'Apartments', 'Таунхаусы': 'Townhouses',
  'Hotel': 'Hotel', 'Смарт виллы': 'Smart villas', 'Пентхаусы': 'Penthouses', 'Commercial': 'Commercial',
  'Виллы и дома': 'Villas', 'Дома': 'Houses',
}
const TYPE_ID: Record<string, string> = {
  'Виллы': 'Vila', 'Апартаменты': 'Apartemen', 'Таунхаусы': 'Rumah bandar',
  'Hotel': 'Hotel', 'Смарт виллы': 'Vila pintar', 'Пентхаусы': 'Penthouse', 'Commercial': 'Komersial',
  'Виллы и дома': 'Vila', 'Дома': 'Rumah',
}
const TYPE_FR: Record<string, string> = {
  'Виллы': 'Villas', 'Апартаменты': 'Appartements', 'Таунхаусы': 'Maisons de ville',
  'Hotel': 'Hôtel', 'Смарт виллы': 'Villas intelligentes', 'Пентхаусы': 'Penthouses', 'Commercial': 'Commercial',
  'Виллы и дома': 'Villas', 'Дома': 'Maisons',
}
const TYPE_DE: Record<string, string> = {
  'Виллы': 'Villen', 'Апартаменты': 'Apartments', 'Таунхаусы': 'Reihenhäuser',
  'Hotel': 'Hotel', 'Смарт виллы': 'Smart-Villen', 'Пентхаусы': 'Penthäuser', 'Commercial': 'Gewerbe',
  'Виллы и дома': 'Villen', 'Дома': 'Häuser',
}
const TYPE_ZH: Record<string, string> = {
  'Виллы': '别墅', 'Апартаменты': '公寓', 'Таунхаусы': '联排别墅',
  'Hotel': '酒店', 'Смарт виллы': '智能别墅', 'Пентхаусы': '顶层公寓', 'Commercial': '商业地产',
  'Виллы и дома': '别墅', 'Дома': '房屋',
}
const TYPE_NL: Record<string, string> = {
  'Виллы': "Villa's", 'Апартаменты': 'Appartementen', 'Таунхаусы': 'Herenhuizen',
  'Hotel': 'Hotel', 'Смарт виллы': "Smart villa's", 'Пентхаусы': 'Penthouses', 'Commercial': 'Commercieel',
  'Виллы и дома': "Villa's", 'Дома': 'Huizen',
}

export type FilterDim = 'status' | 'permit' | 'style' | 'type'

const TABLE: Record<Lang, Record<FilterDim, Record<string, string>>> = {
  ru: { status: {}, permit: {}, style: {}, type: {} },
  en: { status: STATUS_EN, permit: PERMIT_EN, style: STYLE_EN, type: TYPE_EN },
  id: { status: STATUS_ID, permit: PERMIT_ID, style: STYLE_ID, type: TYPE_ID },
  fr: { status: STATUS_FR, permit: PERMIT_FR, style: STYLE_FR, type: TYPE_FR },
  de: { status: STATUS_DE, permit: PERMIT_DE, style: STYLE_DE, type: TYPE_DE },
  zh: { status: STATUS_ZH, permit: PERMIT_ZH, style: STYLE_ZH, type: TYPE_ZH },
  nl: { status: STATUS_NL, permit: PERMIT_NL, style: STYLE_NL, type: TYPE_NL },
  // Balinese: reuse EN maps (no Balinese taxonomy translation).
  ban: { status: STATUS_EN, permit: PERMIT_EN, style: STYLE_EN, type: TYPE_EN },
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
