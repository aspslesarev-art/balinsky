// Admin-only: link (or unlink) a developer to a Telegram lead chat.
// Writes raw_developers.telegram_chat_id. Consumed by /admin/dev-chats.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })

  let body: { airtableId?: string; chatId?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const airtableId = (body.airtableId ?? '').trim()
  if (!airtableId) return NextResponse.json({ ok: false, error: 'no_id' }, { status: 400 })

  // Empty / null → unlink. Otherwise store the chat id verbatim (a Telegram
  // numeric id like -1001234567890).
  const chatId = (body.chatId ?? '').toString().trim() || null

  const { error } = await sb
    .from('raw_developers')
    .update({ telegram_chat_id: chatId })
    .eq('airtable_id', airtableId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, chatId })
}
