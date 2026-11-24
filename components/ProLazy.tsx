'use client'

// Место для Pro-аналитики на общей странице объекта. Гостю — пусто (в коде
// страницы аналитики нет вовсе). С меткой Pro браузер просит блок у сервера
// (lib/pro-parts.tsx), а тот отдаёт его, только если Pro у сессии настоящий.
import { useEffect, useState, type ReactNode } from 'react'
import type { Lang } from '@/lib/i18n'
import { loadProPart, type ProKind, type ProPart } from '@/lib/pro-parts'

function hasProFlag(): boolean {
  return document.documentElement.getAttribute('data-pro') === '1'
}

export function ProLazy({ kind, slug, lang, part, minHeight = 0 }: {
  kind: ProKind
  slug: string
  lang: Lang
  part: ProPart
  /** Высота заглушки, пока блок грузится, — чтобы страница не прыгала. */
  minHeight?: number
}) {
  const [pro, setPro] = useState(false)
  const [node, setNode] = useState<ReactNode>(null)
  const [done, setDone] = useState(false)

  // Метку data-pro ставит скрипт в <head> и обновляет AuthFlag после проверки.
  useEffect(() => {
    const sync = () => setPro(hasProFlag())
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-pro'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    if (!pro || done) return
    let alive = true
    loadProPart(kind, slug, lang, part)
      .then(n => { if (alive) { setNode(n); setDone(true) } })
      .catch(e => { console.error('[ProLazy]', e); if (alive) setDone(true) })
    return () => { alive = false }
  }, [pro, done, kind, slug, lang, part])

  if (!pro) return null
  if (!done) return minHeight > 0 ? <div aria-busy="true" className="animate-pulse rounded-2xl bg-[var(--color-search-bg)]" style={{ minHeight }} /> : null
  return <>{node}</>
}
