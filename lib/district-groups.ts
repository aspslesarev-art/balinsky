// Группы районов для фильтра каталога: «Весь Чангу», «Весь Букит», «Весь Убуд».
//
// В базе район хранится мелкой латинской локацией («Location 2»): один Чангу
// разбит на Berawa, Batu Bolong, Pererenan, Babakan, Padonan… — и чтобы
// посмотреть «всё в Чангу», приходилось отмечать восемь галочек. Группа
// ставит их одним тапом. Состав — по географии полуострова/побережья, а не
// по админделению (Нуса Дуа и Джимбаран — на Буките, Умалас — между Чангу и
// Семиньяком, но по рынку аренды и покупателям относится к Чангу).
// Значения — те же латинские названия, что в базе. Группа ставит в URL весь
// свой список (и локации, которых сейчас нет в каталоге, — фильтру они не
// мешают): так выбор «Весь Чангу» узнаётся точным совпадением, без догадок.
import { pickCopy, type Lang } from './i18n'
import { districtRu } from './district-ru'

export type DistrictGroupId = 'canggu' | 'bukit' | 'ubud'

export const DISTRICT_GROUPS: Record<DistrictGroupId, readonly string[]> = {
  canggu: ['Canggu', 'Berawa', 'Batu Bolong', 'Echo Beach', 'Pererenan', 'Babakan', 'Padonan', 'Tumbak Bayuh', 'Tibubeneng', 'Seseh', 'Cemagi', 'Umalas'],
  bukit: ['Bukit', 'Uluwatu', 'Bingin', 'Padang Padang', 'Pecatu', 'Nunggalan', 'Ungasan', 'Melasti', 'Pandawa', 'GWK', 'Jimbaran', 'Nusa Dua'],
  ubud: ['Ubud', 'Penestanan', 'Tegallalang'],
}

const GROUP_LABELS = {
  ru: { canggu: 'Весь Чангу', bukit: 'Весь Букит', ubud: 'Весь Убуд' },
  en: { canggu: 'All Canggu', bukit: 'All Bukit', ubud: 'All Ubud' },
  id: { canggu: 'Seluruh Canggu', bukit: 'Seluruh Bukit', ubud: 'Seluruh Ubud' },
  fr: { canggu: 'Tout Canggu', bukit: 'Tout le Bukit', ubud: 'Tout Ubud' },
  de: { canggu: 'Ganz Canggu', bukit: 'Ganz Bukit', ubud: 'Ganz Ubud' },
  zh: { canggu: '整个仓古', bukit: '整个布基特半岛', ubud: '整个乌布' },
  nl: { canggu: 'Heel Canggu', bukit: 'Heel Bukit', ubud: 'Heel Ubud' },
  ban: { canggu: 'Canggu makasami', bukit: 'Bukit makasami', ubud: 'Ubud makasami' },
  pl: { canggu: 'Całe Canggu', bukit: 'Cały Bukit', ubud: 'Cały Ubud' },
  uk: { canggu: 'Весь Чангу', bukit: 'Весь Букит', ubud: 'Весь Убуд' },
} as const

export type DistrictGroup = { id: DistrictGroupId; label: string; values: string[]; count: number }

// Группы для текущих опций фильтра. Показываем, только если в каталоге есть
// хотя бы две локации группы — иначе это просто сам район. count — сумма
// счётчиков локаций группы.
export function buildDistrictGroups(
  options: { value: string; count?: number }[],
  lang: Lang,
): DistrictGroup[] {
  const labels = pickCopy(GROUP_LABELS, lang)
  const byValue = new Map(options.map(o => [o.value, o.count ?? 0]))
  const out: DistrictGroup[] = []
  for (const id of Object.keys(DISTRICT_GROUPS) as DistrictGroupId[]) {
    const present = DISTRICT_GROUPS[id].filter(v => byValue.has(v))
    if (present.length < 2) continue
    out.push({ id, label: labels[id], values: [...DISTRICT_GROUPS[id]], count: present.reduce((n, v) => n + (byValue.get(v) ?? 0), 0) })
  }
  return out
}

// Какая группа выбрана целиком (точное совпадение списка), если выбрана.
export function selectedGroup(selected: string[]): DistrictGroupId | null {
  if (selected.length < 2) return null
  const set = new Set(selected)
  for (const id of Object.keys(DISTRICT_GROUPS) as DistrictGroupId[]) {
    const g = DISTRICT_GROUPS[id]
    if (g.length === set.size && g.every(v => set.has(v))) return id
  }
  return null
}

export function groupLabel(id: DistrictGroupId, lang: Lang): string {
  return pickCopy(GROUP_LABELS, lang)[id]
}

// Поиск по районам понимает группы: «чангу» / «canggu» → весь Чангу.
export function districtGroupByName(text: string): DistrictGroupId | null {
  const t = text.toLowerCase()
  if (/чанг|canggu|changu/.test(t)) return 'canggu'
  if (/букит|bukit/.test(t)) return 'bukit'
  if (/убуд|ubud/.test(t)) return 'ubud'
  return null
}

const GROUP_PLACE = {
  ru: { canggu: 'Чангу', bukit: 'Букит', ubud: 'Убуд' },
  uk: { canggu: 'Чангу', bukit: 'Букит', ubud: 'Убуд' },
  zh: { canggu: '仓古', bukit: '布基特半岛', ubud: '乌布' },
  en: { canggu: 'Canggu', bukit: 'Bukit', ubud: 'Ubud' },
} as const

// Районы для заголовка страницы: выбор целой группы — одно имя («Чангу»),
// а не перечень из двенадцати латинских локаций; на русской версии — по-русски.
export function districtsForHeading(districts: string[], lang: Lang): string[] {
  const g = selectedGroup(districts)
  if (g) return [pickCopy(GROUP_PLACE, lang)[g]]
  return lang === 'ru' ? districts.map(d => districtRu(d) ?? d) : districts
}
