'use client'

import { useEffect } from 'react'

// Reads the `tma=1` cookie set by /telegram and toggles a class on <html>
// so the sticky header sits below Telegram's WebView controls. Done on the
// client because the root layout has to stay synchronous — reading cookies
// in a server layout would push every SSG page into dynamic rendering.
export function TmaModeMarker() {
  useEffect(() => {
    const has = document.cookie.split('; ').some(c => c === 'tma=1')
    if (has) document.documentElement.classList.add('tma-mode')
  }, [])
  return null
}
