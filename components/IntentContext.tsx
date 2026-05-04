'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Pro / Regular toggle — client-only switch that hides the analytics
// widgets without touching the SSR HTML. Crawlers always see the full
// "Pro" version; only a CSS class on <html> flips on the client:
//
//   .intent-regular — hides anything tagged data-investment-block
//   (no class)      — full Pro view (default + crawlers)
//
// State persists in localStorage so the choice survives navigations.

export type Intent = 'pro' | 'regular'
const LS_KEY = 'balinsky.intent'

type Ctx = { intent: Intent; setIntent: (v: Intent) => void; ready: boolean }
const IntentContext = createContext<Ctx | null>(null)

export function IntentProvider({ children }: { children: ReactNode }) {
  const [intent, setIntentState] = useState<Intent>('pro')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      // Migrate the previous 3-state model: old "live" wanted analytics
      // hidden, so it maps to "regular"; everything else (including the
      // old "all" / "invest") falls through to "pro".
      if (saved === 'regular' || saved === 'live') setIntentState('regular')
      else if (saved === 'pro' || saved === 'all' || saved === 'invest') setIntentState('pro')
    } catch { /* SSR / private mode */ }
    setReady(true)
  }, [])

  useEffect(() => {
    const cls = document.documentElement.classList
    cls.remove('intent-regular', 'intent-pro')
    if (intent === 'regular') cls.add('intent-regular')
  }, [intent])

  const setIntent = (v: Intent) => {
    setIntentState(v)
    try { localStorage.setItem(LS_KEY, v) } catch { /* ignore */ }
  }

  return (
    <IntentContext.Provider value={{ intent, setIntent, ready }}>
      {children}
    </IntentContext.Provider>
  )
}

export function useIntent(): Ctx {
  const ctx = useContext(IntentContext)
  return ctx ?? { intent: 'pro', setIntent: () => {}, ready: false }
}
