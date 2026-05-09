import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { updateSection, loadKnowledgeSections } from '@/lib/assistant-knowledge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/admin/balina/:key — update one knowledge section.
// Body: { body: string }. Returns { section } with the freshly
// loaded row (so the editor can sync timestamps + isDefault flag).
export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { key } = await params
  if (!key) return NextResponse.json({ error: 'missing_key' }, { status: 400 })

  let body: { body?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  if (typeof body.body !== 'string') return NextResponse.json({ error: 'bad_body' }, { status: 400 })

  try {
    await updateSection(key, body.body)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'update_failed' }, { status: 500 })
  }

  // Re-fetch only the touched section so the editor gets the
  // canonical updatedAt + isDefault back.
  const sections = await loadKnowledgeSections()
  const section = sections.find(s => s.key === key)
  if (!section) return NextResponse.json({ error: 'not_found_after_update' }, { status: 500 })
  return NextResponse.json({ section })
}
