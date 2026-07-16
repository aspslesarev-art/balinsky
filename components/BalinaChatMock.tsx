// Static, on-brand mockup of a Балина chat — used on the landing to SHOW the
// AI-broker experience: ask by voice or text, get answered, stay anonymous.
// Pure presentation (no state, no network), bilingual, crisp at any size —
// preferable to a blurry screenshot. Mirrors ConsultantWidget's styling.

import Image from 'next/image'
import { Mic, ArrowUp, Play, ShieldCheck } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    subtitle: 'AI-брокер · анонимно',
    greeting: 'Я Балина — AI-брокер. Опишите, что ищете, — подберу за минуту.',
    voice: 'Голосовое',
    reply: 'Нашёл 5 вилл в Чангу под аренду, доходность 9–11%. Показать с документами и расчётом?',
    chips: ['Показать виллы', 'Какие документы?'],
    placeholder: 'Напишите или скажите…',
    note: 'Голосом или текстом, анонимно. Контакты оставляете, только если хотите, чтобы с вами связались.',
  },
  en: {
    subtitle: 'AI broker · anonymous',
    greeting: "I'm Balina — your AI broker. Describe what you want and I'll shortlist in a minute.",
    voice: 'Voice message',
    reply: 'Found 5 villas in Canggu for rental, 9–11% yield. Show them with documents and the math?',
    chips: ['Show villas', 'What documents?'],
    placeholder: 'Type or speak…',
    note: 'By voice or text, anonymously. You leave contacts only if you want to be reached.',
  },
} as const

// Fixed bar heights for the voice waveform (no Math.random — stable render).
const WAVE = [5, 9, 14, 8, 17, 11, 6, 13, 18, 10, 7, 15, 9, 5, 12, 8]

export function BalinaChatMock({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div className="rounded-[26px] bg-white border border-[var(--color-border)] shadow-[0_24px_60px_-20px_rgba(16,42,30,0.35)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--color-primary-soft)] border-b border-[var(--color-border)]">
          <Image src="/balina.jpg" alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-[14px] font-semibold text-[#111827] leading-tight">Балина</div>
            <div className="text-[11px] text-[var(--color-text-muted)] leading-tight flex items-center gap-1">
              <ShieldCheck size={11} className="text-[var(--color-primary)]" /> {c.subtitle}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 bg-[var(--color-search-bg)] flex flex-col gap-3">
          {/* Balina greeting */}
          <div className="self-start max-w-[88%] rounded-2xl rounded-bl-md bg-white border border-[var(--color-border)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[#111827]">
            {c.greeting}
          </div>

          {/* User voice message */}
          <div className="self-end max-w-[80%] rounded-2xl rounded-br-md bg-[var(--color-primary)] text-white px-3 py-2.5 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 shrink-0">
              <Play size={13} fill="currentColor" strokeWidth={0} className="ml-0.5" />
            </span>
            <span className="flex items-end gap-[2px] h-5">
              {WAVE.map((h, i) => (
                <span key={i} className="w-[2.5px] rounded-full bg-white/85" style={{ height: `${h}px` }} />
              ))}
            </span>
            <span className="text-[11px] tabular-nums text-white/85 shrink-0">0:14</span>
          </div>

          {/* Balina reply + chips */}
          <div className="self-start max-w-[88%] rounded-2xl rounded-bl-md bg-white border border-[var(--color-border)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[#111827]">
            {c.reply}
          </div>
          <div className="self-start flex flex-wrap gap-1.5">
            {c.chips.map((chip, i) => (
              <span key={i} className="text-[12px] px-3 py-1.5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-primary-pressed)]">
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 p-3 border-t border-[var(--color-border)] bg-white">
          <span className="flex-1 text-[13px] text-[var(--color-text-muted)] px-3 py-2.5 rounded-2xl border border-[var(--color-border)] truncate">
            {c.placeholder}
          </span>
          <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/5 text-[#111827]">
            <Mic size={18} strokeWidth={1.8} />
          </span>
          <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] text-white">
            <ArrowUp size={18} strokeWidth={2.2} />
          </span>
        </div>
      </div>

      {/* Reassurance caption */}
      <p className="mt-4 text-[12.5px] leading-[1.5] text-[var(--color-text-muted)] flex items-start gap-2">
        <ShieldCheck size={15} strokeWidth={1.8} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
        {c.note}
      </p>
    </div>
  )
}
