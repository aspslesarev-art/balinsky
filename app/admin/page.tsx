import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { LoginForm } from './_login'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Balinsky Admin' }

export default async function AdminRoot() {
  if (await requireAdmin()) redirect('/admin/chats')
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1419] text-white px-4">
      <LoginForm />
    </div>
  )
}
