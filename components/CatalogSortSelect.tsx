'use client'

import { ChevronDown } from 'lucide-react'
import { useCatalogRouter } from '@/lib/use-catalog-router'
import { CATALOG_SORTS, sortCopy, type CatalogSort } from '@/lib/catalog-sort'
import type { Lang } from '@/lib/i18n'

// Сортировка каталога. Ссылки на каждый вариант строит сервер (buildListHref
// с текущими фильтрами), здесь только переход. Нативный <select>: на телефоне
// это системный список — один тап, крупные пункты, без своей вёрстки попапа.
export function CatalogSortSelect({
  current,
  hrefs,
  lang = 'ru',
}: {
  current: CatalogSort | undefined
  // 'default' — умный порядок без параметра.
  hrefs: Record<CatalogSort | 'default', string>
  lang?: Lang
}) {
  const router = useCatalogRouter()
  const c = sortCopy(lang)
  // «Журнал» (макет CatB, 20.11.2026): не кнопка, а строка «Сортировка: …» справа от фильтров.
  return (
    <label className="relative inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] text-[#6B7570]">
      <span>{c.label}:</span>
      <span className="relative inline-flex items-center gap-1 font-semibold text-[#0F1A15]">
        <select
          value={current ?? 'default'}
          onChange={e => router.push(hrefs[e.target.value as CatalogSort | 'default'], { scroll: false })}
          className="cursor-pointer appearance-none border-0 bg-transparent pr-5 text-inherit [font:inherit] focus:outline-none focus-visible:underline"
        >
          <option value="default">{c.default}</option>
          {CATALOG_SORTS.map(s => <option key={s} value={s}>{c[s]}</option>)}
        </select>
        <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-0" />
      </span>
    </label>
  )
}
