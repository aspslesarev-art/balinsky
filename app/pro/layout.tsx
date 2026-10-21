import { RootShell, rootMetadata, rootViewport } from '../_root/shell'

// Root layout for /pro — вход в Pro-аналитику. По умолчанию английский
// (владелец 21.10.2026). См. app/_root/shell.tsx: общего app/layout.tsx нет.
export const metadata = rootMetadata
export const viewport = rootViewport

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell lang="en">
      {children}
    </RootShell>
  )
}
