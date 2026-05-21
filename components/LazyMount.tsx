'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Wraps a heavy below-the-fold component so its dynamic-imported JS
// bundle only loads when the user actually scrolls toward it. Pairs
// with `dynamic(import(...))` on the child: the bundle stays
// code-split, and on top of that we don't even fetch it until the
// viewport gets close.
//
// `rootMargin` controls how far ahead we start the load — defaults to
// 600 px, which on a 700-px-tall phone viewport is roughly one full
// screen below the current fold. Tradeoff: bigger margin = chunk
// arrives sooner / less waiting on scroll, but bigger initial JS
// budget if the user never scrolls down. The InvestmentWidget brings
// in Google Maps + a few hundred KB of comparable-data logic, so the
// one-screen lookahead is the right balance.
export function LazyMount({
  children,
  rootMargin = '600px',
  fallback = null,
}: {
  children: ReactNode
  rootMargin?: string
  fallback?: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    if (typeof IntersectionObserver === 'undefined') {
      // Older browsers — skip the optimisation, mount immediately so
      // the feature still works.
      setVisible(true)
      return
    }
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true)
            io.disconnect()
            return
          }
        }
      },
      { rootMargin },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [visible, rootMargin])

  return <div ref={ref}>{visible ? children : fallback}</div>
}
