import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { sbAdmin } from '@/lib/market/apply'
import { applySiteSync, linkListings, planSiteSync } from '@/lib/market/site-sync'
import { KIND_TO_PATHS, KIND_TO_TAGS } from '@/lib/content-revalidate-map'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Ночное обновление цен объявлений из прайсов застройщиков. Идёт после
// обхода трекера, поэтому сверяет уже свежие прайсы.
// Auth: Bearer CRON_SECRET, как у остальных кронов.
//
//   ?dry=1     — посчитать, но ничего не писать
//   ?link=0    — не заводить новые пары, только сверить уже заведённые
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return NextResponse.json({ ok: false, error: 'no_secret' }, { status: 500 })
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dry = url.searchParams.get('dry') === '1'
  const sb = sbAdmin()

  try {
    const links = url.searchParams.get('link') === '0' ? null : await linkListings(sb)
    const plan = await planSiteSync(sb)
    const held = plan.changes.filter(c => c.outcome === 'skipped_big_change')

    if (dry) {
      return NextResponse.json({ ok: true, dry: true, links, checked: plan.checked, changes: plan.changes, sold: plan.soldUnits })
    }

    const applied = await applySiteSync(sb, plan)

    // content_version уже поднят внутри applySiteSync; теги и ISR-пути
    // сбрасываем здесь — это работает только в рантайме Next.
    for (const kind of new Set(plan.changes.filter(c => c.outcome === 'applied').map(c => (c.kind === 'villa' ? 'villas' : 'apartments')))) {
      const tag = KIND_TO_TAGS[kind]
      if (tag) revalidateTag(tag, 'max')
      for (const route of KIND_TO_PATHS[kind] ?? []) revalidatePath(route.path, route.type)
    }

    return NextResponse.json({
      ok: true,
      links,
      checked: plan.checked,
      applied,
      held: held.length,
      sold: plan.soldUnits.length,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'sync_failed' }, { status: 500 })
  }
}
