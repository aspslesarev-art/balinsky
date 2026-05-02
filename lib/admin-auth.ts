import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'admin_session'

export async function requireAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const c = await cookies()
  return c.get(ADMIN_COOKIE)?.value === expected
}
