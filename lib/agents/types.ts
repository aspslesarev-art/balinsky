// Общие типы CRM по агентам. Лежат отдельно от store.ts, потому что их
// импортирует и клиентский компонент доски — а store тянет service-key
// клиент Supabase, которому в браузере делать нечего.

export type AgentStatus = 'new' | 'contact' | 'to_schedule' | 'scheduled' | 'met' | 'working' | 'lost'

// Порядок здесь = порядок колонок на доске.
export const STATUSES: Array<{ id: AgentStatus; label: string; hint: string }> = [
  { id: 'new',         label: 'Без статуса',       hint: 'Контакт есть, что с ним делать — ещё не решили' },
  { id: 'contact',     label: 'Связаться',         hint: 'Нужно написать или позвонить' },
  { id: 'to_schedule', label: 'Назначить встречу', hint: 'Договорились созвониться — осталось поставить дату' },
  { id: 'scheduled',   label: 'Назначена встреча', hint: 'Дата есть, встреча впереди' },
  { id: 'met',         label: 'Проведена встреча', hint: 'Встретились, ждём результата' },
  { id: 'working',     label: 'Работаем',          hint: 'Агент приводит клиентов' },
  { id: 'lost',        label: 'Не сложилось',      hint: 'Не отвечает или отказался' },
]

export const STATUS_LABEL: Record<AgentStatus, string> =
  Object.fromEntries(STATUSES.map(s => [s.id, s.label])) as Record<AgentStatus, string>

export function isStatus(v: unknown): v is AgentStatus {
  return typeof v === 'string' && STATUSES.some(s => s.id === v)
}

export type Agent = {
  id: string
  name: string
  agency: string | null
  status: AgentStatus
  manager: string | null
  position: string | null
  location: string | null
  telegram: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  deals_count: number | null
  deals_volume_usd: number | null
  last_contact: string | null
  next_contact: string | null
  next_step: string | null
  notes: string | null
  data: Record<string, string>
  tg_chat_id: number | null
  ai_summary: string | null
  ai_next_step: string | null
  ai_updated_at: string | null
  ai_last_message_id: number | null
  sort: number
  archived: boolean
  source: string
  created_at: string
  updated_at: string
}

// Строка доски: карточка плюс то, что подтянулось из переписки бота.
export type AgentCard = Agent & {
  chat_last_ts: string | null
  chat_last_text: string | null
  chat_message_count: number
  chat_meeting_count: number
  // Ближайшая назначенная встреча — она же подпись на карточке доски.
  next_meeting_at: string | null
  next_meeting_place: string | null
}

// Когда с агентом общались в последний раз. Два источника: живая
// переписка бота и дата, проставленная руками (из Notion или в карточке).
// Берём позднюю — иначе привязанный вчера чат не перебьёт прошлогоднюю
// отметку, и карточка навсегда зависнет вверху «давно не общались».
export function lastContactAt(a: AgentCard): string | null {
  const manual = a.last_contact ? new Date(`${a.last_contact}T00:00:00Z`).toISOString() : null
  if (!a.chat_last_ts) return manual
  if (!manual) return a.chat_last_ts
  return a.chat_last_ts > manual ? a.chat_last_ts : manual
}

// Порядок карточек в колонке: наверх — те, с кем дольше всего не
// общались. Никогда не контактировавшие уходят вниз: их полторы сотни,
// и наверху они закрыли бы собой тех, с кем разговор реально подвис.
export function staleFirst(a: AgentCard, b: AgentCard): number {
  const x = lastContactAt(a), y = lastContactAt(b)
  if (x && y) return x.localeCompare(y)
  if (x) return -1
  if (y) return 1
  return a.name.localeCompare(b.name, 'ru')
}

export type AgentNote = {
  id: string
  body: string
  kind: 'note' | 'system'
  author: string | null
  created_at: string
}

// Строка дашборда: сколько сообщений было с агентом за период.
export type TouchRow = {
  agent_id: string
  name: string
  agency: string | null
  status: AgentStatus
  // incoming — написал агент, outgoing — написали мы.
  incoming: number
  outgoing: number
  total: number
  last_ts: string
}

export type TouchStats = {
  days: number
  since: string
  rows: TouchRow[]
  totals: { touches: number; agents: number; incoming: number; outgoing: number }
  // Переписки без карточки агента: в воронке их нет, но время они забрали.
  unlinked: { chats: number; touches: number; names: string[] }
  truncated: boolean
}

// Периоды дашборда. День считается по Бали (UTC+8).
export const TOUCH_PERIODS: Array<{ days: number; label: string; note: string }> = [
  { days: 1,  label: 'Сегодня',  note: 'с начала дня по Бали' },
  { days: 7,  label: '7 дней',   note: 'включая сегодня' },
  { days: 30, label: '30 дней',  note: 'включая сегодня' },
]

// Чат бота, у которого ещё нет карточки.
export type UnlinkedChat = {
  chat_id: number
  contact: string | null
  name: string
  username: string | null
  last_ts: string
  last_text: string | null
  message_count: number
  meeting_count: number
}

// Анкета из Notion: поля, которых нет в колонках таблицы. Порядок задаёт
// порядок блоков в карточке, группы — заголовки внутри неё.
export const PROFILE_GROUPS: Array<{ title: string; fields: string[] }> = [
  {
    title: 'Как работать вместе',
    fields: [
      'Где вам удобнее всего общаться?',
      'Какой формат общения вам комфортен?',
      'В какие дни Вы работаете?',
      'В какое время вам удобно общаться?',
      'Когда вас лучше не беспокоить?',
      'Как получать от нас новости о проектах?',
      'Языки общения',
    ],
  },
  {
    title: 'Что продаёт',
    fields: [
      'Какие проекты вы предпочитаете продавать?',
      'Что из LOYO интересно продавать?',
      'Какие типы недвижимости у Вас покупают?',
      'С какими клиентами вы чаще работаете?',
      'Опыт в недвижимости',
      'Вы работаете из офиса или на фрилансе?',
      'Где вы обычно работаете? (район на Бали или удалённо)',
    ],
  },
  {
    title: 'Личное',
    fields: [
      'Дата рождения',
      'День рождения',
      'Месяц рождения',
      'Хобби, интересы',
      'Любимая еда или напитки',
      'Любимые напитки',
      'Любимый подарок',
      'Отношение к алкоголю',
    ],
  },
]

const KNOWN_PROFILE_FIELDS = new Set(PROFILE_GROUPS.flatMap(g => g.fields))

// Поля Notion, которые в карточке не показываем: служебные отметки
// экспорта и то, что уже стало отдельной колонкой.
export const HIDDEN_PROFILE_FIELDS = new Set([
  'Checkbox', 'Сделки', 'Last edited by', 'Обновление', 'Шахматка Ubud Dream', '😎 Агентства',
])

// Всё, что пришло из Notion помимо перечисленного выше, показываем в
// конце карточки — иначе новый вопрос в анкете молча пропал бы из вида.
export function extraProfileFields(data: Record<string, string>): string[] {
  return Object.keys(data)
    .filter(k => !KNOWN_PROFILE_FIELDS.has(k) && !HIDDEN_PROFILE_FIELDS.has(k))
    .sort((a, b) => a.localeCompare(b, 'ru'))
}

// «Имя (@nick)» → имя и ник по отдельности.
export function splitContact(contact: string | null): { name: string; username: string | null } {
  const username = contact?.match(/\(@([A-Za-z0-9_]+)\)\s*$/)?.[1] ?? null
  const name = contact?.replace(/\s*\(@[A-Za-z0-9_]+\)\s*$/, '').trim() || (username ? `@${username}` : '')
  return { name, username }
}

// Обломки разбора ссылок, которые внешне выглядят как нормальный ник и
// потому проходят проверку формата. Держим списком, чтобы «https» из
// «https://t.me/user» не уехал в базу как имя пользователя.
const NOT_A_NICK = new Set(['http', 'https', 'www', 'telegram', 'tme', 'joinchat', 'share', 'proxy'])

// Ник приводим к одному виду и в импорте, и в карточке: без «@», без
// ссылки, в нижнем регистре — иначе автопривязка чата не находит пару.
//
// Контакты в базе записаны как попало: «@nick», «nick», «t.me/nick»,
// «https://t.me/nick», иногда телефон или ссылка-приглашение в чат.
// Возвращаем ник, только если это действительно ник, иначе null —
// мусор в этом поле молча ломает поиск переписки.
export function normalizeTelegram(v: string | null | undefined): string | null {
  if (!v) return null
  // Невидимые метки направления текста приезжают из Notion вместе с контактами.
  let s = String(v).trim().replace(/[‎‏‪-‮]/g, '')
  if (!s) return null

  const link = s.match(/(?:t\.me|telegram\.me|telegram\.dog)\/([^/?#\s]+)/i)
  if (link) s = link[1]
  else if (/^https?:/i.test(s)) return null // ссылка куда-то ещё — не ник
  else s = s.replace(/^@+/, '')

  // t.me/+AbCd и t.me/joinchat/... — приглашения в чат, а не имя пользователя.
  if (/^\+/.test(s) || /^joinchat$/i.test(s)) return null

  s = s.replace(/[^A-Za-z0-9_]/g, '')
  // Ник Telegram начинается с буквы: «79032312423» в этом поле — телефон.
  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s)) return null
  if (NOT_A_NICK.has(s.toLowerCase())) return null
  return s.toLowerCase()
}
