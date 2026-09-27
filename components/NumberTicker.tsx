'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Magic UI number-ticker, without the motion dependency. Takes the already
 * formatted string ("$350 000", "968", "12,4%") and counts its integer part
 * up once it scrolls into view. The server renders the final text, so
 * crawlers and no-JS visitors see the real number; a value already on screen
 * at load is left as is rather than reset to zero in front of the reader.
 * Anything that isn't a plain grouped integer is rendered unchanged.
 */
const INT = /^(\D*?)(\d{1,3}(?:[   ,.]\d{3})+|\d+)(\D*)$/

export function NumberTicker({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState(value)

  useEffect(() => {
    const m = INT.exec(value)
    const el = ref.current
    if (!m || !el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight) return

    const [, pre, num, post] = m
    const sep = num.match(/[   ,.]/)?.[0] ?? ''
    const target = Number(num.replace(/\D/g, ''))
    const fmt = (n: number) => {
      const s = String(n)
      return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : s
    }
    // Keep the final width from the first frame so nothing around it jumps.
    el.style.minWidth = `${el.offsetWidth}px`
    setText(pre + fmt(0) + post)

    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const dur = 900
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        setText(pre + fmt(Math.round(target * eased)) + post)
        if (p < 1) raf = requestAnimationFrame(step)
        else setText(value)
      }
      raf = requestAnimationFrame(step)
    }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [value])

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className ?? ''}`}>
      {text}
    </span>
  )
}
