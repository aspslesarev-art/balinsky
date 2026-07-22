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
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

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
  id: {
    home: 'Beranda', rental: 'Sewa jangka panjang', bali: 'Bali',
    descHeading: 'Deskripsi', perMonth: '/ bln',
    contactTg: 'Kirim pesan di Telegram', contactWa: 'Kirim pesan di WhatsApp', contactOther: 'Hubungi',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Properti'} disewakan di Bali${location ? `, ${location}` : ''}. ${price} / bln.`,
    title: (t: string, p: string) => `${t} — ${p}/bln | Balinsky`,
  },
  fr: {
    home: 'Accueil', rental: 'Location longue durée', bali: 'Bali',
    descHeading: 'Description', perMonth: '/ mois',
    contactTg: 'Écrire sur Telegram', contactWa: 'Écrire sur WhatsApp', contactOther: 'Contacter',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Bien'} à louer à Bali${location ? `, ${location}` : ''}. ${price} / mois.`,
    title: (t: string, p: string) => `${t} — ${p}/mois | Balinsky`,
  },
  de: {
    home: 'Startseite', rental: 'Langzeitmiete', bali: 'Bali',
    descHeading: 'Beschreibung', perMonth: '/ Mon.',
    contactTg: 'Auf Telegram schreiben', contactWa: 'Auf WhatsApp schreiben', contactOther: 'Kontakt',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Immobilie'} zur Miete auf Bali${location ? `, ${location}` : ''}. ${price} / Mon.`,
    title: (t: string, p: string) => `${t} — ${p}/Mon. | Balinsky`,
  },
  zh: {
    home: '首页', rental: '长期租赁', bali: '巴厘岛',
    descHeading: '描述', perMonth: '/ 月',
    contactTg: '在 Telegram 上留言', contactWa: '在 WhatsApp 上留言', contactOther: '联系',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? '房产'}在巴厘岛出租${location ? `，${location}` : ''}。${price} / 月。`,
    title: (t: string, p: string) => `${t} — ${p}/月 | Balinsky`,
  },
  nl: {
    home: 'Home', rental: 'Langlopende verhuur', bali: 'Bali',
    descHeading: 'Beschrijving', perMonth: '/ mnd',
    contactTg: 'Bericht op Telegram', contactWa: 'Bericht op WhatsApp', contactOther: 'Contact',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Object'} te huur op Bali${location ? `, ${location}` : ''}. ${price} / mnd.`,
    title: (t: string, p: string) => `${t} — ${p}/mnd | Balinsky`,
  },
  ban: {
    home: 'Beranda', rental: 'Sewa jangka panjang', bali: 'Bali',
    descHeading: 'Deskripsi', perMonth: '/ bln',
    contactTg: 'Kirim pesan ring Telegram', contactWa: 'Kirim pesan ring WhatsApp', contactOther: 'Ngubungin',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Properti'} sane kasewaang ring Bali${location ? `, ${location}` : ''}. ${price} / bln.`,
    title: (t: string, p: string) => `${t} — ${p}/bln | Balinsky`,
  },
  pl: {
    home: 'Strona główna', rental: 'Wynajem długoterminowy', bali: 'Bali',
    descHeading: 'Opis', perMonth: '/ mies.',
    contactTg: 'Napisz na Telegramie', contactWa: 'Napisz na WhatsAppie', contactOther: 'Kontakt',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Nieruchomość'} do wynajęcia na Bali${location ? `, ${location}` : ''}. ${price} / mies.`,
    title: (t: string, p: string) => `${t} — ${p}/mies. | Balinsky`,
  },
  uk: {
    home: 'Головна', rental: 'Довгострокова оренда', bali: 'Балі',
    descHeading: 'Опис', perMonth: '/ міс',
    contactTg: 'Написати в Telegram', contactWa: 'Написати у WhatsApp', contactOther: 'Звʼязатися',
    metaFallback: (type: string | null, location: string | null, price: string) =>
      `${type ?? 'Обʼєкт'} в оренду на Балі${location ? `, ${location}` : ''}. ${price} / міс.`,
    title: (t: string, p: string) => `${t} — ${p}/міс | Balinsky`,
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
  const path = switchLangPath(ruPath, lang)
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

  const rentalUrl = `${SITE_URL}${switchLangPath(`/ru/arenda/o/${r.slug}`, lang)}`
  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: r.title,
    url: rentalUrl,
    image: r.photos.slice(0, 5),
    // Google's Product validator flags missing description; fall back to a
    // generated "<bedrooms>-BR rental in <location>, Bali" line so the
    // field is never empty.
    description: (r.notes?.trim() || (lang === 'ru'
      ? `${r.bedrooms ? r.bedrooms + '-комнатная ' : ''}аренда${r.location ? ` в ${r.location}` : ''} на Бали, Индонезия`
      : `${r.bedrooms ? r.bedrooms + '-bedroom ' : ''}rental${r.location ? ` in ${r.location}` : ''}, Bali, Indonesia`)).slice(0, 500),
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
          { label: c.home, href: switchLangPath('/ru', lang) },
          { label: c.rental, href: switchLangPath('/ru/arenda', lang) },
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
          <PriceDisplay usd={r.priceMonthUsd} suffix={c.perMonth} lang={lang} />
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
            label={pickCopy({ ru: 'Оставить заявку', en: 'Leave a request', id: 'Kirim permintaan', fr: 'Envoyer une demande', de: 'Anfrage senden', zh: '提交请求', nl: 'Aanvraag versturen', ban: 'Kirim panuunan', pl: 'Zostaw zgłoszenie', uk: 'Залишити заявку' }, lang)}
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
