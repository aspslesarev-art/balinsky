// Доступ Pro: кому открыть аналитику (макет «Админка: кому дать Pro», A —
// владелец 23.10.2026). Один список с переключателем; сверху — «Дать Pro»
// по почте или @telegram. О новых людях бот пишет сам, с теми же кнопками.
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { listProUsers } from '@/lib/pro-access'
import { LoginForm } from '../_login'
import { ProAdmin } from './_client'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Доступ Pro · Balinsky Admin' }

export default async function AdminProPage() {
  if (!(await requireAdmin())) return <LoginForm />
  const users = await listProUsers()
  return (
    <AdminThemeShell title="Доступ Pro" description="Pro видит доходность, спрос Booking и Airbnb, калькулятор аренды.">
      <ProAdmin initial={users} />
    </AdminThemeShell>
  )
}
