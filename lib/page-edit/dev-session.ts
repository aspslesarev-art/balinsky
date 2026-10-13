import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Вход застройщика по личной ссылке — без паролей и регистрации.
//
// Команда в форме застройщика жмёт «Ссылка для застройщика» и отправляет её
// менеджеру. Ссылка = id застройщика + случайный ключ + подпись сервера.
// Ключ хранится в записи застройщика (`data._edit_key`); новая ссылка меняет
// ключ, и все старые ссылки и входы по ним перестают работать.

export const DEV_COOKIE = 'dev_edit'
export const DEV_KEY_FIELD = '_edit_key'
export const DEV_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!s) throw new Error('no session secret')
  return s
}

const sign = (devId: string, key: string) =>
  createHmac('sha256', secret()).update(`dev-edit:${devId}:${key}`).digest('base64url')

export function newDevKey(): string {
  return randomBytes(18).toString('base64url')
}

/** Токен для ссылки и куки: `<devId>.<key>.<подпись>`. */
export function devToken(devId: string, key: string): string {
  return `${devId}.${key}.${sign(devId, key)}`
}

/** Разбор токена с проверкой подписи. Ключ ещё надо сверить с записью застройщика. */
export function parseDevToken(token: string | undefined | null): { devId: string; key: string } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [devId, key, sig] = parts
  if (!/^[A-Za-z0-9_]{3,40}$/.test(devId) || !/^[A-Za-z0-9_-]{10,60}$/.test(key)) return null
  const want = Buffer.from(sign(devId, key))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  return { devId, key }
}
