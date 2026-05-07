'use client'

// Home-page hero block: Балина — our AI broker.
//
// Big circular portrait + intro copy + a fat input row with a voice
// mic and a send button. Submitting (Enter or send) opens the
// existing ConsultantWidget chat panel pre-filled with the typed
// text and auto-sends it. The voice button opens the widget and
// kicks the speech-recognition state straight away. Image lives at
// /balina.jpg.

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Mic, Send, Sparkles } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    eyebrow: 'AI-брокер',
    name: 'Балина',
    title: 'Помогу подобрать недвижимость на Бали',
    subtitle: 'Спросите, что вы ищете — виллу, апартаменты, инвест-объект — расскажу, помогу определиться, свяжу с менеджером застройщика.',
    placeholder: 'Например: вилла в Чангу, 2 спальни, до $250K, под аренду…',
    sendAria: 'Отправить сообщение',
    voiceAria: 'Записать голосом',
    voiceUnsupported: 'Голос не поддерживается этим браузером',
    altPhoto: 'AI-брокер Балина',
  },
  en: {
    eyebrow: 'AI broker',
    name: 'Balina',
    title: "I'll help you find Bali real estate",
    subtitle: 'Tell me what you want — a villa, apartment, investment unit — and I will recommend, help you decide, and connect you with a developer manager.',
    placeholder: 'e.g. villa in Canggu, 2 bedrooms, up to $250K, for rental…',
    sendAria: 'Send message',
    voiceAria: 'Record by voice',
    voiceUnsupported: 'Voice input is not supported in this browser',
    altPhoto: 'AI broker Balina',
  },
} as const

export function BalinaHero() {
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const c = COPY[lang]

  const [value, setValue] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  // Auto-grow the textarea up to ~5 lines.
  const handleInput = (next: string) => {
    setValue(next)
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const send = () => {
    const text = value.trim()
    if (!text) return
    window.dispatchEvent(new CustomEvent('balina:open', { detail: { text, autoSend: true } }))
    setValue('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }
  const startVoice = () => {
    if (!voiceSupported) return
    window.dispatchEvent(new CustomEvent('balina:open', { detail: { listen: true } }))
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <section className="pt-10 md:pt-14 pb-10">
      <div className="rounded-3xl bg-gradient-to-br from-[var(--color-primary-soft)] via-white to-white border border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 md:gap-10 p-6 md:p-10 items-center">
          {/* Portrait */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <div className="w-[200px] h-[200px] md:w-[260px] md:h-[260px] rounded-full overflow-hidden ring-4 ring-white shadow-[0_20px_50px_-15px_rgba(31,90,52,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/balina.jpg"
                  alt={c.altPhoto}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Sparkle badge — subtle "this is AI" marker so visitors
                  understand this isn't a human staffer they're texting. */}
              <div className="absolute -bottom-1 -right-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-medium shadow-[0_4px_12px_rgba(31,90,52,0.3)]">
                <Sparkles size={12} fill="currentColor" strokeWidth={0} />
                AI
              </div>
            </div>
          </div>

          {/* Copy + input */}
          <div>
            <div className="text-[12px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-semibold mb-2">
              {c.eyebrow} · {c.name}
            </div>
            <h1 className="text-[28px] md:text-[42px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-3">
              {c.title}
            </h1>
            <p className="text-[15px] md:text-[16px] text-[var(--color-text-muted)] leading-relaxed mb-5 max-w-2xl">
              {c.subtitle}
            </p>

            {/* Input row */}
            <div className="flex items-end gap-2 bg-white rounded-2xl border border-[var(--color-border)] p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus-within:border-[var(--color-primary)] transition-colors">
              <textarea
                ref={taRef}
                value={value}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={c.placeholder}
                rows={1}
                className="flex-1 resize-none bg-transparent border-0 outline-none text-[15px] md:text-[16px] leading-[1.5] text-[#111827] placeholder:text-[var(--color-text-muted)] py-2 px-2 max-h-[160px]"
              />
              <button
                type="button"
                onClick={startVoice}
                disabled={!voiceSupported}
                aria-label={c.voiceAria}
                title={voiceSupported ? c.voiceAria : c.voiceUnsupported}
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--color-search-bg)] hover:bg-[var(--color-primary-soft)] text-[#1A1F1C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Mic size={18} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!value.trim()}
                aria-label={c.sendAria}
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                <Send size={18} strokeWidth={1.7} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
