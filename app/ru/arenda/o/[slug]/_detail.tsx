// Shared rental-detail renderer for /ru/arenda/o/[slug] and /en/rental/o/[slug].

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BedDouble, MapPin, Tag } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { PriceDisplay } from '@/components/PriceDisplay'
import { loadRentalBySlug } from '@/lib/rental'
import { LeadButton } from '@/components/LeadButton'
import { PageViewTracker } from '@/components/PageViewTracker'
import { pickCopy, type Lang } from '@/lib/i18n'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const COPY = {
  ru: {
    home: 'Главная', rental: 'Аренда', bali: 'Бали',
    descHeading: 'Описание', perMonth: '/ мес',
    contactTg: 'Написать в Telegram', contactWa: 'Написать в WhatsApp', contactOther: 'Связаться',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Объект'} в аренду на Бали${location ? `, ${location}` : ''}. ${price} / мес.`,
    title: (t: string, p: string) => `${t} — ${p}/мес | Balinsky`,
  },
  en: {
    home: 'Home', rental: 'Long-term rental', bali: 'Bali',
    descHeading: 'Description', perMonth: '/ mo',
    contactTg: 'Message on Telegram', contactWa: 'Message on WhatsApp', contactOther: 'Contact',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Property'} for rent in Bali${location ? `, ${location}` : ''}. ${price} / mo.`,
    title: (t: string, p: string) => `${t} — ${p}/mo | Balinsky`,
  },
} as const

function fmtUsd(n: number): string { return '$' + Math.round(n).toLocaleString('en-US') }

export async function generateRentalDetailMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const r = await loadRentalBySlug(slug, lang)
  if (!r) return { robots: { index: false, follow: false } }
  const c = pickCopy(COPY, lang)
  const desc = r.notes?.slice(0, 160) ?? c.metaFallback(r.type ?? null, r.location ?? null, fmtUsd(r.priceMonthUsd))
  const ruPath = `/ru/arenda/o/${r.slug}`
  const enPath = `/en/rental/o/${r.slug}`
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: c.title(r.title, fmtUsd(r.priceMonthUsd)),
    description: desc,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: {
      title: r.title,
      description: desc,
      images: r.photos.length > 0 ? r.photos.slice(0, 4) : undefined,
      type: 'article',
    },
  }
}

export async function RentalDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const r = await loadRentalBySlug(slug, lang)
  if (!r) notFound()
  const c = pickCopy(COPY, lang)

  const rentalUrl = `${SITE_URL}${lang === 'en' ? '/en/rental/o/' : '/ru/arenda/o/'}${r.slug}`
  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: r.title,
    url: rentalUrl,
    image: r.photos.slice(0, 5),
    // Google's Product validator flags missing description; fall back to a
    // generated "<bedrooms>-BR rental in <location>, Bali" line so the
    // field is never empty.
    description: (r.notes?.trim() || (lang === 'en'
      ? `${r.bedrooms ? r.bedrooms + '-bedroom ' : ''}rental${r.location ? ` in ${r.location}` : ''}, Bali, Indonesia`
      : `${r.bedrooms ? r.bedrooms + '-комнатная ' : ''}аренда${r.location ? ` в ${r.location}` : ''} на Бали, Индонезия`)).slice(0, 500),
    // Brand → generic "Balinsky" so the GTIN/brand validator stops flagging.
    brand: { '@type': 'Brand', name: 'Balinsky' },
    offers: {
      '@type': 'Offer',
      price: Math.round(r.priceMonthUsd),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: rentalUrl,
      // Rentals don't ship and don't return — explicit declarations that
      // say so satisfy Google's Merchant validator without faking
      // e-commerce semantics.
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'USD' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ID' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'ID',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
      },
    },
  }

  return (
    <>
      <Header active="arenda" />
      <PageViewTracker kind="rental" slug={r.slug} title={r.title} airtableId={r.id} lang={lang} />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: lang === 'en' ? '/en' : '/ru' },
          { label: c.rental, href: lang === 'en' ? '/en/rental' : '/ru/arenda' },
          { label: r.title },
        ]} />

        {r.photos.length > 0 && (
          <section className="mb-6 mt-2">
            <PhotoGalleryHero
              photos={r.photos}
              alt={r.title}
              wishlistItem={{
                kind: 'rental', slug: r.slug, title: r.title,
                photo: r.photos[0] ?? null,
                priceUsd: r.priceMonthUsd,
                district: r.location ?? null,
                bedrooms: r.bedrooms ?? null,
              }}
            />
          </section>
        )}

        <section className="mb-10">
          <h1 className="text-[26px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-3">
            {r.title}
          </h1>
          <div className="text-[15px] text-[var(--color-text-muted)] flex items-center flex-wrap gap-x-5 gap-y-1 mb-4">
            {r.type && <span>{r.type}</span>}
            {r.bedrooms != null && <span className="inline-flex items-center gap-1.5"><BedDouble size={14} /> {r.bedrooms} BR</span>}
            {r.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {r.location}, {c.bali}</span>}
            {r.priceSegment && <span className="inline-flex items-center gap-1.5"><Tag size={14} /> {r.priceSegment}</span>}
          </div>
          <PriceDisplay usd={r.priceMonthUsd} suffix={c.perMonth} />
        </section>

        {r.notes && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-3">
              {c.descHeading}
            </h2>
            <div className="prose-balinsky max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
              {r.notes}
            </div>
          </section>
        )}

        <section className="mb-10">
          <LeadButton
            label={lang === 'en' ? 'Leave a request' : 'Оставить заявку'}
            lang={lang}
            context={{ listingKind: 'rental', listingSlug: r.slug, source: 'rental' }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium transition-colors"
          />
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
