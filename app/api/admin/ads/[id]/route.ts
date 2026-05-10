import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { updateBanner, deleteBanner, type BannerInput } from '@/lib/banners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  let body: Partial<BannerInput>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  try {
    await updateBanner(id, body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'update_failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  try {
    await deleteBanner(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'delete_failed' }, { status: 500 })
  }
}
