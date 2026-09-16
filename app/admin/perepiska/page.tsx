import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { Perepiska } from './_perepiska'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Переписка · Balinsky Admin' }

export default async function AdminPerepiska() {
  if (!(await requireAdmin())) redirect('/admin')
  return <Perepiska />
}
