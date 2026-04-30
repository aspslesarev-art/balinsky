'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { buildListHref, buildMapHref } from '@/lib/villa-filter-href'

const LIST_BASE = '/ru/villy'
const MAP_BASE = '/ru/villy/karta'

export type FilterView = 'list' | 'map'

export function useVillaFilterUrl(currentState: VillaFilterState, view: FilterView = 'list') {
  const router = useRouter()

  const apply = useCallback(
    (patch: Partial<VillaFilterState>) => {
      const next: VillaFilterState = { ...currentState, ...patch }
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
