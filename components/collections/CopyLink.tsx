'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { collectionUrl } from './format'

// «Скопировать ссылку» для клиента: в буфер, на 2 секунды — «Скопировано».

export function CopyLink({ token, variant = 'outline' }: { token: string; variant?: 'outline' | 'primary' }) {
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(collectionUrl(token))
      setDone(true)
      setFailed(false)
      setTimeout(() => setDone(false), 2000)
    } catch {
      setFailed(true)
    }
  }
  const cls = variant === 'primary'
    ? 'h-12 rounded-xl bg-[var(--color-primary)] text-white text-[15px] font-semibold hover:bg-[var(--color-primary-hover)]'
    : 'h-10 rounded-lg border border-[var(--color-border)] bg-white text-[14px] font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
  return (
    <button type="button" onClick={copy}
      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 px-4 transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${cls}`}>
      {done ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <Copy size={16} aria-hidden />}
      <span aria-live="polite">{done ? 'Скопировано' : failed ? 'Не скопировалось' : 'Скопировать ссылку'}</span>
    </button>
  )
}
