import { NextResponse } from 'next/server'
import { currentAdminUsername, requireAdmin } from '@/lib/admin-auth'
import {
  chatMeetings, chatTail, deleteAgent, getAgent, linkChat, listAllChats, listNotes, updateAgent,
} from '@/lib/agents/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Карточка целиком: анкета, лента заметок, хвост переписки, встречи и
// список чатов для привязки.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    const agent = await getAgent(id)
    if (!agent) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    const [notes, messages, meetings, chats] = await Promise.all([
      listNotes(id),
      agent.tg_chat_id != null ? chatTail(agent.tg_chat_id) : Promise.resolve([]),
      agent.tg_chat_id != null ? chatMeetings(agent.tg_chat_id) : Promise.resolve([]),
      listAllChats(),
    ])
    return NextResponse.json({ ok: true, agent, notes, messages, meetings, chats })
  } catch (e) {
    console.error('[agents] get', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  const author = await currentAdminUsername()
  try {
    const body = await req.json() as Record<string, unknown>
    // Привязка чата идёт своим путём: там проверка «чат уже занят» и
    // отметка в ленте, которых обычный апдейт полей не делает.
    if ('tg_chat_id' in body) {
      const raw = body.tg_chat_id
      const chatId = raw == null ? null : Number(raw)
      if (chatId != null && !Number.isSafeInteger(chatId)) {
        return NextResponse.json({ ok: false, error: 'bad_chat_id' }, { status: 400 })
      }
      const agent = await linkChat(id, chatId, author)
      return NextResponse.json({ ok: true, agent })
    }
    const agent = await updateAgent(id, body, author)
    return NextResponse.json({ ok: true, agent })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.startsWith('chat_taken:')) {
      return NextResponse.json({ ok: false, error: 'chat_taken', by: msg.slice('chat_taken:'.length) }, { status: 409 })
    }
    if (msg === 'nothing_to_update') return NextResponse.json({ ok: false, error: msg }, { status: 400 })
    console.error('[agents] patch', e)
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    await deleteAgent(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[agents] delete', e)
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 })
  }
}
