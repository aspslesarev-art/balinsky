import type { ReactNode } from 'react'

// Single source of truth for the catalog/map content container width.
// Any page that should align with /ru/apartamenty/karta must use this.
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="max-w-[1280px] mx-auto px-6 min-w-0 w-full">
      {children}
    </main>
  )
}
