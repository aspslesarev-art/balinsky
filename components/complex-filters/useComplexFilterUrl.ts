'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import { buildListHref, buildMapHref } from '@/lib/complex-filter-href'

const LIST_BASE = '/ru/zhilye-kompleksy'
const MAP_BASE = '/ru/zhilye-kompleksy/karta'

export type FilterView = 'list' | 'map'

export function useComplexFilterUrl(currentState: ComplexFilterState, view: FilterView = 'list') {
  const router = useRouter()

  const apply = useCallback(
    (patch: Partial<ComplexFilterState>) => {
      const next: ComplexFilterState = { ...currentState, ...patch }
      const href = view === 'map' ? buildMapHref(next) : buildListHref(next)
      router.push(href, { scroll: false })
    },
    [router, currentState, view],
  )

  const clearAll = useCallback(() => {
    router.push(view === 'map' ? MAP_BASE : LIST_BASE, { scroll: false })
  }, [router, view])

  return { apply, clearAll }
}
