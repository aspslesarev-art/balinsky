import { RootShell, rootMetadata, rootViewport } from '../_root/shell'

// Root layout for "/" alone — the page only redirects to /ru or /en.
export const metadata = rootMetadata
export const viewport = rootViewport

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>
}
