import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listChats } from '@/lib/bot-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const chats = await listChats()
  return NextResponse.json({ ok: true, chats })
}
