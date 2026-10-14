// Lightweight "am I an admin?" check for the public site. The admin_session
// cookie is httpOnly, so a client-side overlay can't read it directly — it
// asks here. Used by components/InlineEditor to decide whether to turn on
// on-page editing. No secrets in the response, just a boolean.
import { NextResponse } from 'next/server'
import { isOwnerAdmin, requireAdmin } from '@/lib/admin-auth'
import { crmEnabled } from '@/lib/tg-crm/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // owner — для меню админки: пункт «Мои контакты» видит только владелец,
  // и только там, где лежат данные CRM (его Мак).
  const [admin, owner] = await Promise.all([requireAdmin(), isOwnerAdmin()])
  return NextResponse.json({ admin, owner: owner && crmEnabled() }, { headers: { 'Cache-Control': 'no-store' } })
}
