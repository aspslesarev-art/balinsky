// Общие типы CRM по застройщикам. Отдельно от store.ts по той же причине,
// что у агентов: их импортирует клиентская доска, а store тянет
// service-key клиент Supabase, которому в браузере делать нечего.
//
// Главное отличие от агентов: карточка здесь — компания, а переписка
// висит на людях внутри неё. Поэтому «последний контакт» и «есть чат»
// считаются по людям, а не по самой карточке.

export type DevStatus = 'new' | 'contact' | 'to_schedule' | 'scheduled' | 'met' | 'working' | 'lost'

// Порядок здесь = порядок колонок на доске. Шаги те же, что у агентов,
// подписи — под застройщика.
export const STATUSES: Array<{ id: DevStatus; label: string; hint: string }> = [
  { id: 'new',         label: 'Без статуса',       hint: 'Взят в работу, но что делать — ещё не решили' },
  { id: 'contact',     label: 'Связаться',         hint: 'Нужно выйти на основателя или отдел продаж' },
  { id: 'to_schedule', label: 'Назначить встречу', hint: 'Ответили — осталось поставить дату' },
  { id: 'scheduled',   label: 'Назначена встреча', hint: 'Дата есть, встреча впереди' },
  { id: 'met',         label: 'Проведена встреча', hint: 'Встретились, ждём результата' },
  { id: 'working',     label: 'Работаем',          hint: 'Объекты на сайте, комиссия согласована' },
  { id: 'lost',        label: 'Не сложилось',      hint: 'Отказались или не отвечают' },
]

export const STATUS_LABEL: Record<DevStatus, string> =
  Object.fromEntries(STATUSES.map(s => [s.id, s.label])) as Record<DevStatus, string>

export function isStatus(v: unknown): v is DevStatus {
  return typeof v === 'string' && STATUSES.some(s => s.id === v)
}

// «Отклик» из отборной таблицы владельца: стоит ли вообще заходить.
// Не этап воронки — компания может быть «возможно» и уже на встрече.
export type Prospect = 'yes' | 'maybe' | 'unknown' | 'no'

export const PROSPECTS: Array<{ id: Prospect; label: string; hint: string }> = [
  { id: 'yes',     label: 'Да',       hint: 'Готовы разговаривать' },
  { id: 'maybe',   label: 'Возможно', hint: 'Шанс есть' },
  { id: 'unknown', label: 'Не знаю',  hint: 'Непонятно, нужно выяснить' },
  { id: 'no',      label: 'Нет',      hint: 'Смысла нет' },
]

export const PROSPECT_LABEL: Record<Prospect, string> =
  Object.fromEntries(PROSPECTS.map(p => [p.id, p.label])) as Record<Prospect, string>

export function isProspect(v: unknown): v is Prospect {
  return typeof v === 'string' && PROSPECTS.some(p => p.id === v)
}

// Кто это в компании. 'via' — не сотрудник, а единственный путь внутрь
// («Басель Хуари, связь через Ирину»): в основатели такого записать
// нельзя, а потерять — тем более.
export type PersonRole = 'founder' | 'staff' | 'via'

export const ROLES: Array<{ id: PersonRole; label: string }> = [
  { id: 'founder', label: 'Основатель' },
  { id: 'staff',   label: 'Сотрудник' },
  { id: 'via',     label: 'Через него выход' },
]

export const ROLE_LABEL: Record<PersonRole, string> =
  Object.fromEntries(ROLES.map(r => [r.id, r.label])) as Record<PersonRole, string>

export function isRole(v: unknown): v is PersonRole {
  return typeof v === 'string' && ROLES.some(r => r.id === v)
}

export type DevPerson = {
  id: string
  partner_id: string
  name: string
  role: PersonRole
  position: string | null
  telegram: string | null
  tg_channel: string | null
  instagram: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  access_note: string | null
  tg_chat_id: number | null
  ai_summary: string | null
  ai_next_step: string | null
  ai_updated_at: string | null
  ai_last_message_id: number | null
  notes: string | null
  sort: number
  archived: boolean
  created_at: string
  updated_at: string
}

// Человек плюс то, что подтянулось из переписки бота.
export type DevPersonCard = DevPerson & {
  chat_last_ts: string | null
  chat_last_text: string | null
  chat_message_count: number
  chat_meeting_count: number
  next_meeting_at: string | null
  next_meeting_place: string | null
}

export type DevPartner = {
  id: string
  name: string
  site_developer_key: string | null
  site_slug: string | null
  status: DevStatus
  prospect: Prospect | null
  in_work: boolean
  manager: string | null
  location: string | null
  website: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  telegram: string | null
  instagram: string | null
  projects: string | null
  commission: string | null
  last_contact: string | null
  next_contact: string | null
  next_step: string | null
  notes: string | null
  data: Record<string, string>
  sort: number
  archived: boolean
  source: string
  created_at: string
  updated_at: string
}

// Строка доски: компания, её люди и сводка по их перепискам.
export type DevPartnerCard = DevPartner & {
  people: DevPersonCard[]
  // Сколько людей известно и у скольких есть живой чат — по этой паре на
  // доске сразу видно «контактов нет вообще» и «есть кому писать».
  people_count: number
  linked_count: number
  chat_message_count: number
  // Ближайшая встреча — самая ранняя по всем людям компании.
  next_meeting_at: string | null
  next_meeting_place: string | null
  // Позднее из переписок всех людей.
  chat_last_ts: string | null
}

export type DevNote = {
  id: string
  body: string
  kind: 'note' | 'system'
  author: string | null
  created_at: string
}

// Пара «возможно одна и та же компания» для вкладки «Похожие».
export type MergePair = {
  id: string
  reason: string
  state: 'pending' | 'merged' | 'distinct'
  left: DevPartnerCard
  right: DevPartnerCard
}

// Когда с компанией общались в последний раз. Два источника: живые
// переписки её людей и дата, проставленная руками. Берём позднюю —
// иначе привязанный вчера чат не перебьёт прошлогоднюю отметку.
export function lastContactAt(p: DevPartnerCard): string | null {
  const manual = p.last_contact ? new Date(`${p.last_contact}T00:00:00Z`).toISOString() : null
  if (!p.chat_last_ts) return manual
  if (!manual) return p.chat_last_ts
  return p.chat_last_ts > manual ? p.chat_last_ts : manual
}

// Порядок карточек в колонке: наверх — те, с кем дольше всего не
// общались; никогда не контактировавшие уходят вниз. Ровно как у
// агентов, и по той же причине: нетронутый контакт — это не остывший
// разговор, и наверху он закрыл бы собой подвисшие.
export function staleFirst(a: DevPartnerCard, b: DevPartnerCard): number {
  const x = lastContactAt(a), y = lastContactAt(b)
  if (x && y) return x.localeCompare(y)
  if (x) return -1
  if (y) return 1
  return a.name.localeCompare(b.name, 'ru')
}

// Обломки разбора ссылок, которые внешне выглядят как нормальный ник.
const NOT_A_NICK = new Set(['http', 'https', 'www', 'telegram', 'tme', 'joinchat', 'share', 'proxy'])

// Ник Telegram к одному виду: без «@», без ссылки, в нижнем регистре.
// Копия правила из lib/agents/types.ts намеренно не делается — здесь
// тот же разбор нужен и импорту, и карточке, а тянуть CRM агентов в
// CRM застройщиков ради одной функции значит связать два раздела.
// Правило одно: ник начинается с буквы, 5–32 символа.
export function normalizeTelegram(v: string | null | undefined): string | null {
  if (!v) return null
  let s = String(v).trim().replace(/[‎‏‪-‮]/g, '')
  if (!s) return null

  const link = s.match(/(?:t\.me|telegram\.me|telegram\.dog)\/([^/?#\s]+)/i)
  if (link) s = link[1]
  else if (/^https?:/i.test(s)) return null
  else s = s.replace(/^@+/, '')

  if (/^\+/.test(s) || /^joinchat$/i.test(s)) return null

  s = s.replace(/[^A-Za-z0-9_]/g, '')
  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s)) return null
  if (NOT_A_NICK.has(s.toLowerCase())) return null
  return s.toLowerCase()
}

// «Имя (@nick)» → имя и ник по отдельности. Так бот-наблюдатель пишет
// собеседника в tg_messages.contact.
export function splitContact(contact: string | null): { name: string; username: string | null } {
  const username = contact?.match(/\(@([A-Za-z0-9_]+)\)\s*$/)?.[1] ?? null
  const name = contact?.replace(/\s*\(@[A-Za-z0-9_]+\)\s*$/, '').trim() || (username ? `@${username}` : '')
  return { name, username }
}

// Название компании к сравнимому виду: убираем правовые формы и слова,
// которые есть у половины базы («PT», «Group», «Development», «Bali»).
// Используется и импортом, и вкладкой «Похожие».
const NAME_STOP = new Set([
  'pt', 'group', 'groups', 'development', 'developments', 'developer', 'developers',
  'bali', 'llc', 'ltd', 'inc', 'co', 'villas', 'villa', 'estate', 'estates',
  'properties', 'property', 'investment', 'investments', 'invest', 'construction',
])

export function nameTokens(s: string | null | undefined): string[] {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/g, ' ')
    .split(' ')
    .filter(w => w.length > 1 && !NAME_STOP.has(w))
}

export function nameKey(s: string | null | undefined): string {
  return nameTokens(s).join('')
}
