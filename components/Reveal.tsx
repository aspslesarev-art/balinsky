'use client'

import { useEffect } from 'react'

/**
 * Site-wide motion glue, mounted once in RootShell for public pages.
 *
 * 1. Blur-fade (Magic UI blur-fade, ported to CSS in globals.css): any
 *    element with `data-reveal` eases in when it scrolls into view. Set
 *    `style={{ '--reveal-i': n }}` for a stagger. Elements already on screen
 *    are marked visible in the same task that turns the effect on, so
 *    nothing blinks on load; without JS nothing is ever hidden.
 * 2. Magic card: feeds the pointer position to `.magic-card` elements as
 *    --mx / --my for the border glow.
 */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )

    const track = (el: Element) => {
      if (el.classList.contains('is-in')) return
      const r = el.getBoundingClientRect()
      if (reduce || r.top < window.innerHeight) el.classList.add('is-in')
      else io.observe(el)
    }
    document.querySelectorAll('[data-reveal]').forEach(track)
    root.classList.add('js-reveal')

    // Client-side navigations bring in new sections — pick them up too.
    const mo = new MutationObserver(records => {
      for (const rec of records) {
        rec.addedNodes.forEach(n => {
          if (!(n instanceof Element)) return
          if (n.matches('[data-reveal]')) track(n)
          n.querySelectorAll('[data-reveal]').forEach(track)
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType !== 'mouse') return
      const card = (ev.target as Element | null)?.closest?.('.magic-card') as HTMLElement | null
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${ev.clientX - r.left}px`)
      card.style.setProperty('--my', `${ev.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      io.disconnect()
      mo.disconnect()
      document.removeEventListener('pointermove', onMove)
      root.classList.remove('js-reveal')
    }
  }, [])
  return null
}
