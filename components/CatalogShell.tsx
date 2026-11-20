import type { ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'
import { CATALOG_EYEBROW } from '@/lib/catalog-eyebrow'

// Каталог по макету CatB (владелец 20.11.2026): слева заголовок (без переключателя
// «Списком / На карте» — карта и так видна), строка
// поиска с фильтрами и сортировкой, список в 2 колонки; справа — карта от
// шапки до низа экрана и до правого края. На телефоне карта — кнопкой.
export function CatalogShell({ lang, heading, count, intro, search, filters, sort, map, children }: {
  lang: Lang
  heading: ReactNode
  count: ReactNode
  /** Больше не используется: переключатель «Списком / На карте» убран (карта и так рядом). */
  mapHref?: string
  intro?: ReactNode
  search: ReactNode
  filters: ReactNode
  sort?: ReactNode
  map: ReactNode
  children: ReactNode
}) {
  return (
    <main className="min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,38vw)]">
      <div className="min-w-0 px-6 lg:pl-[max(24px,calc((100vw-1280px)/2+24px))] lg:pr-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-8 md:pt-10">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-[12px] uppercase tracking-[0.08em] text-[#6B7570]">{CATALOG_EYEBROW[lang] ?? CATALOG_EYEBROW.en}</p>
            <h1 className="m-0 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F1A15] [overflow-wrap:normal] [word-break:normal] md:text-[40px]">{heading}</h1>
            <p className="text-[15px] text-[#6B7570]">{count}</p>
          </div>
        </div>
        {intro}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-[#ECEFED] py-3.5">
          <div className="min-w-[220px] flex-1">{search}</div>
          {filters}
          {sort && <div className="ml-auto">{sort}</div>}
        </div>
        {children}
      </div>
      <aside className="lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)]">{map}</aside>
    </main>
  )
}
