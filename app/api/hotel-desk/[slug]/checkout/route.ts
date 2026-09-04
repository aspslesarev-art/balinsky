import { NextResponse } from 'next/server'
import { requireDesk } from '@/lib/hotel/auth'
import { closeStay, stayById } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/hotel-desk/:slug/checkout — выезд гостя.
// Закрывает смену: следующий гость этого номера откроет ту же ссылку и
// увидит чистую переписку, а не чужие заказы.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hotel = await requireDesk(slug)
  if (!hotel) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { stayId?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.stayId) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const stay = await stayById(hotel.id, body.stayId)
  if (!stay) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  await closeStay(hotel.id, stay.id)
  return NextResponse.json({ ok: true })
}
