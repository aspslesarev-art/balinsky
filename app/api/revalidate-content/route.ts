import { revalidateTag, revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { KIND_TO_TAGS, KIND_TO_PATHS } from '@/lib/content-revalidate-map'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_TOKEN
  if (!expected) {
    return NextResponse.json({ error: 'REVALIDATE_TOKEN is not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const kindsParam = url.searchParams.get('kinds') ?? 'events,news,promo,knowledge,rental,managers'
  const kinds = kindsParam.split(',').map(s => s.trim()).filter(Boolean)
  const unknown = kinds.filter(k => !KIND_TO_TAGS[k])
  if (unknown.length > 0) {
    return NextResponse.json({ error: 'unknown kinds', kinds: unknown }, { status: 400 })
  }

  for (const k of kinds) {
    revalidateTag(KIND_TO_TAGS[k], 'max')
    for (const route of KIND_TO_PATHS[k]) {
      revalidatePath(route.path, route.type)
    }
  }

  return NextResponse.json({ ok: true, revalidated: kinds })
}
