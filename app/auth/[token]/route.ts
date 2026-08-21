import { NextResponse } from 'next/server'
import { consumeLoginToken, safeNextPath, sessionCookies } from '@/lib/site-auth'

// Redeem the one-time link the Telegram bot sent.
//
// Kept as a GET route because it is opened by tapping a link in a chat. The
// token is single-use and expires in 15 minutes, so a link that leaks from a
// forwarded message is worthless.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Only same-site paths — never bounce a login to another origin.
 *
 * Проверка одна на весь вход (`safeNextPath`), и она смотрит не только на
 * `//`: для URL со «специальной» схемой обратный слэш равнозначен прямому,
 * поэтому `new URL('/\\evil.com', origin)` даёт `https://evil.com/`. Здесь
 * это не просто редирект — куки сессии ставятся до перехода, так что открытый
 * редирект уносил бы на чужой домен уже авторизованного человека.
 */
function safeNext(raw: string | null): string {
  return safeNextPath(raw) ?? '/'
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const url = new URL(req.url)
  const next = safeNext(url.searchParams.get('next'))

  const telegramId = await consumeLoginToken(token)
  if (telegramId == null) {
    // Land on the account page with a flag so it can explain what happened
    // and offer a fresh link, rather than showing a bare error.
    return NextResponse.redirect(new URL('/kabinet?login=expired', url.origin))
  }

  const res = NextResponse.redirect(new URL(next, url.origin))
  for (const c of sessionCookies(telegramId)) res.cookies.set(c)
  return res
}
