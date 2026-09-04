import { randomInt } from 'node:crypto'

// Алфавит без похожих друг на друга символов (0/O, 1/l/I): токен из QR
// иногда приходится диктовать по телефону или вводить руками, когда
// наклейка на двери затёрлась.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

/**
 * Токен номера — то, что зашито в QR (/stay/<token>).
 *
 * 10 символов из 31-буквенного алфавита ≈ 49 бит: подобрать перебором
 * чужой номер нельзя, а сама ссылка остаётся короткой, и QR получается
 * крупноячеистым — такой читается с наклейки даже под углом.
 */
export function newRoomToken(length = 10): string {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

/** Код входа для стойки: диктуется вслух при передаче смены. */
export function newStaffCode(length = 6): string {
  return newRoomToken(length)
}
