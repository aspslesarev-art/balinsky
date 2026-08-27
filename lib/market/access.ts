import 'server-only'
import type { SiteUser } from '@/lib/site-auth'
import { sbAdmin } from './apply'

// Список тех, кому открыт закрытый отчёт о движении рынка (/rynok).
//
// Доступ выдаётся по Telegram — либо по числовому id, либо по нику.
// Ник нужен потому, что чаще всего человек ещё ни разу не входил на сайт
// и его id неизвестен: вписываем @ник, человек логинится через бота, и
// проверка сходится уже на первом входе.

export type MarketAccessRow = {
  id: number
  telegram_id: number | null
  username: string | null
  note: string | null
  created_at: string
  revoked_at: string | null
}

/** `@Ivan`, `ivan`, `12345` → к чему это привязывать. */
export function parseHandle(raw: string): { telegramId: number | null; username: string | null } | null {
  const s = (raw ?? '').trim().replace(/^@/, '')
  if (!s || s.length > 64) return null
  if (/^\d{4,15}$/.test(s)) return { telegramId: Number(s), username: null }
  if (!/^[a-zA-Z0-9_]{4,32}$/.test(s)) return null
  return { telegramId: null, username: s.toLowerCase() }
}

/** Есть ли у вошедшего доступ к отчёту. Никогда не бросает. */
export async function hasMarketAccess(user: SiteUser | null): Promise<boolean> {
  if (!user) return false
  try {
    const username = user.username ? user.username.toLowerCase() : null
    // Одним запросом: строка либо на id, либо на ник этого же аккаунта.
    const or = username
      ? `telegram_id.eq.${user.telegramId},username.eq.${username}`
      : `telegram_id.eq.${user.telegramId}`
    const { data } = await sbAdmin()
      .from('market_access')
      .select('id')
      .is('revoked_at', null)
      .or(or)
      .limit(1)
    return (data?.length ?? 0) > 0
  } catch (e) {
    console.error('[market-access] hasMarketAccess:', e instanceof Error ? e.message : e)
    return false
  }
}

/** Весь список для админки — живые строки сверху, отозванные ниже. */
export async function listMarketAccess(): Promise<MarketAccessRow[]> {
  const { data } = await sbAdmin()
    .from('market_access')
    .select('id, telegram_id, username, note, created_at, revoked_at')
    .order('revoked_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as MarketAccessRow[]
}

export type GrantResult = { ok: true } | { ok: false; error: string }

/** Выдать доступ. Повторная выдача тому же — не ошибка, а поднятие строки. */
export async function grantMarketAccess(raw: string, note: string | null): Promise<GrantResult> {
  const who = parseHandle(raw)
  if (!who) return { ok: false, error: 'Нужен @ник Telegram или числовой id' }

  const sb = sbAdmin()
  const cleanNote = note ? note.trim().slice(0, 200) || null : null

  // Если такой доступ уже был отозван — оживляем ту же строку, чтобы не
  // плодить дубли и не терять дату первой выдачи.
  const q = sb.from('market_access').select('id, revoked_at')
  const { data: existing } = who.telegramId
    ? await q.eq('telegram_id', who.telegramId).limit(1)
    : await q.eq('username', who.username!).limit(1)

  const row = (existing ?? [])[0] as { id: number; revoked_at: string | null } | undefined
  if (row) {
    if (!row.revoked_at) return { ok: true }
    const { error } = await sb
      .from('market_access')
      .update({ revoked_at: null, note: cleanNote })
      .eq('id', row.id)
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  const { error } = await sb.from('market_access').insert({
    telegram_id: who.telegramId,
    username: who.username,
    note: cleanNote,
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function revokeMarketAccess(id: number): Promise<GrantResult> {
  const { error } = await sbAdmin()
    .from('market_access')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
  return error ? { ok: false, error: error.message } : { ok: true }
}
