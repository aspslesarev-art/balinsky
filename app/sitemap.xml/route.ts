import { listSitemapIds, serializeIndex } from '@/lib/sitemap-data'

// Sitemap *index* at /sitemap.xml — the single URL to submit to Google
// Search Console and Яндекс.Вебмастер. Points crawlers at every child
// sitemap (/sitemap/<id>.xml). See lib/sitemap-data.ts for why this is a
// hand-rolled route handler rather than Next's metadata convention.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const revalidate = 3600

export async function GET() {
  const ids = await listSitemapIds()
  return new Response(serializeIndex(ids, SITE_URL), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
