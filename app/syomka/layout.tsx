import { RootShell, rootMetadata, rootViewport } from '../_root/shell'

// Root layout для закрытой страницы съёмки (русский интерфейс, вне языковых разделов).
// Почему нет общего app/layout.tsx — см. app/_root/shell.tsx.
export const metadata = rootMetadata
export const viewport = rootViewport

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ru">{children}</RootShell>
}
