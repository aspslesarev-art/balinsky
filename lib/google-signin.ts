import 'server-only'

// Вход на сайт через Google (страница /pro, 21.10.2026).
//
// Тот же OAuth-клиент, что у календаря встреч (lib/meetings/google.ts), но
// только openid/email/profile: календарь посетителя нам не нужен. Аккаунт —
// тот же, что при входе по почте: id = emailUserId(адрес), поэтому человек,
// вошедший через Google и через код на ту же почту, попадает в один аккаунт.
//
// id_token не проверяем по подписи: он пришёл в ответ на наш запрос к
// oauth2.googleapis.com по TLS. Но aud, iss и email_verified сверяем —
// иначе можно было бы подсунуть токен, выданный другому приложению.

export const GOOGLE_STATE_COOKIE = 'g_signin_state'
export const GOOGLE_NEXT_COOKIE = 'g_signin_next'

function creds(): { id: string; secret: string } | null {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  return id && secret ? { id, secret } : null
}

export function googleSignInUrl(redirectUri: string, state: string): string | null {
  const c = creds()
  if (!c) return null
  const p = new URLSearchParams({
    client_id: c.id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

export type GoogleProfile = { email: string; givenName: string | null; familyName: string | null }

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleProfile | null> {
  const c = creds()
  if (!c) return null
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.id, client_secret: c.secret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  const t = (await r.json().catch(() => ({}))) as { id_token?: string; error?: string }
  if (!r.ok || !t.id_token) {
    console.error('[google-signin] token exchange failed:', t.error ?? r.status)
    return null
  }
  try {
    const claims = JSON.parse(Buffer.from(t.id_token.split('.')[1], 'base64url').toString('utf8')) as {
      aud?: string; iss?: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string
    }
    const issOk = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com'
    if (claims.aud !== c.id || !issOk || !claims.email || claims.email_verified !== true) {
      console.error('[google-signin] id_token rejected')
      return null
    }
    return { email: claims.email, givenName: claims.given_name ?? null, familyName: claims.family_name ?? null }
  } catch {
    console.error('[google-signin] id_token unreadable')
    return null
  }
}
