// Lightweight "am I an admin?" check for the public site. The admin_session
// cookie is httpOnly, so a client-side overlay can't read it directly — it
// asks here. Used by components/InlineEditor to decide whether to turn on
// on-page editing. No secrets in the response, just a boolean.
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ admin: await requireAdmin() }, { headers: { 'Cache-Control': 'no-store' } })
}
