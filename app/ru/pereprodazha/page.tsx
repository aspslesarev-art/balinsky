import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { VillaCard } from '@/components/VillaCard'
import { ApartmentCard } from '@/components/ApartmentCard'
import { loadResaleUnits, type ResaleUnit } from '@/lib/resale'

// Каталог вторичного рынка: юниты каталога с «Тип сделки» = Перепродажа /
// Вторичка плюс объекты, которые агенты добавили сами. Карточки те же самые,
// что в остальных каталогах — с бейджем «Перепродажа» и контактом продавца.
//
// Фильтры сделаны ссылками с query-параметрами, как в каталоге вилл: раздел
// должен оставаться работоспособным и индексируемым без клиентского JS.

export const revalidate = 300

const SITE_URL = 'https://balinsky.info'

export const metadata: Metadata = {
  title: 'Перепродажа недвижимости на Бали — виллы и апартаменты вторички | Balinsky',
  description:
    'Вторичный рынок Бали: виллы и апартаменты от собственников и агентов напрямую. Цена, характеристики и прямой контакт по каждому объекту.',
  alternates: { canonical: `${SITE_URL}/ru/pereprodazha` },
}

type SP = Promise<Record<string, string | undefined>>

const CHIP = 'rounded-full border px-4 py-2 text-[14px] transition-colors no-underline'
const CHIP_ON = 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
const CHIP_OFF = 'border-[var(--color-border)] bg-white text-[#111827] hover:border-[var(--color-primary)]'

function hrefWith(current: Record<string, string | undefined>, patch: Record<string, string | null>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...current, ...patch })) {
    if (v) params.set(k, v)
  }
  const qs = params.toString()
  return qs ? `/ru/pereprodazha?${qs}` : '/ru/pereprodazha'
}

function sortUnits(units: ResaleUnit[], sort: string | undefined): ResaleUnit[] {
  if (sort === 'cheap') return [...units].sort((a, b) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity))
  if (sort === 'expensive') return [...units].sort((a, b) => (b.priceUsd ?? -Infinity) - (a.priceUsd ?? -Infinity))
  return units
}

export default async function ResalePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const all = await loadResaleUnits()

  const kind = sp.tip === 'villy' ? 'villa' : sp.tip === 'apartamenty' ? 'apartment' : null
  const district = sp.rajon ?? null

  const filtered = sortUnits(
    all.filter(u => (!kind || u.kind === kind) && (!district || u.district === district)),
    sp.sort,
  )

  const counts = {
    all: all.length,
    villa: all.filter(u => u.kind === 'villa').length,
    apartment: all.filter(u => u.kind === 'apartment').length,
  }

  const districts = [...new Set(all.map(u => u.district).filter((d): d is string => !!d))]
    .sort((a, b) => a.localeCompare(b, 'ru'))

  return (
    <>
      <Header />

      <PageContainer>
        <div className="flex flex-wrap items-start justify-between gap-4 pt-8">
          <div>
            <h1 className="mb-2 text-[28px] font-semibold tracking-tight text-[#111827] md:text-[36px]">
              Перепродажа
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
              Вторичный рынок Бали: виллы и апартаменты от собственников и агентов напрямую.
              По каждому объекту — прямой контакт продавца.
            </p>
          </div>
          <Link
            href="/kabinet/objekty/novyj"
            className="rounded-xl bg-[var(--color-primary)] px-5 py-3 text-[15px] font-semibold text-white no-underline"
          >
            Добавить мой объект
          </Link>
        </div>

        <div className="mt-6 text-[14px] text-[var(--color-text-muted)]">
          {filtered.length} объектов
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {([['', 'Все объекты', counts.all],
             ['villy', 'Виллы', counts.villa],
             ['apartamenty', 'Апартаменты', counts.apartment]] as const).map(([value, label, count]) => {
            const on = (sp.tip ?? '') === value
            return (
              <Link key={label} href={hrefWith(sp, { tip: value || null })} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
                {label}
                <span className={on ? 'ml-1.5 opacity-80' : 'ml-1.5 text-[var(--color-text-muted)]'}>{count}</span>
              </Link>
            )
          })}
        </div>

        {districts.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={hrefWith(sp, { rajon: null })} className={`${CHIP} ${!district ? CHIP_ON : CHIP_OFF}`}>
              Все районы
            </Link>
            {districts.map(d => (
              <Link key={d} href={hrefWith(sp, { rajon: d })} className={`${CHIP} ${district === d ? CHIP_ON : CHIP_OFF}`}>
                {d}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {([['', 'Сначала новые'], ['cheap', 'Сначала дешевле'], ['expensive', 'Сначала дороже']] as const).map(
            ([value, label]) => {
              const on = (sp.sort ?? '') === value
              return (
                <Link key={label} href={hrefWith(sp, { sort: value || null })} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
                  {label}
                </Link>
              )
            },
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-text-muted)]">
            {all.length === 0
              ? 'Пока в разделе нет объектов.'
              : 'По этим фильтрам ничего нет — попробуйте снять часть условий.'}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {filtered.map(u =>
              u.kind === 'villa'
                ? <VillaCard key={u.id} a={u} lang="ru" />
                : <ApartmentCard key={u.id} a={u} lang="ru" />,
            )}
          </div>
        )}

        <section className="mt-14 rounded-2xl border border-[var(--color-border)] bg-white p-6">
          <h2 className="text-[18px] font-semibold text-[#111827]">У вас есть объект на продажу?</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
            Вход через Telegram, без пароля. Выбираете комплекс и юнит — характеристики подтянутся
            из каталога, вам останется указать цену. На карточке будут ваши контакты.
          </p>
          <Link
            href="/kabinet/objekty/novyj"
            className="mt-4 inline-flex rounded-xl border border-[var(--color-primary)] px-5 py-2.5 text-[15px] font-semibold text-[var(--color-primary)] no-underline"
          >
            Добавить объект
          </Link>
        </section>

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
