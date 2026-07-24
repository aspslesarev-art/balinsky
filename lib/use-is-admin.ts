'use client'

import { useEffect, useState } from 'react'

// Client-side "am I a logged-in admin?" check. The admin_session cookie is
// httpOnly (unreadable from JS), so the browser asks the server via
// /api/admin/whoami. Shared by the on-page editing overlays (InlineEditor,
// FullRecordEditor) so the check lives in one place — and one place caches it.
//
// The result is memoised per page session in a module-scoped promise, so
// several overlays mounting at once make a single request, not one each.

let cached: Promise<boolean> | null = null

function fetchIsAdmin(): Promise<boolean> {
  if (!cached) {
    cached = fetch('/api/admin/whoami', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : { admin: false }))
      .then((j: { admin?: boolean }) => !!j.admin)
      .catch(() => false)
  }
  return cached
}

export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    let alive = true
    fetchIsAdmin().then(v => { if (alive) setAdmin(v) })
    return () => { alive = false }
  }, [])
  return admin
}
