'use client'

// Home-hero search that talks to Балина instead of dumping the visitor on
// the bare catalog. Submitting the field — or tapping a suggestion chip —
// opens the ConsultantWidget pre-filled and auto-sent (via the existing
// `balina:open` CustomEvent bridge), so the hero copy's promise ("опишите
// AI-консьержу что ищете") is actually wired up. The mic opens Балина
// straight into voice capture.

import { useEffect, useState } from 'react'
import { Search, ArrowRight, Mic } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

type Suggestion = { label: string; prompt?: string }

function openBalina(text: string) {
  const t = text.trim()
  if (!t) return
  window.dispatchEvent(new CustomEvent('balina:open', { detail: { text: t, autoSend: true } }))
}

export function HeroBalinaSearch({
  placeholder,
  tryLabel,
  suggestions,
  sendAria,
  voiceAria,
}: {
  lang: Lang
  placeholder: string
  tryLabel: string
  suggestions: readonly Suggestion[]
  sendAria: string
  voiceAria: string
}) {
  const [value, setValue] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    openBalina(value)
    setValue('')
  }
  const listen = () => {
    if (!voiceSupported) return
    window.dispatchEvent(new CustomEvent('balina:open', { detail: { listen: true } }))
  }

  return (
    <>
      <form onSubmit={submit} className="relative" data-llm-skip="">
        <Search size={18} strokeWidth={1.8} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6B7570] pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-12 pr-[5.5rem] py-4 md:py-5 text-[15px] md:text-[16px] rounded-2xl bg-white border border-[#D5DDD8] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-[#9CA59F] text-[#0E1A14]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {voiceSupported && (
            <button
              type="button"
              onClick={listen}
              aria-label={voiceAria}
              title={voiceAria}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-black/5 hover:bg-black/10 text-[#0E1A14] transition-colors"
            >
              <Mic size={18} strokeWidth={1.8} />
            </button>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0E1A14] text-white hover:bg-[#1F2C25] transition-colors"
            aria-label={sendAria}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      <div className="mt-3 text-[12.5px] text-white/75 flex items-baseline flex-wrap gap-x-2 gap-y-1.5" data-llm-skip="">
        <span className="uppercase tracking-wider text-[11px] text-white/55">{tryLabel}:</span>
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => openBalina(s.prompt ?? s.label)}
            className="text-white/85 underline decoration-white/30 underline-offset-2 hover:decoration-white hover:text-white transition-colors cursor-pointer"
          >
            {s.label}
          </button>
        ))}
      </div>
    </>
  )
}
