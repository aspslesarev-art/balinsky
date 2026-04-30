'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { FilterState } from './FiltersBar'
import { buildListHref, buildMapHref } from '@/lib/filter-href'

const LIST_BASE = '/ru/apartamenty'
const MAP_BASE = '/ru/apartamenty/karta'

export type FilterView = 'list' | 'map'

export function useFilterUrl(currentState: FilterState, view: FilterView = 'list') {
  const router = useRouter()

  const apply = useCallback(
    (patch: Partial<FilterState>) => {
      const next: FilterState = { ...currentState, ...patch }
      const href = view === 'map' ? buildMapHref(next) : buildListHref(next)
      router.push(href, { scroll: false })
    },
    [router, currentState, view]
  )

  const clearAll = useCallback(() => {
    router.push(view === 'map' ? MAP_BASE : LIST_BASE, { scroll: false })
  }, [router, view])

  return { apply, clearAll }
}
