import { cookies } from 'next/headers'
import { createHmac } from 'node:crypto'

export const ADMIN_COOKIE = 'admin_session'

// The session cookie holds an opaque HMAC token (NOT the password):
//   token = HMAC-SHA256(secret, username)
// so a leaked cookie can't reveal the password, and rotating the secret
// (or password fallback) invalidates all sessions. Secret comes from
// ADMIN_SESSION_SECRET, falling back to ADMIN_PASSWORD (server-only,
// never sent to the client) so it works without adding new env.
function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'balinsky-admin-fallback'
}
export function sessionToken(username: string): string {
  return createHmac('sha256', sessionSecret()).update(username.trim().toLowerCase()).digest('hex')
}
function validSessionTokens(): Set<string> {
  const out = new Set<string>()
  for (const acc of listAdminAccounts()) out.add(sessionToken(acc.username))
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
  const valid = validSessionTokens()
  if (valid.size === 0) return false
  const c = await cookies()
  const v = c.get(ADMIN_COOKIE)?.value
  return v != null && valid.has(v)
}
