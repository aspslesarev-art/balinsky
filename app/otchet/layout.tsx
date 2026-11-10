import { RootShell, rootMetadata, rootViewport } from '../_root/shell'

// Root layout for /otchet — отчёт по работе с агентами по секретной ссылке (русский интерфейс).
// See app/_root/shell.tsx for why there is no single app/layout.tsx.
export const metadata = rootMetadata
export const viewport = rootViewport

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ru">{children}</RootShell>
}
