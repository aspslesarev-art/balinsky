'use client'

import { useEffect } from 'react'
import type { Lang } from '@/lib/i18n'

// Sets <html lang> on the client right after hydration. The root layout
// emits lang="ru" statically (so every ISR-prerendered page renders
// without forcing the whole tree dynamic via headers()). On any /en/*
// page we render this component from the en/layout.tsx wrapper — it
// flips the attribute the moment React takes over the document.
//
// Trade-off: the very first byte of HTML still says lang="ru" on EN
// pages (acceptable — search engines re-crawl using hreflang anyway,
// and the EN content itself is already in English). Screen readers
// pick up the correction after hydration on the same paint frame.
export function HtmlLangSetter({ lang }: { lang: Lang }) {
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.lang !== lang) {
      document.documentElement.lang = lang
    }
  }, [lang])
  return null
}
