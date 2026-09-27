'use client'

import { useState } from 'react'
import { decodeSourceMarks } from '@/lib/source-mark'

export function MarkChecker() {
  const [text, setText] = useState('')
  const found = text.trim() ? decodeSourceMarks(text) : null
  return (
    <section className="space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Вставьте сюда текст"
        className="w-full min-h-[200px] rounded-xl border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] p-4 text-[15px] leading-relaxed text-[var(--ax-fg)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      />
      {found && found.length > 0 && (
        <div className="rounded-xl bg-emerald-500/10 p-4 text-[15px]">
          <p className="font-semibold">Метка найдена — текст взят с Balinsky:</p>
          <ul className="mt-2 space-y-1">
            {found.map(u => (
              <li key={u}>
                <a href={`https://${u}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all">{u}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {found && found.length === 0 && (
        <p className="rounded-xl bg-rose-500/10 p-4 text-[15px]">
          Метки нет: текст не с Balinsky, его переписали своими словами или метку вычистили.
        </p>
      )}
    </section>
  )
}
