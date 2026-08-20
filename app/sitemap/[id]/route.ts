import {
  getSitemapEntries,
  listSitemapIds,
  listSitemapIndexEntries,
  serializeIndex,
  serializeUrlset,
} from '@/lib/sitemap-data'

// Child sitemaps at /sitemap/<id>.xml (e.g. /sitemap/villy.xml,
// /sitemap/zhilye-kompleksy.xml, sharded /sitemap/villy-2.xml), plus the
// index at /sitemap/index.xml. The index has a twin at /sitemap.xml, but
// Google never fetched that one — the GSC record sat unread for days while
// every child here got crawled on schedule — so the index is also served
// from this handler, on the path shape Googlebot demonstrably picks up.
// See lib/sitemap-data.ts.
export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const XML_HEADERS = {
  'Content-Type': 'application/xml',
  'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
}

export async function generateStaticParams() {
  const ids = await listSitemapIds()
  return [{ id: 'index.xml' }, ...ids.map(id => ({ id: `${id}.xml` }))]
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const key = id.endsWith('.xml') ? id.slice(0, -4) : id
  // 'index' is not a category, so it can never collide with a child id.
  if (key === 'index') {
    const children = await listSitemapIndexEntries()
    return new Response(serializeIndex(children, SITE_URL), { headers: XML_HEADERS })
  }
  const entries = await getSitemapEntries(key)
  if (!entries) return new Response('Not Found', { status: 404 })
  return new Response(serializeUrlset(entries), { headers: XML_HEADERS })
}
