import { RootShell, rootMetadata, rootViewport } from '../_root/shell'

// Root layout for /zh: <html lang> comes out right in the prerendered HTML.
// See app/_root/shell.tsx for why there is no single app/layout.tsx.
export const metadata = rootMetadata
export const viewport = rootViewport

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell lang="zh">
      {children}
    </RootShell>
  )
}
