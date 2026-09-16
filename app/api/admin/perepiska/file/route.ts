import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getTgFile } from '@/lib/tg-business'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const INLINE = new Set(['photo', 'sticker', 'voice', 'audio', 'video', 'video_note', 'animation'])

// Скачивание вложения из Telegram (getFile отдаёт файлы до 20 МБ).
export async function GET(req: Request) {
  if (!(await requireAdmin())) return new NextResponse('unauthorized', { status: 401 })
  const token = process.env.TG_BUSINESS_BOT_TOKEN
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!token || !Number.isSafeInteger(id)) return new NextResponse('bad request', { status: 400 })

  const row = await getTgFile(id)
  if (!row) return new NextResponse('not found', { status: 404 })

  const meta = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(row.file_id)}`)
    .then(r => r.json()).catch(() => null) as { ok?: boolean; result?: { file_path?: string } } | null
  const path = meta?.ok ? meta.result?.file_path : null
  if (!path) return new NextResponse('Файл недоступен (больше 20 МБ или удалён)', { status: 404 })

  const dl = await fetch(`https://api.telegram.org/file/bot${token}/${path}`)
  if (!dl.ok || !dl.body) return new NextResponse('download failed', { status: 502 })

  const name = row.file_name || path.split('/').pop() || 'file'
  const disposition = INLINE.has(row.media_type ?? '') ? 'inline' : 'attachment'
  return new NextResponse(dl.body, {
    headers: {
      // Вложения присылают посторонние люди — не даём браузеру исполнять их на нашем домене.
      'content-type': disposition === 'inline' ? (dl.headers.get('content-type') ?? 'application/octet-stream') : 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
      'content-disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, max-age=3600',
    },
  })
}
