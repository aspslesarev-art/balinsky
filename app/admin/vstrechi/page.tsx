import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { googleConnection } from '@/lib/meetings/google'
import { addDays, baliToday, isoWeekday, listUpcomingBookings, loadDays, loadSettings } from '@/lib/meetings/store'
import { MeetingsAdmin } from './_client'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Встречи · Balinsky Admin' }

const GOOGLE_STATUS: Record<string, string> = {
  connected: 'Календарь подключён.',
  denied: 'Доступ к календарю не выдан.',
  bad_state: 'Сессия подключения устарела — попробуйте ещё раз.',
  no_client: 'Не заданы GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET в env.',
  failed: 'Google не принял код — подробности в логах Vercel.',
  no_code: 'Google не вернул код авторизации.',
}

export default async function MeetingsAdminPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { google } = await searchParams
  const today = baliToday()
  const [settings, connection, bookings] = await Promise.all([loadSettings(), googleConnection(), listUpcomingBookings()])
  const to = addDays(today, settings.horizonDays - 1)
  const dayRows = await loadDays(today, to)

  const days: string[] = []
  for (let d = today; d <= to; d = addDays(d, 1)) {
    if (settings.workDays.includes(isoWeekday(d))) days.push(d)
  }

  return (
    <AdminThemeShell title="Встречи" description="Запись на встречи · Google Календарь · районы по дням">
      <MeetingsAdmin
        settings={settings}
        connection={connection}
        googleNotice={google ? GOOGLE_STATUS[google] ?? null : null}
        days={days}
        dayRows={dayRows}
        bookings={bookings}
      />
    </AdminThemeShell>
  )
}
