import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { createBanner, type BannerInput } from '@/lib/banners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/ads — create a banner.
// Body: BannerInput (see lib/banners.ts)
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: Partial<BannerInput>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (!body.imageUrl || typeof body.imageUrl !== 'string') return NextResponse.json({ error: 'imageUrl_required' }, { status: 400 })
  if (!body.linkUrl || typeof body.linkUrl !== 'string')   return NextResponse.json({ error: 'linkUrl_required' }, { status: 400 })
  if (!body.headline || typeof body.headline !== 'string') return NextResponse.json({ error: 'headline_required' }, { status: 400 })
  try {
    const banner = await createBanner(body as BannerInput)
    // Banners render inside app/ru/layout.tsx via AdBannerSlot, so
    // a layout-scoped revalidation pushes the new banner into every
    // page on the next request without waiting for ISR windows.
    revalidatePath('/', 'layout')
    return NextResponse.json({ banner })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'create_failed' }, { status: 500 })
  }
}
