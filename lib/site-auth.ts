import 'server-only'
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Visitor accounts, authenticated through the Telegram bot.
//
// Why a bot and not a password: everyone in this market already lives in
// Telegram, and the bot is where the follow-up conversation happens anyway.
// The whole login is two taps — open the bot, tap the link it sends back.
//
// The session cookie is httpOnly, so page JS cannot read it. A second,
// deliberately readable `bx_auth=1` flag rides alongside it purely so the
// blur on gated blocks can be lifted before first paint (see the inline
// script in app/layout.tsx). The flag carries no authority: forging it only
// un-blurs markup the browser already received, which is exactly the
// cosmetic gate we want. Anything that must actually stay private has to be
// checked server-side against the signed cookie, never against this flag.

const SESSION_COOKIE = 'bx_session'
/** JS-readable companion flag — un-blurs gated blocks, grants nothing. */
export const AUTH_FLAG_COOKIE = 'bx_auth'

const SESSION_TTL_DAYS = 180
const TOKEN_TTL_MS = 15 * 60 * 1000

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

/**
 * Signing key. `SITE_SESSION_SECRET` when set, otherwise the bot token — it is
 * server-only, already required for the bot to work, and rotating it
 * invalidates sessions, which is the behaviour you want from a secret anyway.
 */
function secret(): string {
  const s = process.env.SITE_SESSION_SECRET ?? process.env.TELEGRAM_BOT_TOKEN
  if (!s) throw new Error('site-auth: no SITE_SESSION_SECRET / TELEGRAM_BOT_TOKEN')
  return s
}

export type SiteUser = {
  telegramId: number
  username: string | null
  firstName: string | null
  lastName: string | null
  isAgent: boolean
}

type UserRow = {
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  is_agent: boolean
}

function toUser(r: UserRow): SiteUser {
  return {
    telegramId: Number(r.telegram_id),
    username: r.username,
    firstName: r.first_name,
    lastName: r.last_name,
    isAgent: r.is_agent === true,
  }
}

// ---------------------------------------------------------------- signing

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** `<telegramId>.<issuedAtMs>.<hmac>` */
function encodeSession(telegramId: number): string {
  const payload = `${telegramId}.${Date.now()}`
  return `${payload}.${sign(payload)}`
}

function decodeSession(raw: string | undefined): number | null {
  if (!raw) return null
  const i = raw.lastIndexOf('.')
  if (i <= 0) return null
  const payload = raw.slice(0, i)
  const given = raw.slice(i + 1)
  const expected = sign(payload)
  // Constant-time compare; equal length is a precondition of timingSafeEqual.
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const [idPart, issuedPart] = payload.split('.')
  const telegramId = Number(idPart)
  const issuedAt = Number(issuedPart)
  if (!Number.isFinite(telegramId) || !Number.isFinite(issuedAt)) return null
  if (Date.now() - issuedAt > SESSION_TTL_DAYS * 24 * 60 * 60 * 1000) return null
  return telegramId
}

// ---------------------------------------------------------------- session

/** The signed-in user for this request, or null. Never throws. */
export async function getSiteUser(): Promise<SiteUser | null> {
  try {
    const jar = await cookies()
    const telegramId = decodeSession(jar.get(SESSION_COOKIE)?.value)
    if (telegramId == null) return null
    const { data } = await sb
      .from('site_users')
      .select('telegram_id, username, first_name, last_name, is_agent')
      .eq('telegram_id', telegramId)
      .maybeSingle()
    return data ? toUser(data as UserRow) : null
  } catch {
    return null
  }
}

type CookieSpec = {
  name: string
  value: string
  path: string
  maxAge: number
  sameSite: 'lax'
  secure: boolean
  httpOnly: boolean
}

/**
 * Just the id behind the signed cookie — no database round-trip.
 *
 * For hot paths that only need to attribute an action to someone, like the
 * view tracker that fires on every page mount. `getSiteUser` costs a SELECT
 * per call, which is the wrong price to pay per pageview.
 */
export async function getSessionTelegramId(): Promise<number | null> {
  try {
    const jar = await cookies()
    return decodeSession(jar.get(SESSION_COOKIE)?.value)
  } catch {
    return null
  }
}

/** Cookies to set on a successful login. Written by the route handler. */
export function sessionCookies(telegramId: number): CookieSpec[] {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60
  const common = { path: '/', maxAge, sameSite: 'lax' as const, secure: true }
  return [
    { name: SESSION_COOKIE, value: encodeSession(telegramId), ...common, httpOnly: true },
    { name: AUTH_FLAG_COOKIE, value: '1', ...common, httpOnly: false },
  ]
}

export function clearedCookies(): CookieSpec[] {
  const common = { path: '/', maxAge: 0, sameSite: 'lax' as const, secure: true }
  return [
    { name: SESSION_COOKIE, value: '', ...common, httpOnly: true },
    { name: AUTH_FLAG_COOKIE, value: '', ...common, httpOnly: false },
  ]
}

// ----------------------------------------------------------- login tokens

export type TelegramIdentity = {
  id: number
  username?: string | null
  firstName?: string | null
  lastName?: string | null
}

/**
 * Upsert the account and mint a one-time login link for it. Called from the
 * bot, which already knows who it is talking to — so the identity here is
 * trusted and no extra proof is needed.
 */
export async function issueLoginToken(who: TelegramIdentity): Promise<string | null> {
  try {
    const { error: upErr } = await sb.from('site_users').upsert(
      {
        telegram_id: who.id,
        username: who.username ?? null,
        first_name: who.firstName ?? null,
        last_name: who.lastName ?? null,
      },
      { onConflict: 'telegram_id', ignoreDuplicates: false },
    )
    if (upErr) throw new Error(upErr.message)

    const token = randomBytes(24).toString('base64url')
    const { error } = await sb.from('login_tokens').insert({
      token,
      telegram_id: who.id,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    })
    if (error) throw new Error(error.message)
    return token
  } catch (e) {
    console.error('[site-auth] issueLoginToken:', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Redeem a login token. Single-use and time-boxed: the update only matches
 * while `used_at` is still null, so a replayed link returns nothing.
 */
export async function consumeLoginToken(token: string): Promise<number | null> {
  try {
    if (!token || token.length > 128) return null
    const { data, error } = await sb
      .from('login_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('telegram_id')
      .maybeSingle()
    if (error || !data) return null

    const telegramId = Number((data as { telegram_id: number }).telegram_id)
    await sb
      .from('site_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('telegram_id', telegramId)
    return telegramId
  } catch (e) {
    console.error('[site-auth] consumeLoginToken:', e instanceof Error ? e.message : e)
    return null
  }
}

// ------------------------------------------------------------ login codes

/**
 * Вход по 4-значному коду.
 *
 * Код привязан к браузеру, который его запросил: сайт заводит `challenge`,
 * кладёт его в httpOnly-куку и передаёт боту в deep-link, бот вписывает код
 * в ту же строку. Проверка идёт по паре challenge+code — без этого четыре
 * цифры подбирались бы к чужому аккаунту за считанные попытки.
 */
export const LOGIN_CHALLENGE_COOKIE = 'bx_login'

const CODE_TTL_MS = 15 * 60 * 1000
/** После стольких промахов строка сгорает и нужен новый код. */
const MAX_CODE_ATTEMPTS = 5

/** Кука с challenge: живёт столько же, сколько сам код. */
export function challengeCookie(challenge: string): CookieSpec {
  return {
    name: LOGIN_CHALLENGE_COOKIE,
    value: challenge,
    path: '/',
    maxAge: Math.floor(CODE_TTL_MS / 1000),
    sameSite: 'lax',
    secure: true,
    httpOnly: true,
  }
}

/** Заводит строку под будущий код и возвращает секрет браузера. */
export async function startLoginChallenge(): Promise<string | null> {
  try {
    // 24 символа base64url — влезает в payload deep-link'а (лимит Telegram 64).
    const challenge = randomBytes(18).toString('base64url')
    const { error } = await sb.from('login_codes').insert({
      challenge,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    if (error) throw new Error(error.message)
    return challenge
  } catch (e) {
    console.error('[site-auth] startLoginChallenge:', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Бот выдаёт код на challenge. Личность здесь доверенная — она пришла из
 * вебхука Telegram, поэтому дополнительных доказательств не требуется.
 */
export async function issueLoginCode(
  challenge: string,
  who: TelegramIdentity,
): Promise<string | null> {
  try {
    if (!challenge || challenge.length > 64) return null

    const { error: upErr } = await sb.from('site_users').upsert(
      {
        telegram_id: who.id,
        username: who.username ?? null,
        first_name: who.firstName ?? null,
        last_name: who.lastName ?? null,
      },
      { onConflict: 'telegram_id', ignoreDuplicates: false },
    )
    if (upErr) throw new Error(upErr.message)

    // randomInt — равномерно и без смещения по модулю, в отличие от %.
    const code = String(randomInt(0, 10000)).padStart(4, '0')

    // Только на живую строку: истёкший или уже погашенный challenge
    // нового кода не получает.
    const { data, error } = await sb
      .from('login_codes')
      .update({ code, telegram_id: who.id, attempts: 0 })
      .eq('challenge', challenge)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('challenge')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? code : null
  } catch (e) {
    console.error('[site-auth] issueLoginCode:', e instanceof Error ? e.message : e)
    return null
  }
}

export type CodeResult =
  | { ok: true; telegramId: number }
  | { ok: false; reason: 'invalid' | 'expired' | 'blocked' | 'pending' }

/**
 * Проверяет введённый код. Успех — атомарный UPDATE: он же гасит строку,
 * поэтому один код нельзя разменять дважды даже при гонке вкладок.
 */
export async function redeemLoginCode(challenge: string, code: string): Promise<CodeResult> {
  try {
    if (!/^\d{4}$/.test(code)) return { ok: false, reason: 'invalid' }
    if (!challenge || challenge.length > 64) return { ok: false, reason: 'expired' }

    const now = new Date().toISOString()
    const { data: hit } = await sb
      .from('login_codes')
      .update({ used_at: now })
      .eq('challenge', challenge)
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', now)
      .lt('attempts', MAX_CODE_ATTEMPTS)
      .select('telegram_id')
      .maybeSingle()

    if (hit) {
      const telegramId = Number((hit as { telegram_id: number }).telegram_id)
      await sb.from('site_users').update({ last_login_at: now }).eq('telegram_id', telegramId)
      return { ok: true, telegramId }
    }

    // Промах: разбираемся, что именно не так, и считаем попытку.
    const { data: row } = await sb
      .from('login_codes')
      .select('code, attempts, used_at, expires_at')
      .eq('challenge', challenge)
      .maybeSingle()
    if (!row) return { ok: false, reason: 'expired' }

    const r = row as { code: string | null; attempts: number; used_at: string | null; expires_at: string }
    if (r.used_at || new Date(r.expires_at).getTime() <= Date.now()) return { ok: false, reason: 'expired' }
    if (r.code == null) return { ok: false, reason: 'pending' }
    if (r.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: 'blocked' }

    const attempts = r.attempts + 1
    await sb.from('login_codes').update({ attempts }).eq('challenge', challenge)
    return { ok: false, reason: attempts >= MAX_CODE_ATTEMPTS ? 'blocked' : 'invalid' }
  } catch (e) {
    console.error('[site-auth] redeemLoginCode:', e instanceof Error ? e.message : e)
    return { ok: false, reason: 'invalid' }
  }
}

/** Profile fields the account page may change. */
export async function updateSiteUser(
  telegramId: number,
  patch: { firstName?: string | null; lastName?: string | null; isAgent?: boolean },
): Promise<boolean> {
  const clean = (v: string | null | undefined) =>
    typeof v === 'string' ? v.trim().slice(0, 80) || null : null
  try {
    const { error } = await sb
      .from('site_users')
      .update({
        ...(patch.firstName !== undefined ? { first_name: clean(patch.firstName) } : {}),
        ...(patch.lastName !== undefined ? { last_name: clean(patch.lastName) } : {}),
        ...(patch.isAgent !== undefined ? { is_agent: patch.isAgent === true } : {}),
      })
      .eq('telegram_id', telegramId)
    return !error
  } catch {
    return false
  }
}
