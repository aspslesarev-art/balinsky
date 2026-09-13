// Google Calendar владельца через OAuth (refresh token в google_oauth_tokens).
//
// Почему OAuth, а не сервисный аккаунт: сервисный аккаунт без Workspace
// не может приглашать гостей и создавать ссылки Google Meet в личном
// календаре gmail — а это ровно то, что нужно записи.
//
// Запросы — голым fetch к REST API, без пакета googleapis (он весит
// десятки мегабайт ради четырёх вызовов).

import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const PROVIDER = 'google'
const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary'
export const OAUTH_STATE_COOKIE = 'g_oauth_state'
export const GOOGLE_SCOPES =['openid', 'email', 'https://www.googleapis.com/auth/calendar.events']

export class GoogleNotConnectedError extends Error {
  constructor(reason: string) {
    super(`google_not_connected: ${reason}`)
  }
}

function clientCreds(): { id: string; secret: string } {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!id || !secret) throw new GoogleNotConnectedError('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET не заданы')
  return { id, secret }
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientCreds().id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    // offline + consent — иначе Google не отдаст refresh_token при повторном входе.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

type TokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  id_token?: string
  error?: string
  error_description?: string
}

/** Email из id_token. Подпись не проверяем: токен пришёл напрямую от Google по TLS. */
function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'))
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

export async function exchangeCodeAndStore(code: string, redirectUri: string): Promise<string | null> {
  const { id, secret } = clientCreds()
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  const t = (await r.json()) as TokenResponse
  if (!r.ok || !t.access_token) throw new Error(`google token exchange failed: ${t.error ?? r.status} ${t.error_description ?? ''}`)
  if (!t.refresh_token) throw new Error('google не вернул refresh_token — отзовите доступ приложения в аккаунте Google и подключите заново')
  const email = emailFromIdToken(t.id_token)
  const { error } = await sb.from('google_oauth_tokens').upsert({
    provider: PROVIDER,
    account_email: email,
    refresh_token: t.refresh_token,
    access_token: t.access_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    scope: t.scope ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`google token save failed: ${error.message}`)
  return email
}

export async function googleConnection(): Promise<{ email: string | null; updatedAt: string } | null> {
  const { data, error } = await sb.from('google_oauth_tokens').select('account_email, updated_at').eq('provider', PROVIDER).maybeSingle()
  if (error) throw new Error(`google connection read failed: ${error.message}`)
  return data ? { email: data.account_email, updatedAt: data.updated_at } : null
}

const REFRESH_MARGIN_MS = 60_000

async function accessToken(): Promise<string> {
  const { data: row, error } = await sb
    .from('google_oauth_tokens')
    .select('refresh_token, access_token, expires_at')
    .eq('provider', PROVIDER)
    .maybeSingle()
  if (error) throw new Error(`google token read failed: ${error.message}`)
  if (!row) throw new GoogleNotConnectedError('календарь не подключён')
  if (row.access_token && row.expires_at && new Date(row.expires_at).getTime() - Date.now() > REFRESH_MARGIN_MS) {
    return row.access_token
  }
  const { id, secret } = clientCreds()
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: row.refresh_token, client_id: id, client_secret: secret, grant_type: 'refresh_token' }),
  })
  const t = (await r.json()) as TokenResponse
  if (t.error === 'invalid_grant') throw new GoogleNotConnectedError('доступ отозван или истёк — подключите календарь заново')
  if (!r.ok || !t.access_token) throw new Error(`google token refresh failed: ${t.error ?? r.status}`)
  await sb.from('google_oauth_tokens').update({
    access_token: t.access_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('provider', PROVIDER)
  return t.access_token
}

async function gcal<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken()
  const r = await fetch(`${CAL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  })
  if (r.status === 204) return undefined as T
  const body = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(`google calendar ${init.method ?? 'GET'} ${path.split('?')[0]} → ${r.status}: ${JSON.stringify(body).slice(0, 300)}`)
    Object.assign(err, { status: r.status })
    throw err
  }
  return body as T
}

export type GEvent = {
  id: string
  status?: string
  summary?: string
  transparency?: 'opaque' | 'transparent'
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: Array<{ self?: boolean; responseStatus?: string }>
  extendedProperties?: { private?: Record<string, string> }
  hangoutLink?: string
}

export async function listEvents(timeMinIso: string, timeMaxIso: string): Promise<GEvent[]> {
  const out: GEvent[] = []
  let pageToken: string | undefined
  do {
    const p = new URLSearchParams({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
      ...(pageToken ? { pageToken } : {}),
    })
    const page = await gcal<{ items?: GEvent[]; nextPageToken?: string }>(`/events?${p}`)
    out.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return out
}

/** Метка, по которой наши записи отличаются от прочих событий календаря. */
export const BOOKING_PROP = 'balinskyBookingId'

/** Событие занимает время? Отменённые, «свободен», отклонённые и наши собственные записи — нет. */
export function blocksTime(e: GEvent): boolean {
  if (e.status === 'cancelled') return false
  if (e.transparency === 'transparent') return false
  if (e.extendedProperties?.private?.[BOOKING_PROP]) return false
  if (e.attendees?.some(a => a.self && a.responseStatus === 'declined')) return false
  return true
}

export async function createBookingEvent(input: {
  bookingId: string
  summary: string
  description: string
  startIso: string
  endIso: string
  guestEmail: string
  location: string | null
  withMeet: boolean
}): Promise<{ id: string; meetUrl: string | null }> {
  const body = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso, timeZone: 'Asia/Makassar' },
    end: { dateTime: input.endIso, timeZone: 'Asia/Makassar' },
    attendees: [{ email: input.guestEmail }],
    ...(input.location ? { location: input.location } : {}),
    extendedProperties: { private: { [BOOKING_PROP]: input.bookingId } },
    reminders: { useDefault: true },
    ...(input.withMeet
      ? { conferenceData: { createRequest: { requestId: input.bookingId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } }
      : {}),
  }
  const ev = await gcal<GEvent>('/events?conferenceDataVersion=1&sendUpdates=all', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { id: ev.id, meetUrl: ev.hangoutLink ?? null }
}

export async function deleteBookingEvent(eventId: string): Promise<void> {
  try {
    await gcal<void>(`/events/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: 'DELETE' })
  } catch (e) {
    // Уже удалено руками в календаре — это не ошибка отмены.
    const status = (e as { status?: number }).status
    if (status === 404 || status === 410) return
    throw e
  }
}
