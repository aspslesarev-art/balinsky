import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listTgMeetings, listTgMessages } from '@/lib/tg-business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const id = Number((await params).chatId)
  if (!Number.isSafeInteger(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400 })
  try {
    const [messages, meetings] = await Promise.all([listTgMessages(id), listTgMeetings(id)])
    return NextResponse.json({ ok: true, messages, meetings })
  } catch (e) {
    console.error('[perepiska] messages', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}
