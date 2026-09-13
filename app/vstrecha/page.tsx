import { BookingPage, bookingMetadata } from '@/components/meetings/BookingPage'

export const metadata = bookingMetadata('ru')

export default function Page() {
  return <BookingPage lang="ru" />
}
