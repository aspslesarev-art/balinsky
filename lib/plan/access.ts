import 'server-only'
import { currentAdminUsername } from '@/lib/admin-auth'

// /plan — личная страница, а не вторая админка. Поэтому мало быть
// админом: логин должен совпасть с владельцем плана. Если когда-нибудь
// появится второй админский аккаунт, план он не увидит.
//
// Вход — обычный админский: /admin, логин и пароль, кука на 30 дней.
// Отдельного секрета у страницы нет специально: ключ в ссылке утекает
// через историю, пересланные сообщения и превью мессенджеров.

const OWNER = (process.env.PLAN_OWNER ?? 'andrei').trim().toLowerCase()

export type PlanAccess =
  | { kind: 'owner' }
  /** Вошёл админ, но не владелец плана — показываем отказ, а не редирект в никуда. */
  | { kind: 'other'; username: string; owner: string }
  | { kind: 'anon' }

export async function planAccess(): Promise<PlanAccess> {
  const username = await currentAdminUsername()
  if (username === null) return { kind: 'anon' }
  if (username === OWNER) return { kind: 'owner' }
  return { kind: 'other', username, owner: OWNER }
}

export async function hasPlanAccess(): Promise<boolean> {
  return (await planAccess()).kind === 'owner'
}
