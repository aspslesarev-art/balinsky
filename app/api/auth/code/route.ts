import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LOGIN_CHALLENGE_COOKIE, redeemLoginCode, sessionCookies } from '@/lib/site-auth'

// Проверка кода из Telegram. Код сам по себе ничего не значит: он
// действителен только вместе с challenge из httpOnly-куки этого браузера,
// поэтому подобрать четыре цифры к чужому аккаунту нельзя — только к своей
// же строке и ограниченное число раз.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REASON_TEXT: Record<string, string> = {
  invalid: 'Неверный код. Проверьте цифры из сообщения бота.',
  expired: 'Код истёк. Запросите новый — он действует 15 минут.',
  blocked: 'Слишком много попыток. Запросите новый код.',
  pending: 'Бот ещё не прислал код. Откройте Telegram и нажмите «Запустить».',
}

export async function POST(req: Request) {
  let code = ''
  try {
    const body = await req.json()
    code = typeof body?.code === 'string' ? body.code.trim() : ''
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный запрос.' }, { status: 400 })
  }

  const jar = await cookies()
  const challenge = jar.get(LOGIN_CHALLENGE_COOKIE)?.value ?? ''
  if (!challenge) {
    return NextResponse.json(
      { ok: false, error: 'Сессия входа не найдена. Начните заново.' },
      { status: 400 },
    )
  }

  const result = await redeemLoginCode(challenge, code)
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason, error: REASON_TEXT[result.reason] },
      { status: 401 },
    )
  }

  const res = NextResponse.json({ ok: true })
  for (const c of sessionCookies(result.telegramId)) res.cookies.set(c)
  // Challenge отработал — гасим куку, чтобы она не болталась до истечения.
  res.cookies.set({ name: LOGIN_CHALLENGE_COOKIE, value: '', path: '/', maxAge: 0 })
  return res
}
