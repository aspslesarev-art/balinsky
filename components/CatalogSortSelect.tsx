'use client'

import { ArrowUpDown } from 'lucide-react'
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
  const active = current != null
  return (
    <label
      className={`relative inline-flex items-center gap-1.5 py-2.5 pl-4 pr-4 rounded-full border text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-2 ${
        active
          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-medium'
          : 'bg-[var(--color-card-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
      }`}
    >
      <ArrowUpDown size={16} strokeWidth={2} aria-hidden className={active ? 'text-white' : 'text-[var(--color-text-muted)]'} />
      <span className="sr-only">{c.label}</span>
      <select
        value={current ?? 'default'}
        onChange={e => router.push(hrefs[e.target.value as CatalogSort | 'default'], { scroll: false })}
        className="appearance-none bg-transparent text-inherit [font:inherit] cursor-pointer focus:outline-none"
      >
        <option value="default" className="text-[var(--color-text)] bg-[var(--color-card-bg)]">{c.default}</option>
        {CATALOG_SORTS.map(s => <option key={s} value={s} className="text-[var(--color-text)] bg-[var(--color-card-bg)]">{c[s]}</option>)}
      </select>
    </label>
  )
}
