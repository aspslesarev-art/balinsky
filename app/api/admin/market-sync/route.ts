import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { sbAdmin } from '@/lib/market/apply'
import { applySiteSync, linkListings, planSiteSync } from '@/lib/market/site-sync'
import { KIND_TO_PATHS, KIND_TO_TAGS } from '@/lib/content-revalidate-map'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Сверка цен с прайсами по кнопке из админки.
//
// То же, что делает ночной крон, но здесь важна вторая половина работы:
// сбросить кэш страниц. Карточки объектов держатся час, поэтому после
// прогона из консоли сайт ещё час показывает прежнюю дату «цена
// обновлена» — а из рантайма Next кэш сбрасывается сразу.
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false }, { status: 401 })

  const sb = sbAdmin()
  try {
    const links = await linkListings(sb)
    const plan = await planSiteSync(sb)
    const result = await applySiteSync(sb, plan)

    const kinds = new Set([
      ...plan.changes.filter(c => c.outcome === 'applied').map(c => c.kind),
      ...plan.confirmed.map(c => c.kind),
    ].map(k => (k === 'villa' ? 'villas' : 'apartments')))
    for (const kind of kinds) {
      const tag = KIND_TO_TAGS[kind]
      if (tag) revalidateTag(tag, 'max')
      for (const route of KIND_TO_PATHS[kind] ?? []) revalidatePath(route.path, route.type)
    }

    return NextResponse.json({
      ok: true,
      linked: links.linked,
      checked: plan.checked,
      applied: result.applied,
      confirmed: result.confirmed,
      held: plan.changes.filter(c => c.outcome !== 'applied').length,
      sold: plan.soldUnits.length,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'sync_failed' }, { status: 500 })
  }
}
