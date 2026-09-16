import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createOutboxUpload } from '@/lib/tg-business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Файл грузится из браузера напрямую в приватное хранилище (минуя лимит
// 4.5 МБ на тело запроса Vercel), потом /send забирает его и отдаёт в Telegram.
export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })
  const id = Number((await params).chatId)
  if (!Number.isSafeInteger(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400 })
  let body: { name?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  if (!body.name) return NextResponse.json({ ok: false, error: 'no_name' }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, ...(await createOutboxUpload(id, body.name)) })
  } catch (e) {
    console.error('[perepiska] upload url', e)
    return NextResponse.json({ ok: false, error: 'upload_url_failed' }, { status: 500 })
  }
}
