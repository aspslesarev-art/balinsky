import type { Metadata } from 'next'
import Link from 'next/link'
import { listByStatus } from '@/lib/agent-listings/store'
import { listingFacts } from '@/lib/agent-listings/facts'
import ResaleCatalog, { type ResaleCard } from './_catalog'

// Каталог перепродажи: виллы и апартаменты, которые агенты ведут напрямую.
// Отдельно от основного каталога — там первичка от застройщиков с выверенными
// данными, здесь вторичный рынок с ценой и контактом конкретного агента.
//
// Раздел русскоязычный: объекты сюда заводят агенты и пишут по-русски,
// поэтому английская витрина с русскими карточками была бы хуже, чем её
// отсутствие. Переключение языка на этом разделе уводит на /ru (middleware).

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Перепродажа недвижимости на Бали — виллы и апартаменты | Balinsky',
  description:
    'Вторичный рынок Бали: виллы и апартаменты от агентов напрямую. Цена, характеристики и контакт агента по каждому объекту.',
  alternates: { canonical: 'https://balinsky.info/ru/pereprodazha' },
}

export default async function ResalePage() {
  const listings = await listByStatus('approved', 300)

  const items: ResaleCard[] = listings.map(l => {
    const facts = listingFacts(l)
    const district = facts.find(f => f.label === 'Район')?.value ?? null
    return {
      slug: l.slug,
      title: l.title,
      kind: l.kind,
      priceUsd: l.priceUsd,
      photo: l.photos[0] ?? null,
      district,
      facts: facts.filter(f => f.label !== 'Район').slice(0, 3).map(f => f.value),
    }
  })

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111827] sm:text-[36px]">
            Перепродажа
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
            Виллы и апартаменты вторичного рынка Бали. По каждому объекту — цена и прямой контакт
            агента, который его ведёт.
          </p>
        </div>
        <Link
          href="/kabinet/objekty/novyj"
          className="rounded-xl bg-[var(--color-primary)] px-5 py-3 text-[15px] font-semibold text-white"
        >
          Добавить мой объект
        </Link>
      </div>

      <ResaleCatalog items={items} />

      <section className="mt-14 rounded-2xl border border-[var(--color-border)] bg-white p-6">
        <h2 className="text-[18px] font-semibold text-[#111827]">Вы агент и хотите разместить объект?</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          Вход через Telegram, без пароля. Выбираете комплекс и юнит — характеристики подтянутся из
          каталога, вам останется указать цену. На карточке будут ваши контакты.
        </p>
        <Link
          href="/kabinet/objekty/novyj"
          className="mt-4 inline-flex rounded-xl border border-[var(--color-primary)] px-5 py-2.5 text-[15px] font-semibold text-[var(--color-primary)]"
        >
          Добавить объект
        </Link>
      </section>
    </main>
  )
}
