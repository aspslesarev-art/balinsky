import { AdBannerSlot } from '@/components/AdBannerSlot'

// Wrapping every /ru page so the ad banner sits above the footer site-wide
// without touching individual page files. Admin stays untouched because
// it lives under /admin, not /ru.
export default function RuLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdBannerSlot />
    </>
  )
}
