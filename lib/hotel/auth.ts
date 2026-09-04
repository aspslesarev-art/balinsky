// Вход в панель стойки (/hotel-desk).
//
// Персоналу отеля незачем аккаунт в админке Balinsky, поэтому доступ у них
// свой: slug отеля + код из hotel_properties.staff_code. Сессия — HMAC от
// пары «отель + код», так что смена кода в админке разлогинивает всех, кому
// код успели переслать.

import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { requireAdmin } from '@/lib/admin-auth'
import { hotelBySlug, hotelStaffCode, type Hotel } from './db'

export const DESK_COOKIE = 'hotel_desk'

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'balinsky-hotel-desk-fallback'
}

function deskToken(hotelId: number, staffCode: string): string {
  return createHmac('sha256', sessionSecret()).update(`hotel:${hotelId}:${staffCode}`).digest('hex')
}

/** Значение куки: id отеля виден, подпись — нет. */
export function deskCookieValue(hotelId: number, staffCode: string): string {
  return `${hotelId}.${deskToken(hotelId, staffCode)}`
}

function sameToken(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function checkStaffCode(input: string, actual: string | null): boolean {
  if (!actual) return false
  return sameToken(input.trim(), actual.trim())
}

/**
 * Отель, к панели которого у текущего запроса есть доступ, или null.
 * Админ сайта проходит в любой отель — ему чинить и показывать.
 */
export async function requireDesk(slug: string): Promise<Hotel | null> {
  const hotel = await hotelBySlug(slug)
  if (!hotel || !hotel.active) return null
  if (await requireAdmin()) return hotel

  const raw = (await cookies()).get(DESK_COOKIE)?.value
  if (!raw) return null
  const [rawId, signature] = raw.split('.')
  if (Number(rawId) !== hotel.id || !signature) return null

  const code = await hotelStaffCode(hotel.id)
  if (!code) return null
  return sameToken(signature, deskToken(hotel.id, code)) ? hotel : null
}
