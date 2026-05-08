// Polled by the ConsultantWidget to surface manager replies arriving
// out-of-band — the manager hits "Send" in /admin/chats while the
// visitor is mid-conversation. Returns manager-source messages whose
// created_at is strictly newer than the `since` cursor the widget
// holds locally.
//
// No auth: identity is the bal_assistant_sid cookie. Without the
// cookie we return an empty payload (the visitor hasn't started a
// conversation yet, so there is nothing for them to receive).

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { ASSISTANT_COOKIE, uuidToChatId } from '@/lib/assistant-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function GET(req: Request) {
  const store = await cookies()
  const uuid = store.get(ASSISTANT_COOKIE)?.value
  if (!uuid || !/^[0-9a-f-]{32,36}$/i.test(uuid)) {
    return NextResponse.json({ messages: [], serverNow: new Date().toISOString() })
  }
  const chatId = uuidToChatId(uuid)

  const url = new URL(req.url)
  const since = url.searchParams.get('since')
  let q = sb.from('bot_messages')
    .select('text, created_at')
    .eq('chat_id', chatId)
    .eq('source', 'manager')
    .eq('direction', 'out')
    .order('created_at', { ascending: true })
    .limit(50)
  if (since) q = q.gt('created_at', since)
  const { data } = await q

  return NextResponse.json({
    serverNow: new Date().toISOString(),
    messages: (data ?? []).map(m => ({
      role: 'assistant' as const,
      content: m.text ?? '',
      source: 'manager' as const,
      createdAt: m.created_at,
    })),
  })
}
