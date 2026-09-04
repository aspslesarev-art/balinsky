import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { hotelBySlug, hotelStaffCode, listRooms, listServices } from '@/lib/hotel/db'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { HotelEditor } from './_hotel'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Отель · Balinsky Admin' }

export default async function HotelAdmin({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) redirect('/admin')
  const { slug } = await params

  const hotel = await hotelBySlug(slug)
  if (!hotel) notFound()

  const [rooms, services, staffCode] = await Promise.all([
    listRooms(hotel.id),
    listServices(hotel.id, false),
    hotelStaffCode(hotel.id),
  ])

  return (
    <AdminThemeShell
      title={hotel.name}
      description={`/${hotel.slug} · ${rooms.length} номеров · панель стойки: /hotel-desk/${hotel.slug}`}
      back={{ href: '/admin/hotels', label: 'Отели' }}
    >
      <HotelEditor
        hotelId={hotel.id}
        slug={hotel.slug}
        rooms={rooms}
        services={services}
        staffCode={staffCode ?? ''}
      />
    </AdminThemeShell>
  )
}
