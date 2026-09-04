import { NextResponse } from 'next/server'
import { getSiteUser } from '@/lib/site-auth'
import { uploadToBucket } from '@/lib/admin/photos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
const BUCKET_BY_KIND: Record<string, string> = {
  villa: 'villa-photos',
  apartment: 'apartment-photos',
}

// Загрузка фото для объекта агента. Файлы кладутся в отдельную папку
// `agents/<telegram_id>/`, чтобы их можно было чистить, не задевая
// выверенные фото каталога в том же бакете.
export async function POST(req: Request) {
  const user = await getSiteUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const kind = String(form?.get('kind') ?? 'villa')
  const bucket = BUCKET_BY_KIND[kind] ?? 'villa-photos'

  if (!(file instanceof File)) return NextResponse.json({ error: 'Файл не получен' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Файл больше 8 МБ' }, { status: 400 })
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Только JPG, PNG или WebP' }, { status: 400 })

  try {
    const url = await uploadToBucket(bucket, {
      filename: file.name || 'photo.jpg',
      buf: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      prefix: `agents/${user.telegramId}`,
    })
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[kabinet/photos]', (e as Error).message)
    return NextResponse.json({ error: 'Не удалось загрузить фото' }, { status: 500 })
  }
}
