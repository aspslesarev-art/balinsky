// Загрузка Бали на Booking: ежедневный сбор с сервера smarthouse
// (~/apps/booking-occupancy) → таблицы booking_occ_* → эта страница.

import { requireAdmin } from '@/lib/admin-auth'
import { loadOccDashboard, loadOccDrivers } from '@/lib/booking-occ/dashboard'
import { LoginForm } from '../_login'
import { MarketShell } from '../market/_shell'
import { OccDashboardView } from './_dashboard'
import { OccDrivers } from './_drivers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Загрузка на Booking', robots: { index: false, follow: false } }

export default async function BookingOccPage() {
  if (!(await requireAdmin())) return <LoginForm />
  const [data, drivers] = await Promise.all([loadOccDashboard(), loadOccDrivers()])
  return (
    <MarketShell>
      <OccDashboardView data={data} />
      <OccDrivers rows={drivers.rows} meta={drivers.meta} />
      <p className="max-w-[68ch] text-[12px] leading-relaxed text-[var(--ax-fg-muted)]">
        Сбор каждый день в 12:00 WITA: 5,6 тыс. вилл (календарь на 60 дней) и 7,5 тыс. отелей до 40 номеров (свободные номера на сегодня).
        Это только Booking и только активные объекты — абсолютный процент выше официального (BPS, август 2026: отели без звёзд 43%),
        поэтому полезнее сравнения: район с районом, тип с типом, день с днём.
      </p>
    </MarketShell>
  )
}
