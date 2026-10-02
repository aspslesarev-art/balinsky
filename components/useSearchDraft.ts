'use client'

import { useEffect, useRef, useState } from 'react'

// The first search on a catalog root swaps the cached root page for its
// dynamic /q twin (see lib/use-catalog-router.ts), and React remounts the
// whole page — the search input included. Without this the input came back
// with the debounced value only: focus gone, letters typed meanwhile lost.
// Module state outlives the remount, so a fresh draft is restored with focus.
let draft: { path: string; value: string; at: number } | null = null
const FRESH_MS = 5000

export function useSearchDraft(initial: string) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [restored] = useState(() => {
    if (typeof window === 'undefined' || !draft) return null
    const fresh = draft.path === window.location.pathname && Date.now() - draft.at < FRESH_MS
    return fresh ? draft.value : null
  })
  const [value, setValueState] = useState(restored ?? initial)

  useEffect(() => {
    const el = inputRef.current
    if (restored == null || !el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [restored])

  const setValue = (v: string) => {
    draft = { path: window.location.pathname, value: v, at: Date.now() }
    setValueState(v)
  }

  return { value, setValue, inputRef }
}
