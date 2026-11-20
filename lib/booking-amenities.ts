// «Для Booking» в форме «Редактировать» (владелец 19.11.2026): застройщик или
// команда отмечают, что у юнита есть и чего нет. Отметка человека важнее
// разбора фото ИИ — по рендерам ИИ не видит вид за окном, ванну и т. п.
//
// Хранится в JSONB `data` юнита одним ключом: { <пункт>: 'yes' | 'no' }.
// Нет ключа — «не знаю», тогда берётся то, что ИИ нашёл на фото.
//
// PRICED — признаки модели цены ночи (scripts/_demand-features.mjs, те же
// ключи): только они двигают оценку. EXTRA — популярные удобства Booking, на
// цену по нашим данным не влияют, просто видны гостю.
//
// Файл клиент-безопасный: его читают форма, API, анализ и scripts/demand-score.mjs.

export const BOOKING_FIELD = 'Booking: удобства'

export type Mark = 'yes' | 'no'
export type BookingMarks = Record<string, Mark>

export const BOOKING_PRICED: { key: string; ru: string; en: string }[] = [
  { key: 'pool_infinity', ru: 'Инфинити-бассейн', en: 'Infinity pool' },
  { key: 'pool_private', ru: 'Свой бассейн', en: 'Private pool' },
  { key: 'pool_shared', ru: 'Общий бассейн', en: 'Shared pool' },
  { key: 'view_ocean_full', ru: 'Вид на океан', en: 'Ocean view' },
  { key: 'view_ocean_partial', ru: 'Океан виден частично', en: 'Partial ocean view' },
  { key: 'view_nature', ru: 'Вид на рисовые поля, джунгли или горы', en: 'Rice field, jungle or mountain view' },
  { key: 'spacious', ru: 'Просторные комнаты', en: 'Spacious rooms' },
  { key: 'glass_wall', ru: 'Панорамные окна в пол', en: 'Floor-to-ceiling windows' },
  { key: 'bathtub', ru: 'Ванна', en: 'Bathtub' },
  { key: 'thatch_alang', ru: 'Крыша из травы алан-алан', en: 'Alang-alang thatched roof' },
  { key: 'open_air_living', ru: 'Открытая гостиная', en: 'Open-air living room' },
  { key: 'rooftop_terrace', ru: 'Терраса на крыше', en: 'Rooftop terrace' },
  { key: 'balcony', ru: 'Балкон', en: 'Balcony' },
  { key: 'outdoor_shower', ru: 'Душ под открытым небом', en: 'Outdoor shower' },
  { key: 'sala_gazebo', ru: 'Беседка-сала', en: 'Sala gazebo' },
]

export const BOOKING_EXTRA: { key: string; ru: string; en: string }[] = [
  { key: 'coffee_machine', ru: 'Кофемашина', en: 'Coffee machine' },
  { key: 'wifi', ru: 'Wi-Fi', en: 'Wi-Fi' },
  { key: 'workspace', ru: 'Рабочее место', en: 'Workspace' },
  { key: 'kitchen', ru: 'Своя кухня', en: 'Own kitchen' },
  { key: 'washing_machine', ru: 'Стиральная машина', en: 'Washing machine' },
  { key: 'parking', ru: 'Парковка', en: 'Parking' },
]

const ALL_KEYS = new Set([...BOOKING_PRICED, ...BOOKING_EXTRA].map(x => x.key))
const POOLS = ['pool_infinity', 'pool_private', 'pool_shared']

/** Сырое значение из базы → чистые отметки (лишнее отбрасываем). */
export function readMarks(raw: unknown): BookingMarks {
  const out: BookingMarks = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (ALL_KEYS.has(k) && (v === 'yes' || v === 'no')) out[k] = v
  }
  return out
}

/** Проверка ввода из формы. null — значение битое. */
export function parseMarks(v: unknown): BookingMarks | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const entries = Object.entries(v as Record<string, unknown>)
  if (entries.some(([k, m]) => !ALL_KEYS.has(k) || (m !== 'yes' && m !== 'no'))) return null
  return Object.fromEntries(entries) as BookingMarks
}

/**
 * Отметки поверх признаков модели (0/1/null). Бассейн — один тип: «есть»
 * у одного обнуляет остальные; «нет» у всех трёх — значит, бассейна нет.
 * Возвращает новые признаки и список тех, что задал человек.
 */
export function applyMarks<T extends Record<string, 0 | 1 | null>>(feats: T, marks: BookingMarks): { feats: T; byHuman: string[] } {
  const out: Record<string, 0 | 1 | null> = { ...feats }
  const byHuman: string[] = []
  for (const { key } of BOOKING_PRICED) {
    const m = marks[key]
    if (!m || !(key in out)) continue
    out[key] = m === 'yes' ? 1 : 0
    byHuman.push(key)
  }
  const poolYes = POOLS.find(k => marks[k] === 'yes')
  if (poolYes) {
    for (const k of POOLS) out[k] = k === poolYes ? 1 : 0
    if ('pool_none' in out) out.pool_none = 0
  } else if (POOLS.every(k => marks[k] === 'no') && 'pool_none' in out) {
    out.pool_none = 1
  }
  return { feats: out as T, byHuman }
}
