'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// Код значка для сайта застройщика + кнопка «Скопировать код».
// Текст кода выделяется целиком по клику — на случай, если буфер недоступен.

const COPY = {
  ru: { copy: 'Скопировать код', done: 'Скопировано', failed: 'Не скопировалось — выделите код вручную' },
  en: { copy: 'Copy code', done: 'Copied', failed: 'Could not copy — select the code manually' },
} as const

export function BadgeEmbedCode({ code, lang }: { code: string; lang: 'ru' | 'en' }) {
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const c = COPY[lang]

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setDone(true)
      setFailed(false)
      setTimeout(() => setDone(false), 2000)
    } catch (err) {
      console.error('clipboard write failed', err)
      setFailed(true)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <pre className="m-0 select-all whitespace-pre-wrap break-all rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 font-mono text-[13px] leading-[1.6] text-[var(--color-text)]">
        {code}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        {done ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <Copy size={16} aria-hidden />}
        <span aria-live="polite">{done ? c.done : c.copy}</span>
      </button>
      {failed && <p className="m-0 text-[13px] text-[var(--color-text-muted)]">{c.failed}</p>}
    </div>
  )
}
