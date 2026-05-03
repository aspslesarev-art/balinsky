'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Visitor intent toggle — client-only filter that hides / shows pieces of
// the page without changing the URL or the SSR HTML. Crawlers still see
// the full page; only the user-facing CSS class on <html> flips, so:
//
//   .intent-invest  — hides elements tagged data-intent="live-only"
//   .intent-live    — hides elements tagged data-intent="invest-only"
//   (no class)      — show everything (default for crawlers + first paint)
//
// State is stored in localStorage so the choice survives navigations.

export type Intent = 'all' | 'invest' | 'live'
const LS_KEY = 'balinsky.intent'

type Ctx = { intent: Intent; setIntent: (v: Intent) => void; ready: boolean }
const IntentContext = createContext<Ctx | null>(null)

export function IntentProvider({ children }: { children: ReactNode }) {
  const [intent, setIntentState] = useState<Intent>('all')
  const [ready, setReady] = useState(false)

  // Read saved choice + apply CSS class to <html>.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved === 'invest' || saved === 'live') setIntentState(saved)
    } catch { /* SSR / private mode */ }
    setReady(true)
  }, [])

  // Reflect intent on <html> so static CSS rules can hide marked elements
  // without per-element React re-renders.
  useEffect(() => {
    const cls = document.documentElement.classList
    cls.remove('intent-invest', 'intent-live')
    if (intent === 'invest') cls.add('intent-invest')
    if (intent === 'live')   cls.add('intent-live')
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
  return ctx ?? { intent: 'all', setIntent: () => {}, ready: false }
}

// === Server-side helpers ===
// Cards / blocks run in server components, where we can't read context.
// They emit a data-intent attribute based on heuristics; the CSS rules
// in globals.css hide the wrong ones on the client.

export type IntentTag = 'invest-only' | 'live-only' | undefined

const INVEST_FRIENDLY_DISTRICTS = new Set([
  'Canggu', 'Berawa', 'Pererenan', 'Batu Bolong',
  'Bukit', 'Uluwatu', 'Pandawa', 'Jimbaran', 'Bingin', 'Balangan',
])
const LIVE_FRIENDLY_DISTRICTS = new Set([
  'Ubud', 'Sanur', 'Cemagi', 'Tabanan', 'Sidemen',
])

// Conservative classifier: most listings stay un-tagged (visible in every
// mode) — only the unambiguous extremes get a tag, so the catalog never
// goes empty in either intent. Empty filter results are a worse UX than
// showing a neutral mix.
export function classifyVilla(opts: { bedrooms: number | null; district: string | null }): IntentTag {
  const bd = opts.bedrooms ?? 0
  const d = opts.district ?? ''
  // Big family villa anywhere → living-only.
  if (bd >= 5) return 'live-only'
  // 3-4 BR villa in an explicitly quiet district → living-only.
  if (bd >= 3 && LIVE_FRIENDLY_DISTRICTS.has(d)) return 'live-only'
  // Studio / 1 BR in a tourist hotspot → investment-only.
  if (bd === 1 && INVEST_FRIENDLY_DISTRICTS.has(d)) return 'invest-only'
  return undefined
}

export function classifyApartment(opts: { bedrooms: number | null; district: string | null }): IntentTag {
  // Apartments stay un-tagged by default — they fit both intents. Mark
  // only when bedroom count clearly skews one way.
  const bd = opts.bedrooms ?? 0
  if (bd >= 3 && LIVE_FRIENDLY_DISTRICTS.has(opts.district ?? '')) return 'live-only'
  if (bd === 0 || bd === 1) return undefined // studios / 1BR are popular for both
  return undefined
}
