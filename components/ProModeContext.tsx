'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Pro mode = on/off switch shown in the header. ON by default.
// When ON: detail pages show the investment analytics (NOI scenarios,
// competitors map, ROI strip on RentalCompareSection).
// When OFF: anything tagged data-investment-block hides via CSS.
// Catalogs are NEVER affected — Pro mode is a detail-page-only switch.

const LS_KEY = 'balinsky.pro'

type Ctx = { pro: boolean; setPro: (v: boolean) => void; ready: boolean }
const ProContext = createContext<Ctx | null>(null)

export function ProModeProvider({ children }: { children: ReactNode }) {
  // Default ON — that's what Google + first-paint visitors see in SSR HTML.
  const [pro, setProState] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY)
      if (v === 'off') setProState(false)
    } catch { /* SSR / private mode */ }
    setReady(true)
  }, [])

  useEffect(() => {
    const cls = document.documentElement.classList
    if (pro) cls.remove('no-pro')
    else     cls.add('no-pro')
  }, [pro])

  const setPro = (v: boolean) => {
    setProState(v)
    try { localStorage.setItem(LS_KEY, v ? 'on' : 'off') } catch { /* ignore */ }
  }

  return <ProContext.Provider value={{ pro, setPro, ready }}>{children}</ProContext.Provider>
}

export function useProMode(): Ctx {
  return useContext(ProContext) ?? { pro: true, setPro: () => {}, ready: false }
}
