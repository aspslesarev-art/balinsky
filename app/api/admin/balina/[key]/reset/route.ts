import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { resetSection } from '@/lib/assistant-knowledge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/admin/balina/:key/reset — revert a section back to the
// seed body defined in lib/assistant-knowledge.ts (DEFAULT_SECTIONS).
// No body. Returns { section } with the freshly seeded row.
export async function POST(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { key } = await params
  if (!key) return NextResponse.json({ error: 'missing_key' }, { status: 400 })
  try {
    const section = await resetSection(key)
    return NextResponse.json({ section })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'reset_failed' }, { status: 500 })
  }
}
