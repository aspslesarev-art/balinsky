import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { listHotels, listRooms } from '@/lib/hotel/db'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { NewHotelForm } from './_new-hotel'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Отели · Balinsky Admin' }

export default async function HotelsAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  const hotels = await listHotels()
  const roomCounts = await Promise.all(hotels.map(h => listRooms(h.id).then(r => r.length)))

  return (
    <AdminThemeShell
      title="Отели"
      description="QR в номере: гость сканирует код, пишет на стойку и заказывает услуги."
    >
      <NewHotelForm />

      {hotels.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--ax-border)] bg-[var(--ax-panel)] p-10 text-center text-[13px] text-[var(--ax-fg-muted)]">
          Отелей пока нет. Заведите первый — и внутри появятся номера с QR-кодами.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {hotels.map((h, i) => (
            <li key={h.id}>
              <a
                href={`/admin/hotels/${h.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] px-5 py-4 no-underline hover:border-[var(--color-primary)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-medium text-[var(--ax-fg)]">{h.name}</div>
                  <div className="truncate text-[13px] text-[var(--ax-fg-muted)]">
                    /{h.slug} · {roomCounts[i]} номеров{h.active ? '' : ' · выключен'}
                  </div>
                </div>
                <span className="shrink-0 text-[13px] text-[var(--ax-fg-muted)]">Открыть →</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </AdminThemeShell>
  )
}
