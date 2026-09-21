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

export async function hasPlanAccess(): Promise<boolean> {
  const username = await currentAdminUsername()
  return username !== null && username === OWNER
}
