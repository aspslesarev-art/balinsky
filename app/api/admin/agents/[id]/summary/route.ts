import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAgent } from '@/lib/agents/store'
import { AiCapReached, AiDisabled, summarizeAgentChat } from '@/lib/agents/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Разобрать переписку по кнопке в карточке. Платный вызов, поэтому
// только для залогиненного админа и только по одной карточке за раз.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 })
  try {
    const agent = await getAgent(id)
    if (!agent) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    if (agent.tg_chat_id == null) return NextResponse.json({ ok: false, error: 'no_chat' }, { status: 400 })
    // Из карточки жмут осознанно — пересчитываем даже без новых сообщений.
    const res = await summarizeAgentChat(agent, { force: true })
    if (!res) return NextResponse.json({ ok: false, error: 'empty_chat' }, { status: 400 })
    return NextResponse.json({ ok: true, ...res })
  } catch (e) {
    if (e instanceof AiDisabled) return NextResponse.json({ ok: false, error: 'ai_disabled' }, { status: 503 })
    if (e instanceof AiCapReached) return NextResponse.json({ ok: false, error: 'cap_reached', message: e.message }, { status: 429 })
    console.error('[agents] summary', e)
    return NextResponse.json({ ok: false, error: 'ai_failed' }, { status: 500 })
  }
}
