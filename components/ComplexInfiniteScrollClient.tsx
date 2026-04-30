'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ComplexCard, type ComplexCardData } from './ComplexCard'

type Card = ComplexCardData & { id: string }

type ApiResponse = {
  cards: Card[]
  offset: number
  limit: number
  totalCount: number
  hasMore: boolean
}

const LAZY_CHUNK = 4

export function ComplexInfiniteScrollClient({
  initialOffset,
  initialHasMore,
  searchString,
}: {
  initialOffset: number
  initialHasMore: boolean
  searchString: string
}) {
  const [cards, setCards] = useState<Card[]>([])
  const [offset, setOffset] = useState(initialOffset)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const inflightRef = useRef<Promise<void> | null>(null)

  const loadNext = useCallback(async () => {
    if (!hasMore || inflightRef.current) return
    const params = new URLSearchParams(searchString)
    params.set('offset', String(offset))
    params.set('limit', String(LAZY_CHUNK))
    inflightRef.current = (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/zhilye-kompleksy?${params.toString()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ApiResponse
        setCards(prev => [...prev, ...json.cards])
        setHasMore(json.hasMore)
        setOffset(o => o + json.cards.length)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'failed'
        setError(msg)
      } finally {
        setLoading(false)
      }
    })().finally(() => { inflightRef.current = null })
  }, [hasMore, offset, searchString])

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadNext() },
      { rootMargin: '600px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadNext])

  return (
    <>
      {cards.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map(c => <ComplexCard key={c.id} c={c} />)}
        </div>
      )}
      {hasMore && (
        <>
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={loadNext}
              disabled={loading}
              className={`inline-block px-6 py-3 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[14px] font-medium text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors cursor-pointer ${loading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {loading ? 'Загрузка…' : 'Показать ещё'}
            </button>
          </div>
        </>
      )}
      {error && (
        <div className="py-6 text-center text-[14px] text-[var(--color-text-muted)]">
          Не удалось загрузить ещё.{' '}
          <button type="button" onClick={loadNext} className="text-[var(--color-primary-pressed)] underline">Повторить</button>
        </div>
      )}
    </>
  )
}
