import { NextResponse } from 'next/server'
import { getSiteUser } from '@/lib/site-auth'
import { searchComplexes, complexNameById, listComplexUnits, unitFacts } from '@/lib/agent-listings/catalog'
import type { ListingKind } from '@/lib/agent-listings/types'

// Справочник для формы добавления объекта: поиск ЖК, юниты выбранного ЖК и
// факты конкретного юнита. Под логином — каталог открыт и так, но эти ручки
// бьют по базе, и оставлять их без авторизации значит подарить бесплатный
// поисковый API любому боту.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function kindOf(v: string | null): ListingKind {
  return v === 'apartment' ? 'apartment' : 'villa'
}

export async function GET(req: Request) {
  const user = await getSiteUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const what = url.searchParams.get('what')

  if (what === 'complexes') {
    return NextResponse.json({ complexes: await searchComplexes(url.searchParams.get('q') ?? '') })
  }

  if (what === 'units') {
    const complexId = url.searchParams.get('complexId')
    if (!complexId) return NextResponse.json({ error: 'complexId required' }, { status: 400 })
    const name = await complexNameById(complexId)
    if (!name) return NextResponse.json({ units: [] })
    return NextResponse.json({ units: await listComplexUnits(kindOf(url.searchParams.get('kind')), name) })
  }

  if (what === 'unit') {
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const facts = await unitFacts(kindOf(url.searchParams.get('kind')), id)
    if (!facts) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ facts })
  }

  return NextResponse.json({ error: 'unknown what' }, { status: 400 })
}
