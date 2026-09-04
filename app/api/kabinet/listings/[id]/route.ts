import { NextResponse } from 'next/server'
import { getSiteUser } from '@/lib/site-auth'
import { updateListing, archiveListing } from '@/lib/agent-listings/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Агент правит только цену, комментарий и фото. Факты юнита остаются теми,
// что записаны при создании: подмена площади/спален задним числом на уже
// одобренной карточке — это обход модерации.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSiteUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 }) }

  const patch: { priceUsd?: number; comment?: string | null } = {}
  if (body.priceUsd !== undefined) {
    const p = Number(body.priceUsd)
    if (!Number.isFinite(p) || p <= 0 || p > 100_000_000) {
      return NextResponse.json({ error: 'Некорректная цена' }, { status: 400 })
    }
    patch.priceUsd = Math.round(p)
  }
  if (body.comment !== undefined) {
    patch.comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) || null : null
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Нечего менять' }, { status: 400 })

  const ok = await updateListing(id, user.telegramId, patch)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSiteUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const ok = await archiveListing(id, user.telegramId)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Не удалось снять объект' }, { status: 500 })
}
