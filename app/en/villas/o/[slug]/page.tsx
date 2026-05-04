// English-language villa detail page (pilot).
//
// Shares the data layer with /ru/villy/o/[slug] — same Supabase row,
// same photo manifest, same slug. Anything pulled from Airtable is
// resolved through `tField('en', ...)` so:
//   - if `<Field> EN` has a value, we render it
//   - if it's empty, we render the literal "<Field> EN" placeholder
//     so the editor can spot the missing column at a glance
//
// UI labels (breadcrumbs, section titles, "Beds", etc.) are static
// English strings here. They'll move into a small dictionary later
// once the second EN route lands.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { BedDouble, Square, Trees, Calendar, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { tField, t } from '@/lib/i18n'

export const revalidate = 3600
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ slug: string }>
type Row = { airtable_id: string; data: Record<string, unknown> }

function firstString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (Array.isArray(v)) {
    for (const x of v) { const s = firstString(x); if (s) return s }
    return null
  }
  if (typeof v === 'object' && 'value' in (v as object)) return firstString((v as { value: unknown }).value)
  return null
}
function numberOrNull(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = firstString(v); if (!s) return null
  const n = Number(s.replace(/\s+/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const _loadVillaIndex = unstable_cache(
  async () => {
    const { data } = await sb.from('raw_villas').select('airtable_id, data').limit(5000)
    const out: { id: string; slug: string }[] = []
    for (const r of (data ?? []) as Row[]) {
      const slug = firstString(r.data['SEO:Slug']); if (!slug) continue
      out.push({ id: r.airtable_id, slug })
    }
    return out
  },
  ['en-villa-index'], { revalidate: 600 },
)

async function loadVillaBySlug(slug: string): Promise<Row | null> {
  const idx = await _loadVillaIndex()
  const entry = idx.find(e => e.slug === slug)
  if (!entry) return null
  const { data } = await sb.from('raw_villas').select('airtable_id, data').eq('airtable_id', entry.id).maybeSingle()
  return (data as Row | null) ?? null
}

async function _loadManifest(): Promise<Record<string, string[]>> {
  try {
    const r = await fetch(PHOTO_MANIFEST_URL, { next: { revalidate: 600 } })
    if (!r.ok) return {}
    return await r.json()
  } catch { return {} }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const v = await loadVillaBySlug(slug)
  if (!v) return { robots: { index: false } }
  const d = v.data
  const title = tField(d, 'SEO:Title', 'en') ?? tField(d, 'ИИ Имя', 'en') ?? slug
  const description = tField(d, 'SEO:Description', 'en') ?? tField(d, 'SEO Text', 'en') ?? title
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/villas/o/${slug}`,
      languages: {
        ru: `${SITE_URL}/ru/villy/o/${slug}`,
        en: `${SITE_URL}/en/villas/o/${slug}`,
      },
    },
  }
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const v = await loadVillaBySlug(slug)
  if (!v) notFound()

  const d = v.data
  const manifest = await _loadManifest()

  const title       = tField(d, 'ИИ Имя', 'en') ?? tField(d, 'SEO:Title', 'en') ?? slug
  const description = tField(d, 'SEO Text', 'en') ?? tField(d, 'Notes', 'en')
  const post        = tField(d, 'Post Text Clean', 'en') ?? tField(d, 'Post Text', 'en')
  const priceBreakdown = tField(d, 'Разбивка по цене', 'en')

  // Numeric / structural fields don't need translation.
  const photos   = (manifest[v.airtable_id] ?? []).slice(0, 12)
  const district = firstString(d['Location 2']) ?? firstString(d['Location'])
  const bedrooms = numberOrNull(d['Комнаты'])
  const area     = numberOrNull(d['Площадь'])
  const land     = numberOrNull(d['Земля'])
  const year     = firstString(d['Year of completion'])
  const priceUsd = numberOrNull(d['price'] ?? d['Цена'])

  const facts = [
    bedrooms != null && { Icon: BedDouble, label: t('facts.bedrooms', 'en'), value: String(bedrooms) },
    area     != null && { Icon: Square,    label: t('facts.area',     'en'), value: `${area} m²` },
    land     != null && { Icon: Trees,     label: t('facts.land',     'en'), value: `${land} m²` },
    year             && { Icon: Calendar,  label: t('facts.year',     'en'), value: year },
    district         && { Icon: MapPin,    label: t('facts.district', 'en'), value: district },
  ].filter(Boolean) as { Icon: typeof BedDouble; label: string; value: string }[]

  // Hreflang JSON-LD partner — keeps Google's bilingual indexing happy
  // alongside the metadata.alternates.languages map above.
  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    url: `${SITE_URL}/en/villas/o/${slug}`,
    category: 'Villa',
    description: description ?? title,
    image: photos.slice(0, 5),
  }
  if (priceUsd != null) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Math.round(priceUsd),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/en/villas/o/${slug}`,
    }
  }

  return (
    <>
      <Header active="villy" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: t('breadcrumbs.home',   'en'), href: '/en' },
          { label: t('breadcrumbs.villas', 'en'), href: '/en/villas' },
          { label: title },
        ]} />

        <section className="mb-6 mt-2">
          <PhotoGalleryHero photos={photos} alt={title} />
        </section>

        <section className="mb-10">
          <div className="text-[13px] text-[var(--color-text-muted)] mb-2">
            <Link href="/en/villas" className="hover:text-[var(--color-text)]">{t('breadcrumbs.villas', 'en')}</Link>
            {district && <> · {district}</>}
          </div>
          <h1 className="text-[26px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-3">
            {title}
          </h1>
          {priceUsd != null && (
            <div className="text-[24px] md:text-[28px] font-semibold text-[#111827] mb-4">
              ${Math.round(priceUsd).toLocaleString('en-US')}
            </div>
          )}

          <ul className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {facts.map(f => (
              <li key={f.label} className="rounded-xl border border-[var(--color-border)] px-3 py-2.5 bg-white">
                <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-[12px] mb-0.5">
                  <f.Icon size={14} strokeWidth={1.6} />
                  {f.label}
                </div>
                <div className="text-[14px] font-medium text-[#111827]">{f.value}</div>
              </li>
            ))}
          </ul>

          {description && (
            <div className="prose prose-sm max-w-none text-[15px] leading-[1.7] text-[#1A1F1C] whitespace-pre-line mb-5">
              {description}
            </div>
          )}

          {post && post !== description && (
            <div className="prose prose-sm max-w-none text-[15px] leading-[1.7] text-[var(--color-text)] whitespace-pre-line mb-5">
              {post}
            </div>
          )}

          {priceBreakdown && (
            <div className="rounded-xl border border-[var(--color-border)] p-4 bg-[var(--color-search-bg)] mb-5">
              <div className="text-[13px] text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wide">
                {t('sections.priceBreakdown', 'en')}
              </div>
              <div className="text-[14px] whitespace-pre-line text-[#1A1F1C]">{priceBreakdown}</div>
            </div>
          )}
        </section>

        {/* RU-link signal so visitors who'd rather read Russian can switch
            without using the header. Mirrors the alternates metadata. */}
        <p className="text-[13px] text-[var(--color-text-muted)] mb-10">
          Russian version:{' '}
          <Link href={`/ru/villy/o/${slug}`} className="underline hover:text-[#1A1F1C]">
            balinsky.info/ru/villy/o/{slug}
          </Link>
        </p>
      </PageContainer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
    </>
  )
}
