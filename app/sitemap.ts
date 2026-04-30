import type { MetadataRoute } from 'next'
import { listAllCanonicalPaths as listApartmentPaths } from '@/lib/seo-routes'
import { listAllCanonicalPaths as listComplexPaths } from '@/lib/complex-seo-routes'
import { listAllCanonicalPaths as listVillaPaths } from '@/lib/villa-seo-routes'
import { loadAllNews } from '@/lib/news'
import { loadAllPromo } from '@/lib/promo'
import { loadAllEvents } from '@/lib/events'
import { loadAllKnowledge } from '@/lib/knowledge'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Top-level pages
  const top: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/ru`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/ru/apartamenty`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ru/zhilye-kompleksy`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ru/villy`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ru/zastrojshhiki`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/ru/novosti`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/ru/akcii`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/ru/meropriyatiya`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/ru/znaniya`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ]

  // Filter-canonical pages
  const apartments = listApartmentPaths().map(path => ({
    url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7,
  }))
  const complexes = listComplexPaths().map(path => ({
    url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7,
  }))
  const villas = listVillaPaths().map(path => ({
    url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7,
  }))

  // Detail pages: news / promo / events / knowledge
  let news: MetadataRoute.Sitemap = []
  let promo: MetadataRoute.Sitemap = []
  let events: MetadataRoute.Sitemap = []
  let knowledge: MetadataRoute.Sitemap = []
  try {
    const [n, p, e, k] = await Promise.all([loadAllNews(), loadAllPromo(), loadAllEvents(), loadAllKnowledge()])
    news = n.map(x => ({
      url: `${SITE_URL}/ru/novosti/${x.slug}`,
      lastModified: x.date ? new Date(x.date) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
    promo = p.map(x => ({
      url: `${SITE_URL}/ru/akcii/${x.slug}`,
      lastModified: x.expiresAt ? new Date(x.expiresAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
    events = e.map(x => ({
      url: `${SITE_URL}/ru/meropriyatiya/${x.slug}`,
      lastModified: x.startsAt ? new Date(x.startsAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))
    knowledge = k.map(x => ({
      url: `${SITE_URL}/ru/znaniya/${x.slug}`,
      lastModified: x.createdTime ? new Date(x.createdTime) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  } catch {
    // If manifests are unavailable at build time, ship sitemap without those.
  }

  // Dedupe by URL (top-level pages may also be in section listings)
  const seen = new Set<string>()
  const all = [...top, ...apartments, ...complexes, ...villas, ...news, ...promo, ...events, ...knowledge]
  return all.filter(entry => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}
