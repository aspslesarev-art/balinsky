import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'admin_session'

// All accepted (username, password) pairs:
//   - the legacy `ADMIN_USERNAME` / `ADMIN_PASSWORD` pair stays as the
//     primary account
//   - additional accounts come from `ADMIN_ACCOUNTS`, a comma-separated
//     list of `username:password` (whitespace ignored, password may
//     contain `:` after the first one)
// The cookie holds the matched password verbatim — checking auth is
// just "is this value in the set of valid passwords".
function validPasswords(): Set<string> {
  const out = new Set<string>()
  const primary = process.env.ADMIN_PASSWORD
  if (primary) out.add(primary)
  const extra = process.env.ADMIN_ACCOUNTS ?? ''
  for (const entry of extra.split(',')) {
    const i = entry.indexOf(':')
    if (i <= 0) continue
    const pw = entry.slice(i + 1).trim()
    if (pw) out.add(pw)
  }
  return out
}

export type AdminAccount = { username: string; password: string }

export function listAdminAccounts(): AdminAccount[] {
  const out: AdminAccount[] = []
  const u = (process.env.ADMIN_USERNAME ?? 'andrei').trim().toLowerCase()
  const p = process.env.ADMIN_PASSWORD
  if (p) out.push({ username: u, password: p })
  for (const entry of (process.env.ADMIN_ACCOUNTS ?? '').split(',')) {
    const i = entry.indexOf(':')
    if (i <= 0) continue
    const username = entry.slice(0, i).trim().toLowerCase()
    const password = entry.slice(i + 1).trim()
    if (username && password) out.push({ username, password })
  }
  return out
}

export function findAdmin(username: string, password: string): AdminAccount | null {
  const u = username.trim().toLowerCase()
  for (const acc of listAdminAccounts()) {
    if (acc.username === u && acc.password === password) return acc
  }
  return null
}

export async function requireAdmin(): Promise<boolean> {
  const valid = validPasswords()
  if (valid.size === 0) return false
  const c = await cookies()
  const v = c.get(ADMIN_COOKIE)?.value
  return v != null && valid.has(v)
}
