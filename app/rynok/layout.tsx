import { RootShell, rootMetadata, rootViewport } from '../_root/shell'

// Root layout for /rynok (not a locale section, Russian UI).
// See app/_root/shell.tsx for why there is no single app/layout.tsx.
export const metadata = rootMetadata
export const viewport = rootViewport

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell lang="ru">
      {children}
    </RootShell>
  )
}
