import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Disallow non-canonical query-param URLs (already noindex via meta,
        // but explicit Disallow saves crawl budget). Map view + API + warmup
        // are utility routes — keep crawlers out.
        disallow: [
          '/api/',
          '/ru/*/karta',
          // any catalog page hit with ?q= or ?developer= etc is non-canonical
          // (we redirect canonical filters to clean URLs already)
          '/*?',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
