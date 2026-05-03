import { loadEligibleBanners, pickBanner } from '@/lib/banners'
import { AdBanner } from './AdBanner'

// Server component — picks the active banner at render time so the
// banner is in SSR HTML (Google sees it, no client flash). Falls back
// to nothing if Airtable hasn't synced any banners yet.
export async function AdBannerSlot() {
  const eligible = await loadEligibleBanners()
  const banner = pickBanner(eligible)
  if (!banner) return null
  return <AdBanner banner={banner} />
}
