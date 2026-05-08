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
    subtitle: 'Расскажу что есть в продаже, помогу определиться и свяжу с менеджером застройщика.',
    // Two placeholders: long one looks great on desktop, short one
    // fits the narrow mobile input without being cut.
    placeholder:       'Например: вилла в Чангу, 2 спальни, до $250K, под аренду…',
    placeholderMobile: 'Что вы ищете?',
    sendAria: 'Отправить сообщение',
    voiceAria: 'Записать голосом',
    voiceUnsupported: 'Голос не поддерживается этим браузером',
    altPhoto: 'AI-брокер Балина',
  },
  en: {
    eyebrow: 'AI broker',
    name: 'Balina',
    title: "I'll help you find Bali real estate",
    subtitle: "I'll tell you what's on the market, help you choose, and connect you with a developer manager.",
    placeholder:       'e.g. villa in Canggu, 2 bedrooms, up to $250K, for rental…',
    placeholderMobile: 'What are you looking for?',
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
  // Mobile-vs-desktop placeholder swap based on viewport width. Long
  // example copy gets cut to ~6 visible chars on iPhone SE because of
  // the two action buttons next to the input — the short version is
  // legible at any width.
  const [isNarrow, setIsNarrow] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
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
    <section className="pt-8 md:pt-14 pb-8 md:pb-10">
      <div className="rounded-3xl bg-gradient-to-br from-[var(--color-primary-soft)] via-white to-white border border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 md:gap-10 p-5 md:p-10 md:items-center">
          {/* Portrait — smaller on mobile so the input row gets the
              real estate it needs. Centered above copy on narrow
              screens, left of copy on md+. */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <div className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[260px] md:h-[260px] rounded-full overflow-hidden ring-4 ring-white shadow-[0_20px_50px_-15px_rgba(31,90,52,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/balina.jpg"
                  alt={c.altPhoto}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Sparkle badge — subtle "this is AI" marker so visitors
                  understand this isn't a human staffer they're texting. */}
              <div className="absolute -bottom-1 -right-1 inline-flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] md:text-[11px] font-medium shadow-[0_4px_12px_rgba(31,90,52,0.3)]">
                <Sparkles size={11} fill="currentColor" strokeWidth={0} />
                AI
              </div>
            </div>
          </div>

          {/* Copy + input */}
          <div className="text-center md:text-left">
            <div className="text-[11px] md:text-[12px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-semibold mb-1.5 md:mb-2">
              {c.eyebrow} · {c.name}
            </div>
            <h1 className="text-[22px] sm:text-[26px] md:text-[42px] font-semibold tracking-tight text-[#111827] leading-[1.15] md:leading-[1.1] mb-2.5 md:mb-3">
              {c.title}
            </h1>
            <p className="text-[14px] md:text-[16px] text-[var(--color-text-muted)] leading-relaxed mb-4 md:mb-5 max-w-2xl mx-auto md:mx-0">
              {c.subtitle}
            </p>

            {/* Input row — tighter padding + gap on mobile so the
                textarea owns the visible width with both action
                buttons still hitting the 44px touch-target floor. */}
            <div className="flex items-end gap-1.5 md:gap-2 bg-white rounded-2xl border border-[var(--color-border)] p-1.5 md:p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus-within:border-[var(--color-primary)] transition-colors">
              <textarea
                ref={taRef}
                value={value}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={isNarrow ? c.placeholderMobile : c.placeholder}
                rows={1}
                className="flex-1 min-w-0 resize-none bg-transparent border-0 outline-none text-[15px] md:text-[16px] leading-[1.45] text-[#111827] placeholder:text-[var(--color-text-muted)] py-2 px-2.5 max-h-[160px]"
              />
              <button
                type="button"
                onClick={startVoice}
                disabled={!voiceSupported}
                aria-label={c.voiceAria}
                title={voiceSupported ? c.voiceAria : c.voiceUnsupported}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[var(--color-search-bg)] hover:bg-[var(--color-primary-soft)] text-[#1A1F1C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Mic size={18} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!value.trim()}
                aria-label={c.sendAria}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
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
