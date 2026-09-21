import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAgent, listAgents, listUnlinkedChats } from '@/lib/agents/store'
import { isStatus } from '@/lib/agents/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Доска целиком + «входящие» из переписок бота одним запросом: оба
// списка нужны при каждом открытии раздела, а данных здесь на две
// сотни строк — делить на два похода незачем.
export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const archived = new URL(req.url).searchParams.get('archived') === '1'
  try {
    const [agents, chats] = await Promise.all([listAgents(archived), listUnlinkedChats()])
    return NextResponse.json({ ok: true, agents, chats })
  } catch (e) {
    console.error('[agents] list', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  try {
    const body = await req.json() as {
      name?: string; agency?: string; status?: string
      telegram?: string; tg_chat_id?: number; source?: string
    }
    const name = (body.name ?? '').trim()
    if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
    const agent = await createAgent({
      name,
      agency: body.agency?.trim() || null,
      status: isStatus(body.status) ? body.status : 'new',
      telegram: body.telegram ?? null,
      tg_chat_id: Number.isSafeInteger(body.tg_chat_id) ? body.tg_chat_id : null,
      source: body.source === 'chat' ? 'chat' : 'manual',
    })
    return NextResponse.json({ ok: true, agent })
  } catch (e) {
    console.error('[agents] create', e)
    const msg = e instanceof Error ? e.message : ''
    // Чат уже привязан к другой карточке — это не сбой, а понятный ответ.
    if (msg.includes('agents_tg_chat_id_key')) {
      return NextResponse.json({ ok: false, error: 'chat_taken' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 })
  }
}
