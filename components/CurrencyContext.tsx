'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { detectLang } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { ALL_CURRENCIES, isCurrency, type Currency } from '@/lib/currency'

const LS_KEY = 'balinsky.currency'

// Pages where USD-as-default doesn't fit; long-term rentals are quoted locally
// in IDR, so a first-time visitor on /ru/arenda sees prices in rupiah.
function pageDefaultFor(pathname: string | null): Currency {
  if (pathname?.startsWith('/ru/arenda')) return 'IDR'
  return 'USD'
}

type Ctx = {
  // Currency to render with — explicit user pick, or page default if no pick yet.
  currency: Currency
  // True when the value comes from a user pick (vs the page default).
  hasExplicit: boolean
  setCurrency: (c: Currency) => void
}

const CurrencyContext = createContext<Ctx | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [explicit, setExplicit] = useState<Currency | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY)
      if (isCurrency(v)) setExplicit(v)
    } catch { /* SSR / private mode */ }
  }, [])

  const setCurrency = (c: Currency) => {
    setExplicit(c)
    try { localStorage.setItem(LS_KEY, c) } catch { /* ignore */ }
  }

  const value: Ctx = {
    currency: explicit ?? pageDefaultFor(pathname),
    hasExplicit: explicit != null,
    setCurrency,
  }

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext)
  // Fallback for components rendered outside any provider — keep the site
  // working even on pages that haven't been wrapped yet.
  if (!ctx) {
    return {
      currency: 'USD',
      hasExplicit: false,
      setCurrency: () => { /* no-op */ },
    }
  }
  return ctx
}

export function CurrencyToggle({ className = '' }: { className?: string }) {
  const { currency, setCurrency } = useCurrency()
  const pathname = usePathname() ?? ''
  const label = detectLang(pathname) === 'ru' ? 'Валюта' : 'Currency'
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={currency}
        onChange={e => setCurrency(e.target.value as Currency)}
        aria-label={label}
        className="appearance-none rounded-full border border-[var(--color-border)] bg-white pl-3 pr-7 py-1.5 text-[12px] font-medium text-[#111827] hover:border-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
      >
        {ALL_CURRENCIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </label>
  )
}
