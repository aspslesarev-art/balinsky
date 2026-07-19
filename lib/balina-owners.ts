// Owner (admin) chat-id allowlist — the single gate shared by the Telegram
// consultant's trainer flow and the admin data-edit feature. Kept in its own
// tiny module so both lib/balina-telegram.ts and lib/balina-admin-edit.ts can
// import it without a circular dependency.
//
// Hardcoded default keeps it working out of the box; comma-separated env var
// BALINA_OWNER_CHAT_IDS extends the set without a code change.

const DEFAULT_OWNER_IDS = new Set<number>([555450800])

const OWNER_CHAT_IDS: Set<number> = (() => {
  const env = (process.env.BALINA_OWNER_CHAT_IDS ?? '').trim()
  if (!env) return DEFAULT_OWNER_IDS
  const set = new Set<number>(DEFAULT_OWNER_IDS)
  for (const tok of env.split(',')) {
    const n = Number(tok.trim())
    if (Number.isFinite(n)) set.add(n)
  }
  return set
})()

export function isOwnerChat(chatId: number): boolean {
  return OWNER_CHAT_IDS.has(chatId)
}
