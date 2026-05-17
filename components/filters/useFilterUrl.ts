'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { FilterState } from './FiltersBar'
import { buildListHref, buildMapHref } from '@/lib/filter-href'
import type { Lang } from '@/lib/i18n'

const RU_LIST_BASE = '/ru/apartamenty'
const RU_MAP_BASE = '/ru/apartamenty/karta'
const EN_LIST_BASE = '/en/apartments'
const EN_MAP_BASE = '/ru/apartamenty/karta'

export type FilterView = 'list' | 'map'

export function useFilterUrl(currentState: FilterState, view: FilterView = 'list') {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'

  const apply = useCallback(
    (patch: Partial<FilterState>) => {
      const next: FilterState = { ...currentState, ...patch }
      const href = view === 'map' ? buildMapHref(next, lang) : buildListHref(next, lang)
      router.push(href, { scroll: false })
    },
    [router, currentState, view, lang]
  )

  const clearAll = useCallback(() => {
    const listBase = lang === 'en' ? EN_LIST_BASE : RU_LIST_BASE
    const mapBase = lang === 'en' ? EN_MAP_BASE : RU_MAP_BASE
    router.push(view === 'map' ? mapBase : listBase, { scroll: false })
  }, [router, view, lang])

  return { apply, clearAll }
}
