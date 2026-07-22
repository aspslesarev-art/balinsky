'use client'

import { useMemo, useState } from 'react'
import { SearchBar } from './SearchBar'
import { DeveloperRow, type DeveloperRowData } from './DeveloperRow'
import { pickCopy, type Lang } from '@/lib/i18n'

export function DevelopersList({ items, lang = 'ru' }: { items: DeveloperRowData[]; lang?: Lang }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter(d => d.name.toLowerCase().includes(t))
  }, [q, items])

  const empty = pickCopy({ ru: 'Ничего не найдено', en: 'Nothing found', id: 'Tidak ada hasil', fr: 'Aucun résultat', de: 'Nichts gefunden', zh: '未找到结果', nl: 'Niets gevonden', ban: 'Nenten wenten sane kapanggih', pl: 'Nic nie znaleziono', uk: 'Нічого не знайдено' }, lang)

  return (
    <>
      <div className="mb-6">
        <SearchBar value={q} onChange={setQ} placeholder={lang === 'ru' ? undefined : pickCopy({ ru: 'Поиск застройщиков…', en: 'Search developers…', id: 'Cari developer…', fr: 'Rechercher un promoteur…', de: 'Bauträger suchen…', zh: '搜索开发商…', nl: 'Zoek ontwikkelaars…', ban: 'Ngrereh developer…', pl: 'Szukaj deweloperów…', uk: 'Пошук забудовників…' }, lang)} />
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[var(--color-text-muted)]">{empty}</div>
      ) : (
        <div className="w-full flex flex-col items-stretch gap-3">
          {filtered.map((d, i) => (
            <DeveloperRow key={d.slug ?? `${d.name}-${i}`} d={d} lang={lang} />
          ))}
        </div>
      )}
    </>
  )
}
