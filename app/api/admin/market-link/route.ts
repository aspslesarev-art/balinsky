import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sbAdmin } from '@/lib/market/apply'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ручная пара «объявление ↔ юнит прайса» и выключатель автообновления.
// unitId = null снимает пару: объявление снова живёт своей ценой.
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { listingKind?: string; listingId?: string; unitId?: number | null; autoSync?: boolean }
    | null

  const kind = body?.listingKind
  const listingId = body?.listingId
  if ((kind !== 'villa' && kind !== 'apartment') || !listingId) {
    return NextResponse.json({ ok: false, error: 'нужны listingKind и listingId' }, { status: 400 })
  }

  const sb = sbAdmin()

  if (body?.unitId === null) {
    const { error } = await sb
      .from('market_listing_links')
      .delete()
      .eq('listing_kind', kind)
      .eq('listing_id', listingId)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, unlinked: true })
  }

  if (typeof body?.autoSync === 'boolean' && body.unitId === undefined) {
    const { error } = await sb
      .from('market_listing_links')
      .update({ auto_sync: body.autoSync })
      .eq('listing_kind', kind)
      .eq('listing_id', listingId)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, autoSync: body.autoSync })
  }

  if (typeof body?.unitId !== 'number') {
    return NextResponse.json({ ok: false, error: 'нужен unitId' }, { status: 400 })
  }

  const { error } = await sb.from('market_listing_links').upsert({
    listing_kind: kind,
    listing_id: listingId,
    unit_id: body.unitId,
    // Пара, поставленная руками, приоритетнее автоматической и при
    // повторном автосвязывании не перезаписывается.
    confidence: 'manual',
    auto_sync: true,
  }, { onConflict: 'listing_kind,listing_id' })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
