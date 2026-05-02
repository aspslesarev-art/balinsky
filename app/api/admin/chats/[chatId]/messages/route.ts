import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getChat, listMessages, markChatRead } from '@/lib/bot-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { chatId } = await params
  const id = Number(chatId)
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400 })
  const [chat, messages] = await Promise.all([getChat(id), listMessages(id)])
  // Reading the messages clears the unread badge.
  await markChatRead(id)
  return NextResponse.json({ ok: true, chat, messages })
}
