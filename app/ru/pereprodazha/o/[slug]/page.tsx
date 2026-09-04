import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { getListingBySlug, getAgentContact } from '@/lib/agent-listings/store'
import { unitSlug } from '@/lib/agent-listings/catalog'
import { listingFacts } from '@/lib/agent-listings/facts'

// Страница объекта, добавленного агентом.
//
// Два правила, которые держат SEO сайта в порядке:
//   1. Пока объект не одобрен — noindex. Ссылка работает (агенту есть что
//      послать клиенту), но в индекс ничего не попадает.
//   2. Если объект списан с юнита каталога — canonical на карточку каталога.
//      Иначе два почти одинаковых URL конкурируют друг с другом, и более
//      слабый (страница агента) утягивает показы у оригинала.

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const SECTION: Record<string, string> = { villa: 'villy', apartment: 'apartamenty' }

async function canonicalFor(listing: Awaited<ReturnType<typeof getListingBySlug>>): Promise<string | null> {
  if (!listing?.baseUnitId) return null
  const slug = await unitSlug(listing.kind, listing.baseUnitId)
  return slug ? `${SITE_URL}/ru/${SECTION[listing.kind]}/o/${slug}` : null
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) return { title: 'Объект не найден | Balinsky' }

  const canonical = await canonicalFor(listing)
  const indexable = listing.status === 'approved'

  return {
    title: `${listing.title} — $${listing.priceUsd.toLocaleString('en-US')} | Balinsky`,
    description: listing.comment?.slice(0, 300) ?? `Предложение агента: ${listing.title}.`,
    robots: indexable ? undefined : { index: false, follow: true },
    alternates: { canonical: canonical ?? `${SITE_URL}/ru/pereprodazha/o/${listing.slug}` },
  }
}

export default async function AgentListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing || listing.status === 'archived') notFound()

  const [contact, canonical] = await Promise.all([
    getAgentContact(listing.authorId),
    canonicalFor(listing),
  ])
  const facts = listingFacts(listing)

  return (
    <>
      <Header />
      <PageContainer>
      <div className="py-8">
      {listing.status !== 'approved' && (
        <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          {listing.status === 'rejected'
            ? 'Объект отклонён модерацией и не показывается в каталоге.'
            : 'Объект на проверке. Ссылка уже работает — можно отправлять клиенту, — но в каталог и поиск он попадёт после одобрения.'}
        </p>
      )}

      <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#111827] sm:text-[34px]">
        {listing.title}
      </h1>
      <p className="mt-2 text-[22px] font-semibold text-[var(--color-primary)] sm:text-[26px]">
        ${listing.priceUsd.toLocaleString('en-US')}
      </p>

      {listing.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {listing.photos.slice(0, 8).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`${listing.title} — фото ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      )}

      {facts.length > 0 && (
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {facts.map(f => (
            <div key={f.label}>
              <dt className="text-[13px] text-[var(--color-text-muted)]">{f.label}</dt>
              <dd className="mt-0.5 text-[15px] font-medium text-[#111827]">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {listing.comment && (
        <section className="mt-8">
          <h2 className="text-[18px] font-semibold text-[#111827]">Комментарий агента</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-[#374151]">
            {listing.comment}
          </p>
        </section>
      )}

      <section className="mt-10 rounded-2xl border border-[var(--color-border)] bg-white p-6">
        <h2 className="text-[18px] font-semibold text-[#111827]">Контакты</h2>
        {contact ? (
          <div className="mt-3 space-y-1.5 text-[15px] text-[#111827]">
            <p className="font-medium">{contact.name}</p>
            {contact.agency && <p className="text-[var(--color-text-muted)]">{contact.agency}</p>}
            {contact.phone && (
              <p><a className="underline" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>{contact.phone}</a></p>
            )}
            {contact.username && (
              <p>
                <a className="underline" href={`https://t.me/${contact.username}`} target="_blank" rel="noopener noreferrer">
                  @{contact.username}
                </a>
              </p>
            )}
            {contact.note && <p className="text-[14px] text-[var(--color-text-muted)]">{contact.note}</p>}
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-[var(--color-text-muted)]">Контакты агента уточняются.</p>
        )}
      </section>

      {canonical && (
        <p className="mt-6 text-[14px] text-[var(--color-text-muted)]">
          Этот юнит есть в каталоге Balinsky —{' '}
          <Link className="underline" href={canonical.replace(SITE_URL, '')}>
            открыть карточку со всей аналитикой
          </Link>
          .
        </p>
      )}
      </div>
      </PageContainer>
    </>
  )
}
