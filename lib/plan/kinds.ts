// Шаги, которые трекер плана видит в переписке сам. Файл без серверных
// зависимостей: его читают и план (data.ts), и экран /plan, и крон.
//
// Откуда берётся шаг:
//   • ai      — модель прочла чат и нашла в сообщении сделанное дело;
//   • meeting — встреча из tg_meetings, время которой уже прошло;
//   • rule    — касание: первое сообщение после трёх дней тишины.

export type StepKind =
  // ИИ по тексту
  | 'qual_call'     // короткий квалификационный звонок с агентом
  | 'event_invite'  // личное приглашение на мероприятие / разбор
  | 'event_yes'     // собеседник подтвердил, что придёт
  | 'dev_pitch'     // предложение сотрудничества застройщику
  | 'dev_terms'     // условия, договор или даты подписания застройщику
  | 'dev_signed'    // застройщик подписал договор
  | 'materials'     // подборка, разбор объектов, киллер-пак
  | 'booking'       // клиент внёс бронь
  | 'deposit'       // внесён депозит (ППДО или договор)
  | 'commission'    // пришла комиссия
  // встречи
  | 'coffee'        // живая встреча
  | 'agent_zoom'    // зум или звонок с агентом
  | 'client_zoom'   // зум с клиентом или инвестором
  | 'dev_meet'      // встреча или созвон с застройщиком
  | 'webinar'       // вебинар или онлайн-разбор
  | 'event'         // живое мероприятие
  // правило
  | 'ping'          // касание после паузы

export const AI_KINDS: StepKind[] = [
  'qual_call', 'event_invite', 'event_yes', 'dev_pitch', 'dev_terms',
  'dev_signed', 'materials', 'booking', 'deposit', 'commission',
]

export const STEP_KINDS: Record<StepKind, { label: string; icon: string }> = {
  qual_call:    { label: 'Квалификационный звонок', icon: '📞' },
  event_invite: { label: 'Приглашение',             icon: '✉️' },
  event_yes:    { label: 'Подтвердил участие',      icon: '🙋' },
  dev_pitch:    { label: 'Питч застройщику',        icon: '📨' },
  dev_terms:    { label: 'Условия застройщику',     icon: '📄' },
  dev_signed:   { label: 'Застройщик подписал',     icon: '📝' },
  materials:    { label: 'Подборка или разбор',     icon: '🧠' },
  booking:      { label: 'Бронь клиента',           icon: '🔖' },
  deposit:      { label: 'Депозит',                 icon: '🏦' },
  commission:   { label: 'Комиссия',                icon: '💵' },
  coffee:       { label: 'Встреча вживую',          icon: '☕' },
  agent_zoom:   { label: 'Зум с агентом',           icon: '🎥' },
  client_zoom:  { label: 'Зум с клиентом',          icon: '🎥' },
  dev_meet:     { label: 'Встреча с застройщиком',  icon: '🏗' },
  webinar:      { label: 'Вебинар',                 icon: '🎤' },
  event:        { label: 'Мероприятие',             icon: '🔥' },
  ping:         { label: 'Касание агента',          icon: '💬' },
}

export function isStepKind(v: unknown): v is StepKind {
  return typeof v === 'string' && v in STEP_KINDS
}

/** С кем чат. От этого зависит, чем считать встречу и касание. */
export type ChatRole = 'agent' | 'developer' | 'client' | 'other'

export function isChatRole(v: unknown): v is ChatRole {
  return v === 'agent' || v === 'developer' || v === 'client' || v === 'other'
}

/**
 * Как задача плана закрывается перепиской.
 * per: 'day'   — за день задачи набралось n шагов (например, 10 касаний);
 * per: 'total' — с начала квеста набралось n шагов (кофе №7 = седьмая встреча).
 */
export type Auto = { k: StepKind; n: number; per: 'day' | 'total' }

/** Шаг, как его видит экран плана. */
export type PlanStep = {
  id: number
  kind: StepKind
  ts: string
  day: string
  contact: string | null
  note: string | null
  chat_id: number | null
  rejected: boolean
}
