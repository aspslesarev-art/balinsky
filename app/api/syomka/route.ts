import { NextResponse } from 'next/server'
import { isSyomkaKey } from '@/lib/syomka/access'
import { complexPhotos, findComplexes } from '@/lib/syomka/objects'

// Данные для «Камеры по фото» на закрытой странице /syomka/<ключ>.
//   GET ?key=…&q=…   — список ЖК (по названию)
//   GET ?key=…&id=…  — фото выбранного ЖК
// Без верного ключа — 404, как и сама страница.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const u = new URL(req.url)
  if (!isSyomkaKey(u.searchParams.get('key') ?? '')) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  try {
    const id = u.searchParams.get('id')
    if (id) {
      if (!/^(rec[A-Za-z0-9]{14}|adm_[a-z0-9]{6,24})$/.test(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 })
      const obj = await complexPhotos(id)
      if (!obj) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      return NextResponse.json(obj, { headers: { 'Cache-Control': 'private, max-age=300' } })
    }
    const q = (u.searchParams.get('q') ?? '').slice(0, 60)
    const list = await findComplexes(q)
    return NextResponse.json({ results: list }, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch (e) {
    console.error('[syomka api]', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
