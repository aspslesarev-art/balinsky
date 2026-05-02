import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { BroadcastUI } from './_ui'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Рассылка · Balinsky Admin' }

export default async function AdminBroadcast() {
  if (!(await requireAdmin())) redirect('/admin')
  return <BroadcastUI />
}
