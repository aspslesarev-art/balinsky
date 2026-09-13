import { BookingPage, bookingMetadata } from '@/components/meetings/BookingPage'

export const metadata = bookingMetadata('en')

export default function Page() {
  return <BookingPage lang="en" />
}
