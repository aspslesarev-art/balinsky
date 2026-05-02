import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { Inbox } from './_inbox'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Inbox · Balinsky Admin' }

export default async function AdminChats() {
  if (!(await requireAdmin())) redirect('/admin')
  return <Inbox />
}
