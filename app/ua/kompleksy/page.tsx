// Bare catalog URL — ISR-cached. Any URL with filter parameters
// (?district=…) is rewritten by middleware.ts to ./q, the dynamic
// version of this same page; reading searchParams here would make
// every visit a fresh server render (Cache-Control: no-store).
import Filtered, { generateMetadata as filteredMetadata } from './q/page'

export const revalidate = 3600

const NO_FILTERS = Promise.resolve({})

export function generateMetadata() {
  return filteredMetadata({ searchParams: NO_FILTERS })
}

export default function Page() {
  return <Filtered searchParams={NO_FILTERS} />
}
