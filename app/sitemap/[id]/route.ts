import { getSitemapEntries, listSitemapIds, serializeUrlset } from '@/lib/sitemap-data'

// Child sitemaps at /sitemap/<id>.xml (e.g. /sitemap/villy.xml,
// /sitemap/zhilye-kompleksy.xml, sharded /sitemap/villy-2.xml). The index
// at /sitemap.xml lists them. See lib/sitemap-data.ts.
export const revalidate = 3600

export async function generateStaticParams() {
  const ids = await listSitemapIds()
  return ids.map(id => ({ id: `${id}.xml` }))
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const key = id.endsWith('.xml') ? id.slice(0, -4) : id
  const entries = await getSitemapEntries(key)
  if (!entries) return new Response('Not Found', { status: 404 })
  return new Response(serializeUrlset(entries), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
