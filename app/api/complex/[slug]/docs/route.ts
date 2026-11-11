// Документы комплекса (lib/complex-docs.ts) из закрытого бакета complex-docs.
// Открываются только вошедшим с Pro (isProSession, решение владельца 2026-11-11).
//   ?check=1          → { unlocked } — показать файлы или форму
//   ?f=<file>[&dl=1]  → редирект на подписанную ссылку на 5 минут
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { complexDocFile } from '@/lib/complex-docs'
import { isProSession } from '@/lib/site-auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const NO_INDEX = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(`docs:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: NO_INDEX })
  }
  const { slug } = await params
  const url = new URL(req.url)
  const unlocked = await isProSession()

  if (url.searchParams.has('check')) {
    return NextResponse.json({ unlocked }, { headers: NO_INDEX })
  }

  const doc = complexDocFile(slug, url.searchParams.get('f') ?? '')
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_INDEX })
  if (!unlocked) return NextResponse.json({ error: 'pro_required' }, { status: 403, headers: NO_INDEX })
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 503, headers: NO_INDEX })
  }

  const download = url.searchParams.get('dl') === '1' ? `${slug}-${doc.file}.pdf` : undefined
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data, error } = await sb.storage
    .from('complex-docs')
    .createSignedUrl(`${slug}/${doc.file}.pdf`, 300, download ? { download } : undefined)
  if (error || !data?.signedUrl) {
    console.error('[docs] signed url failed', slug, doc.file, error?.message)
    return NextResponse.json({ error: 'unavailable' }, { status: 502, headers: NO_INDEX })
  }
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: NO_INDEX })
}
