// Загрузка Бали на Booking: ежедневный сбор с сервера smarthouse
// (~/apps/booking-occupancy) → таблицы booking_occ_* → эта страница.

import { requireAdmin } from '@/lib/admin-auth'
import { loadOccDashboard } from '@/lib/booking-occ/dashboard'
import { LoginForm } from '../_login'
import { MarketShell } from '../market/_shell'
import { OccDashboardView } from './_dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Загрузка на Booking', robots: { index: false, follow: false } }

export default async function BookingOccPage() {
  if (!(await requireAdmin())) return <LoginForm />
  const data = await loadOccDashboard()
  return (
    <MarketShell>
      <OccDashboardView data={data} />
    </MarketShell>
  )
}
