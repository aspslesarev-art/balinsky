// Shared rental-detail renderer for /ru/arenda/o/[slug] and /en/rental/o/[slug].

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BedDouble, MapPin, MessageCircle, Send, Tag } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PhotoGalleryHero } from '@/components/PhotoGalleryHero'
import { PriceDisplay } from '@/components/PriceDisplay'
import { loadRentalBySlug } from '@/lib/rental'
import { botLink } from '@/lib/bot-link'
import { PageViewTracker } from '@/components/PageViewTracker'
import type { Lang } from '@/lib/i18n'

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

// The Airtable "Контакт Телеграм" field is used loosely: most rows are full
// https://t.me/... URLs, some are WhatsApp wa.me URLs, and some may be a bare
// @username. Normalise into a clickable link + label.
function parseContact(raw: string): { href: string; kind: 'telegram' | 'whatsapp' | 'other' } | null {
  const v = raw.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v)
      const host = u.hostname.replace(/^www\./, '').toLowerCase()
      if (host === 't.me' || host.endsWith('.t.me') || host === 'telegram.me') return { href: v, kind: 'telegram' }
      if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'whatsapp.com') return { href: v, kind: 'whatsapp' }
      return { href: v, kind: 'other' }
    } catch {
      return null
    }
  }
  // Bare @handle or handle — assume Telegram
  const handle = v.replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '')
  if (!handle) return null
  return { href: `https://t.me/${handle}`, kind: 'telegram' }
}

export async function generateRentalDetailMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const r = await loadRentalBySlug(slug, lang)
  if (!r) return { robots: { index: false, follow: false } }
  const c = COPY[lang]
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
  const c = COPY[lang]

  const rawContact = r.telegram ? parseContact(r.telegram) : null
  // TG-flavoured contacts route through @BalinskyBot first; the bot then
  // forwards the user to the actual handle stored on the listing.
  const contact = rawContact?.kind === 'telegram'
    ? { href: botLink('rental', r.id), kind: 'telegram' as const }
    : rawContact
  const contactLabel = contact?.kind === 'whatsapp' ? c.contactWa
    : contact?.kind === 'telegram' ? c.contactTg
    : c.contactOther
  const ContactIcon = contact?.kind === 'whatsapp' ? MessageCircle : Send

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

        {contact && (
          <section className="mb-10">
            <a
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium no-underline transition-colors"
            >
              <ContactIcon size={16} /> {contactLabel}
            </a>
          </section>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
