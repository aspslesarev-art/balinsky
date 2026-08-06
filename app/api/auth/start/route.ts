import { NextResponse } from 'next/server'
import { startLoginChallenge, challengeCookie } from '@/lib/site-auth'

// Начало входа по коду: заводим challenge, кладём его в httpOnly-куку и
// отдаём deep-link на бота с тем же значением в payload.
//
// Почему не на рендере страницы: блоки с гейтом живут внутри ISR-страниц,
// один и тот же HTML отдаётся всем. Challenge, выпущенный при рендере, был
// бы общим для всех посетителей — его нужно выпускать на действие.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT = 'BalinskyBot'

export async function POST() {
  const challenge = await startLoginChallenge()
  if (!challenge) {
    return NextResponse.json({ ok: false, error: 'start_failed' }, { status: 503 })
  }
  const res = NextResponse.json({
    ok: true,
    url: `https://t.me/${BOT}?start=code_${challenge}`,
  })
  res.cookies.set(challengeCookie(challenge))
  return res
}
