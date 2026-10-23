import { NextResponse } from 'next/server'
import { getProStatus, getSessionTelegramId, proCookie } from '@/lib/site-auth'

// Свежий статус Pro для вошедшего: владелец мог открыть доступ уже после
// входа. Отвечает и переставляет читаемый флаг bx_pro (components/AuthFlag.tsx).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const id = await getSessionTelegramId()
  const status = id == null ? null : await getProStatus(id)
  const res = NextResponse.json({ status })
  res.cookies.set(proCookie(status === 'granted'))
  return res
}
