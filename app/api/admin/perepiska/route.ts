import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listTgChats } from '@/lib/tg-business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    return NextResponse.json({ ok: true, chats: await listTgChats() })
  } catch (e) {
    console.error('[perepiska] chats', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}
