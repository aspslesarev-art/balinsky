import { NextResponse } from 'next/server'
import { startEmailLogin, challengeCookie } from '@/lib/site-auth'

// Вход по почте: шлём шестизначный код на адрес и кладём challenge в
// httpOnly-куку этого браузера. Проверка кода — общий /api/auth/code.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ERRORS = {
  ru: {
    invalid_email: 'Проверьте адрес почты.',
    rate_limited: 'Слишком много кодов за час. Попробуйте позже.',
    send_failed: 'Не получилось отправить письмо. Попробуйте ещё раз через минуту.',
  },
  en: {
    invalid_email: 'Please check the email address.',
    rate_limited: 'Too many codes this hour. Please try again later.',
    send_failed: 'We could not send the email. Please try again in a minute.',
  },
} as const

export async function POST(req: Request) {
  let body: { email?: unknown; path?: unknown; lang?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // Пустое тело обработает проверка адреса ниже.
  }
  const lang = body.lang === 'ru' ? 'ru' : 'en'
  const result = await startEmailLogin(body.email, body.path, lang)
  if (!result.ok) {
    const status = result.reason === 'rate_limited' ? 429 : result.reason === 'invalid_email' ? 400 : 503
    return NextResponse.json({ ok: false, reason: result.reason, error: ERRORS[lang][result.reason] }, { status })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(challengeCookie(result.challenge))
  return res
}
