import { NextResponse } from 'next/server'
import { getSessionTelegramId, issueHandoffToken, safeNextPath } from '@/lib/site-auth'

// Перенос входа из встроенного браузера Телеграма в обычный (владелец 06.11.2026):
// вход по ссылке из бота оседает во встроенном браузере, и в Safari/Chrome
// приходится входить заново. Вошедший человек получает здесь одноразовую
// ссылку /auth/<token> — она откроется уже в обычном браузере и войдёт там.
// Только для уже вошедших: без сессии ссылки нет.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const id = await getSessionTelegramId()
  if (id == null) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let next: string | null = null
  try {
    const body = (await req.json()) as { next?: unknown }
    next = safeNextPath(body?.next)
  } catch {
    next = null
  }

  const token = await issueHandoffToken(id)
  if (!token) return NextResponse.json({ error: 'failed' }, { status: 500 })

  // На проде - адрес сайта (за прокси req.url может нести внутренний хост).
  const origin = process.env.NODE_ENV === 'production'
    ? (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin)
    : new URL(req.url).origin
  const url = `${origin}/auth/${encodeURIComponent(token)}${next ? `?next=${encodeURIComponent(next)}` : ''}`
  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
}
