'use client'

import { useEffect } from 'react'

// Замок прокрутки под всплывающим окном (владелец 21.11.2026: окна «не
// дёргаются»). overflow:hidden на body iPhone не держит — страница под окном
// всё равно едет и тянет за собой адресную строку, окно скачет по высоте.
// Поэтому body фиксируем на месте и возвращаем прокрутку при закрытии.
// Счётчик — на случай окна поверх окна.
let locks = 0
let saved: { y: number; style: string; html: string } | null = null

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (locks++ === 0) {
      const y = window.scrollY
      const b = document.body, h = document.documentElement
      saved = { y, style: b.getAttribute('style') ?? '', html: h.style.overscrollBehavior }
      b.style.position = 'fixed'
      b.style.top = `-${y}px`
      b.style.left = '0'
      b.style.right = '0'
      b.style.width = '100%'
      b.style.overflow = 'hidden'
      h.style.overscrollBehavior = 'none'
    }
    return () => {
      if (--locks > 0 || !saved) return
      const { y, style, html } = saved
      saved = null
      document.body.setAttribute('style', style)
      document.documentElement.style.overscrollBehavior = html
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
    }
  }, [active])
}
