import { NextResponse } from 'next/server'
import { requireDesk } from '@/lib/hotel/auth'
import { setRequestStatus, type RequestStatus } from '@/lib/hotel/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED: RequestStatus[] = ['new', 'in_progress', 'done', 'declined']

// POST /api/hotel-desk/:slug/request — «взял в работу» / «готово» / «отказ».
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hotel = await requireDesk(slug)
  if (!hotel) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { id?: number; status?: RequestStatus }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.id || !body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const updated = await setRequestStatus(hotel.id, body.id, body.status)
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true, request: updated })
}
