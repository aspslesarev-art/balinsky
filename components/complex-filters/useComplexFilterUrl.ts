'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import { buildListHref, buildMapHref } from '@/lib/complex-filter-href'
import { switchLangPath, type Lang, detectLang } from '@/lib/i18n'

const RU_LIST_BASE = '/ru/zhilye-kompleksy'
const RU_MAP_BASE = '/ru/zhilye-kompleksy/karta'
const EN_LIST_BASE = '/en/complexes'
const EN_MAP_BASE = '/ru/zhilye-kompleksy/karta'

export type FilterView = 'list' | 'map'

export function useComplexFilterUrl(currentState: ComplexFilterState, view: FilterView = 'list') {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const lang: Lang = detectLang(pathname)

  const apply = useCallback(
    (patch: Partial<ComplexFilterState>) => {
      const next: ComplexFilterState = { ...currentState, ...patch }
      const href = view === 'map' ? buildMapHref(next, lang) : buildListHref(next, lang)
      router.push(href, { scroll: false })
    },
    [router, currentState, view, lang],
  )

  const clearAll = useCallback(() => {
    const listBase = lang === 'en' ? EN_LIST_BASE : switchLangPath(RU_LIST_BASE, lang)
    const mapBase = lang === 'en' ? EN_MAP_BASE : switchLangPath(RU_MAP_BASE, lang)
    router.push(view === 'map' ? mapBase : listBase, { scroll: false })
  }, [router, view, lang])

  return { apply, clearAll }
}
