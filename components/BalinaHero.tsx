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

// Cycling typewriter placeholder: types each example char-by-char,
// holds the full sentence, deletes it, types the next. Pauses entirely
// when `paused` is true.
//
// Timing knobs are tuned for a calm, premium feel — not a jittery
// terminal. Per-char delay has a small Gaussian-ish jitter so it
// doesn't feel mechanical; punctuation pauses a beat longer.
function useTypewriter(examples: readonly string[], paused: boolean): string {
  const [text, setText] = useState('')
  useEffect(() => {
    if (paused || examples.length === 0) { setText(''); return }
    let cancelled = false
    let i = 0
    let pos = 0
    let phase: 'typing' | 'holding' | 'erasing' = 'typing'
    let timer: ReturnType<typeof setTimeout> | null = null

    const baseTypeMs = 55
    const baseEraseMs = 12   // erase is mechanical, do it briskly
    const holdMs = 2400
    const betweenMs = 320    // short gap before the next example starts

    const charDelay = (ch: string): number => {
      // Slow down a beat on commas / dashes — gives the eye time to
      // catch up on phrases.
      const extra = /[.,—–:;]/.test(ch) ? 240 : 0
      // ±30% jitter so it doesn't feel like a stuttering terminal.
      const jitter = (Math.random() - 0.5) * 0.6
      return Math.round(baseTypeMs * (1 + jitter)) + extra
    }

    const tick = () => {
      if (cancelled) return
      const current = examples[i]
      if (phase === 'typing') {
        pos++
        setText(current.slice(0, pos))
        if (pos >= current.length) {
          phase = 'holding'
          timer = setTimeout(tick, holdMs)
        } else {
          timer = setTimeout(tick, charDelay(current[pos - 1] ?? ''))
        }
      } else if (phase === 'holding') {
        phase = 'erasing'
        timer = setTimeout(tick, baseEraseMs)
      } else {
        pos--
        setText(current.slice(0, Math.max(0, pos)))
        if (pos <= 0) {
          i = (i + 1) % examples.length
          phase = 'typing'
          timer = setTimeout(tick, betweenMs)
        } else {
          timer = setTimeout(tick, baseEraseMs)
        }
      }
    }
    tick()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [examples, paused])
  return text
}

const COPY = {
  ru: {
    eyebrow: 'AI-брокер',
    name: 'Балина',
    title: 'Помогу подобрать недвижимость на Бали',
    subtitle: 'Расскажу что есть в продаже, помогу определиться и свяжу с менеджером застройщика.',
    // Static fallback shown on mobile + first render (before animation
    // hook fires). The desktop placeholder is replaced by a cycling
    // typewriter of varied EXAMPLES below.
    placeholderMobile: 'Что вы ищете?',
    sendAria: 'Отправить сообщение',
    voiceAria: 'Записать голосом',
    voiceUnsupported: 'Голос не поддерживается этим браузером',
    altPhoto: 'AI-брокер Балина',
    examples: [
      'Переехать с семьёй — двое детей 14 и 7 лет, важны школы. Бюджет ~$600K, жить полгода, сдавать помесячно.',
      'Вилла 2 спальни, Букит или Санур, до $400K',
      'Виды на океан или рисовые террасы — обязательно',
      'Катаюсь на сёрфе, нужен пеший доступ к спотам',
      'Апартамент под Booking, доходность 10%+',
    ],
    examplesMobile: [
      'Вилла 2BR, Букит, до $400K',
      'Виды на океан',
      'Школы для двоих детей',
      'Пешком до серф-спотов',
      'Под Booking, 10%+',
    ],
  },
  en: {
    eyebrow: 'AI broker',
    name: 'Balina',
    title: "I'll help you find Bali real estate",
    subtitle: "I'll tell you what's on the market, help you choose, and connect you with a developer manager.",
    placeholderMobile: 'What are you looking for?',
    sendAria: 'Send message',
    voiceAria: 'Record by voice',
    voiceUnsupported: 'Voice input is not supported in this browser',
    altPhoto: 'AI broker Balina',
    examples: [
      'Relocating with family — two kids aged 14 and 7, schools matter. Budget ~$600K, live half the year, rent the rest.',
      'Villa, 2BR, Bukit or Sanur, up to $400K',
      'Views matter — ocean or rice terraces',
      'I surf, walking distance to the break is a must',
      'Apartment for Booking, 10%+ cap rate',
    ],
    examplesMobile: [
      'Villa 2BR, Bukit, up to $400K',
      'Ocean view',
      'Schools for two kids',
      'Walking distance to surf',
      'For Booking, 10%+',
    ],
  },
} as const

export function BalinaHero() {
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const c = COPY[lang]

  const [value, setValue] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Pause animation once the visitor engages.
  const animationPaused = focused || value.length > 0
  // Mobile uses shorter example strings — the long desktop sentences
  // get clipped to the first few chars in a narrow input and look
  // broken half-typed.
  const exampleSet = isNarrow ? c.examplesMobile : c.examples
  const typed = useTypewriter(exampleSet, animationPaused)
  const placeholder = typed || exampleSet[0] || c.placeholderMobile

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Voice input is now driven by MediaRecorder + /api/transcribe.
    setVoiceSupported(typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const send = () => {
    const text = value.trim()
    if (!text) return
    window.dispatchEvent(new CustomEvent('balina:open', { detail: { text, autoSend: true } }))
    setValue('')
  }
  const startVoice = () => {
    if (!voiceSupported) return
    window.dispatchEvent(new CustomEvent('balina:open', { detail: { listen: true } }))
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] md:text-[16px] leading-[1.45] text-[#111827] placeholder:text-[var(--color-text-muted)] py-2.5 px-2.5"
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
