import { NextResponse } from 'next/server'
import { currentAdminUsername } from '@/lib/admin-auth'
import { sendTgBusiness } from '@/lib/tg-business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Body: { text?: string, file?: { path, name, type } } — path из /upload.
export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const admin = await currentAdminUsername()
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 })
  const id = Number((await params).chatId)
  if (!Number.isSafeInteger(id)) return NextResponse.json({ ok: false, error: 'invalid_chat_id' }, { status: 400 })

  let body: { text?: unknown; file?: { path?: unknown; name?: unknown; type?: unknown } | null }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4096) : ''
  const f = body.file
  const file = f && typeof f.path === 'string' && typeof f.name === 'string'
    // Путь обязан лежать в папке этого чата — чужой файл из outbox не отправить.
    ? (f.path.startsWith(`${id}/`) && !f.path.includes('..')
        ? { path: f.path, name: f.name.slice(0, 200), type: typeof f.type === 'string' ? f.type : '' }
        : undefined)
    : null
  if (file === undefined) return NextResponse.json({ ok: false, error: 'bad_file' }, { status: 400 })
  if (!text && !file) return NextResponse.json({ ok: false, error: 'Пустое сообщение' }, { status: 400 })

  const res = await sendTgBusiness({ chatId: id, text, file, sentBy: admin })
  return NextResponse.json(res, { status: res.ok ? 200 : 502 })
}
