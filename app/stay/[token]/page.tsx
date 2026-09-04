import { notFound } from 'next/navigation'
import { resolveRoomByToken } from '@/lib/hotel/db'
import { GuestRoom } from './_room'

export const dynamic = 'force-dynamic'

// Страница гостя за QR-кодом: адрес знает только тот, кто в номере, и
// индексировать её незачем — в robots.ts /stay закрыт целиком.
export const metadata = { robots: { index: false, follow: false } }

export default async function StayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await resolveRoomByToken(token)
  if (!found) notFound()

  return (
    <GuestRoom
      token={token}
      hotelName={found.hotel.name}
      roomLabel={found.room.label}
      defaultLang={found.hotel.lang}
    />
  )
}
