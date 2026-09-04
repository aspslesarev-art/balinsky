'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

// Каталог перепродажи. Фильтрация клиентская: объектов здесь десятки, а не
// тысячи, и гонять запрос на сервер ради переключения «виллы/апартаменты»
// было бы медленнее, чем отфильтровать уже загруженный список.

export type ResaleCard = {
  slug: string
  title: string
  kind: 'villa' | 'apartment'
  priceUsd: number
  photo: string | null
  district: string | null
  facts: string[]
}

type Sort = 'cheap' | 'expensive' | 'new'

const KIND_LABEL: Record<string, string> = {
  all: 'Все объекты',
  villa: 'Виллы',
  apartment: 'Апартаменты',
}

const SORT_LABEL: Record<Sort, string> = {
  cheap: 'Сначала дешевле',
  expensive: 'Сначала дороже',
  new: 'Сначала новые',
}

const CHIP = 'rounded-full border px-4 py-2 text-[14px] transition-colors'
const CHIP_ON = 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
const CHIP_OFF = 'border-[var(--color-border)] bg-white text-[#111827] hover:border-[var(--color-primary)]'

export default function ResaleCatalog({ items }: { items: ResaleCard[] }) {
  const [kind, setKind] = useState<'all' | 'villa' | 'apartment'>('all')
  const [district, setDistrict] = useState('')
  const [sort, setSort] = useState<Sort>('new')

  const districts = useMemo(
    () => [...new Set(items.map(i => i.district).filter((d): d is string => !!d))].sort((a, b) => a.localeCompare(b, 'ru')),
    [items],
  )

  const shown = useMemo(() => {
    const filtered = items.filter(i =>
      (kind === 'all' || i.kind === kind) && (!district || i.district === district))
    // Порядок «новые» — тот, в котором пришли с сервера (там сортировка по дате).
    if (sort === 'new') return filtered
    return [...filtered].sort((a, b) =>
      sort === 'cheap' ? a.priceUsd - b.priceUsd : b.priceUsd - a.priceUsd)
  }, [items, kind, district, sort])

  const counts = useMemo(() => ({
    all: items.length,
    villa: items.filter(i => i.kind === 'villa').length,
    apartment: items.filter(i => i.kind === 'apartment').length,
  }), [items])

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {(['all', 'villa', 'apartment'] as const).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`${CHIP} ${kind === k ? CHIP_ON : CHIP_OFF}`}
          >
            {KIND_LABEL[k]}
            <span className={kind === k ? 'ml-1.5 opacity-80' : 'ml-1.5 text-[var(--color-text-muted)]'}>
              {counts[k]}
            </span>
          </button>
        ))}

        {districts.length > 1 && (
          <select
            value={district}
            onChange={e => setDistrict(e.target.value)}
            aria-label="Район"
            className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[14px] text-[#111827]"
          >
            <option value="">Все районы</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        <select
          value={sort}
          onChange={e => setSort(e.target.value as Sort)}
          aria-label="Сортировка"
          className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-[14px] text-[#111827]"
        >
          {(Object.keys(SORT_LABEL) as Sort[]).map(s => (
            <option key={s} value={s}>{SORT_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 text-[15px] text-[var(--color-text-muted)]">
          {items.length === 0
            ? 'Пока пусто. Первые объекты появятся здесь после проверки.'
            : 'По этим фильтрам ничего нет — попробуйте снять часть условий.'}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(item => (
            <Link
              key={item.slug}
              href={`/ru/pereprodazha/o/${item.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition-shadow hover:shadow-lg"
            >
              <div className="relative">
                {item.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo} alt={item.title} loading="lazy" className="h-48 w-full object-cover" />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-[#f3f4f6] text-[14px] text-[var(--color-text-muted)]">
                    без фото
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-medium text-[#111827]">
                  {item.kind === 'villa' ? 'Вилла' : 'Апартаменты'}
                </span>
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-[15px] font-medium text-[#111827]">{item.title}</p>
                <p className="mt-1.5 text-[17px] font-semibold text-[var(--color-primary)]">
                  ${item.priceUsd.toLocaleString('en-US')}
                </p>
                {item.facts.length > 0 && (
                  <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">{item.facts.join(' · ')}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
