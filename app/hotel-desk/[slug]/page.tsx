import { redirect } from 'next/navigation'
import { requireDesk } from '@/lib/hotel/auth'
import { Desk } from './_desk'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Стойка · Balinsky Hotels' }

export default async function DeskPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hotel = await requireDesk(slug)
  if (!hotel) redirect('/hotel-desk')

  return <Desk slug={hotel.slug} hotelName={hotel.name} />
}
