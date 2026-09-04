import { NextResponse } from 'next/server'
import { getSiteUser, updateSiteUser, clearedCookies } from '@/lib/site-auth'

// Account page form target. Plain form POST rather than fetch + JSON so the
// page keeps working with no client JS at all — one less thing to break on a
// slow phone, which is most of this audience.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const origin = new URL(req.url).origin
  const user = await getSiteUser()
  if (!user) return NextResponse.redirect(new URL('/kabinet', origin), { status: 303 })

  const form = await req.formData()

  if (form.get('action') === 'logout') {
    const res = NextResponse.redirect(new URL('/kabinet', origin), { status: 303 })
    for (const c of clearedCookies()) res.cookies.set(c)
    return res
  }

  const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : null)
  const ok = await updateSiteUser(user.telegramId, {
    firstName: str(form.get('firstName')),
    lastName: str(form.get('lastName')),
    isAgent: form.get('isAgent') === 'on',
    phone: str(form.get('phone')),
    agency: str(form.get('agency')),
    contactNote: str(form.get('contactNote')),
  })

  return NextResponse.redirect(new URL(ok ? '/kabinet?saved=1' : '/kabinet?error=1', origin), { status: 303 })
}
