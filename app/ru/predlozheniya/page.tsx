import type { Metadata } from 'next'
import Link from 'next/link'
import { listByStatus } from '@/lib/agent-listings/store'
import { listingFacts } from '@/lib/agent-listings/facts'

// Раздел с объектами, которые добавили агенты и которые прошли проверку.
// Отдельно от основного каталога: там выверенные данные застройщиков, здесь —
// предложения агентов, и смешивать их в одном списке значит терять эту разницу.

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Предложения агентов — недвижимость Бали | Balinsky',
  description: 'Объекты Бали, которые агенты Balinsky ведут напрямую: виллы и апартаменты с ценой и контактом агента.',
}

export default async function OffersPage() {
  const listings = await listByStatus('approved', 200)

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] sm:text-[36px]">
        Предложения агентов
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
        Объекты, которые агенты ведут напрямую. По каждому — контакт того, кто им занимается.
      </p>

      {listings.length === 0 ? (
        <p className="mt-10 text-[15px] text-[var(--color-text-muted)]">
          Пока пусто. Первые объекты появятся здесь после проверки.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map(l => {
            const facts = listingFacts(l).slice(0, 3)
            return (
              <Link
                key={l.id}
                href={`/ru/predlozheniya/o/${l.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition-shadow hover:shadow-lg"
              >
                {l.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photos[0]} alt={l.title} loading="lazy" className="h-48 w-full object-cover" />
                ) : (
                  <div className="h-48 w-full bg-[var(--color-surface,#f3f4f6)]" />
                )}
                <div className="p-4">
                  <p className="line-clamp-2 text-[15px] font-medium text-[#111827]">{l.title}</p>
                  <p className="mt-1.5 text-[17px] font-semibold text-[var(--color-primary)]">
                    ${l.priceUsd.toLocaleString('en-US')}
                  </p>
                  {facts.length > 0 && (
                    <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
                      {facts.map(f => f.value).join(' · ')}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
