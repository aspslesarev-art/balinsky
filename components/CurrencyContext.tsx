'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { detectLang, pickCopy } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { ALL_CURRENCIES, currencyForCountry, isCurrency, type Currency } from '@/lib/currency'
import { countryByTimezone, resolveCountry } from '@/lib/geo'

const LS_KEY = 'balinsky.currency'

// Валюта: явный выбор человека → страна по IP (lib/currency COUNTRY_CURRENCY)
// → рупии. На экране всегда одна валюта: «Rp … и $…» одновременно — двойная
// цена, запрещённая Банком Индонезии (SE 17/11/DKSP). `secondary` всегда null.
type Ctx = {
  currency: Currency
  selected: Currency
  secondary: Currency | null
  // True when the value comes from a user pick (vs the page default).
  hasExplicit: boolean
  setCurrency: (c: Currency) => void
}

const CurrencyContext = createContext<Ctx | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [explicit, setExplicit] = useState<Currency | null>(null)
  const [geo, setGeo] = useState<Currency | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY)
      if (isCurrency(v)) { setExplicit(v); return }
    } catch { /* SSR / private mode */ }
    // Мгновенная подсказка по часовому поясу, потом IP подтверждает или поправляет.
    setGeo(currencyForCountry(countryByTimezone()))
    let alive = true
    resolveCountry().then(country => {
      if (alive && country) setGeo(currencyForCountry(country))
    })
    return () => { alive = false }
  }, [])

  const setCurrency = (c: Currency) => {
    setExplicit(c)
    try { localStorage.setItem(LS_KEY, c) } catch { /* ignore */ }
  }

  const selected = explicit ?? geo ?? 'IDR'
  const value: Ctx = {
    currency: selected,
    selected,
    secondary: null,
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
      currency: 'IDR',
      selected: 'IDR',
      secondary: null,
      hasExplicit: false,
      setCurrency: () => { /* no-op */ },
    }
  }
  return ctx
}

export function CurrencyToggle({ className = '' }: { className?: string }) {
  const { selected: currency, setCurrency } = useCurrency()
  const pathname = usePathname() ?? ''
  const label = pickCopy({ ru: 'Валюта', en: 'Currency', id: 'Mata uang', fr: 'Devise', de: 'Währung', zh: '货币', nl: 'Valuta', ban: 'Mata uang', pl: 'Waluta', uk: 'Валюта' }, detectLang(pathname))
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={currency}
        onChange={e => setCurrency(e.target.value as Currency)}
        aria-label={label}
        className="appearance-none rounded-full border border-[var(--color-border)] bg-white pl-3 pr-7 py-1.5 text-[12px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
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
