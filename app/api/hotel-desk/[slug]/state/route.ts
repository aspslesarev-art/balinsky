import { NextResponse } from 'next/server'
import { requireDesk } from '@/lib/hotel/auth'
import { listMessages, loadDeskRequests, loadDeskRooms, markRead, stayById } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/hotel-desk/:slug/state[?stay=<id>] — доска стойки; со `stay`
// довешивает переписку выбранного номера и гасит его счётчик непрочитанного.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hotel = await requireDesk(slug)
  if (!hotel) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [rooms, requests] = await Promise.all([loadDeskRooms(hotel.id), loadDeskRequests(hotel.id)])

  const stayParam = new URL(req.url).searchParams.get('stay')
  let messages: Awaited<ReturnType<typeof listMessages>> = []
  if (stayParam) {
    const stay = await stayById(hotel.id, Number(stayParam))
    if (stay) {
      messages = await listMessages(stay.id)
      await markRead(stay.id, 'staff')
    }
  }

  return NextResponse.json({ hotel: { name: hotel.name, slug: hotel.slug }, rooms, requests, messages })
}
