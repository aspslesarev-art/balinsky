import { NextResponse } from 'next/server'
import { currentAdminUsername, isOwnerAdmin } from '@/lib/admin-auth'
import { crmEnabled, loadTranscript } from '@/lib/tg-crm/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 2000
const NO_STORE = { 'Cache-Control': 'private, no-store' }

// Переписка одного чата страницами с конца: ?before=<индекс>&limit=<сколько>.
// Без before — последние limit сообщений. Личная переписка владельца:
// другим админам — 403, не вошедшим — 401.
export async function GET(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  if (!crmEnabled()) return NextResponse.json({ ok: false }, { status: 404, headers: NO_STORE })
  if (!(await currentAdminUsername())) return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE })
  if (!(await isOwnerAdmin())) return NextResponse.json({ ok: false }, { status: 403, headers: NO_STORE })

  const id = Number((await params).chatId)
  if (!Number.isSafeInteger(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400, headers: NO_STORE })

  const sp = new URL(req.url).searchParams
  const limitRaw = Number(sp.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX_LIMIT) : DEFAULT_LIMIT

  try {
    const all = await loadTranscript(id)
    // Архива нет — это не ошибка, а «ещё не выгружен»: пустая страница, а не 404
    if (!all) return NextResponse.json({ ok: true, total: 0, start: 0, messages: [] }, { headers: NO_STORE })
    const beforeRaw = sp.get('before')
    const before = beforeRaw == null ? all.length : Math.min(Math.max(Math.trunc(Number(beforeRaw)) || 0, 0), all.length)
    const start = Math.max(0, before - limit)
    return NextResponse.json(
      { ok: true, total: all.length, start, messages: all.slice(start, before) },
      { headers: NO_STORE },
    )
  } catch (e) {
    console.error('[crm] transcript', e)
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500, headers: NO_STORE })
  }
}
