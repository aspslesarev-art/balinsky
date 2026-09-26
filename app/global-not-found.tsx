import { RootShell, rootMetadata } from './_root/shell'
import { NotFoundView, notFoundMetadata } from '@/components/NotFoundView'

// URLs that match no root layout at all (e.g. /xyz). Locale sections have
// their own not-found.tsx in their language.
export const metadata = { ...rootMetadata, ...notFoundMetadata }

export default function GlobalNotFound() {
  return (
    <RootShell lang="en">
      <NotFoundView lang="en" />
    </RootShell>
  )
}
