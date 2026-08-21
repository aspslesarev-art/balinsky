import { NextResponse } from 'next/server'
import { parseQueryFilters, loadAll, buildAllCards, PAGE_SIZE, LAZY_CHUNK } from '@/app/ru/apartamenty/_lib'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sp = Object.fromEntries(url.searchParams.entries())
  const filters = parseQueryFilters(sp)
  const { enriched, manifest } = await loadAll()
  // Порядок должен совпадать с серверным рендером: без скоров подгрузка
  // отдавала бы вторую страницу в другом порядке, чем первая.
  const scores = await (await import('@/lib/investment/batch-scores')).loadAllApartmentScores().catch(() => undefined)
  const all = buildAllCards(enriched, manifest, filters, undefined, 'ru', scores)

  if (sp.offset != null) {
    const offset = Math.max(0, Math.floor(Number(sp.offset) || 0))
    const limit = Math.max(1, Math.min(50, Math.floor(Number(sp.limit) || LAZY_CHUNK)))
    const cards = all.slice(offset, offset + limit)
    return NextResponse.json({
      cards, offset, limit,
      totalCount: all.length,
      hasMore: offset + cards.length < all.length,
    })
  }

  const page = Math.max(1, Math.floor(Number(sp.page) || 1))
  const start = (page - 1) * PAGE_SIZE
  const cards = all.slice(start, start + PAGE_SIZE)
  return NextResponse.json({
    cards, page,
    totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
    totalCount: all.length,
    hasMore: start + cards.length < all.length,
  })
}
