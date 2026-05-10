import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { updateHotspot, deleteHotspot } from '@/lib/complex-visualizations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const numId = Number(id)
  if (!Number.isFinite(numId)) return NextResponse.json({ error: 'bad_id' }, { status: 400 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  await updateHotspot(numId, body as Parameters<typeof updateHotspot>[1])
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const numId = Number(id)
  if (!Number.isFinite(numId)) return NextResponse.json({ error: 'bad_id' }, { status: 400 })
  await deleteHotspot(numId)
  return NextResponse.json({ ok: true })
}
