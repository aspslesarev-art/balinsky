// Static, on-brand mockup of a Балиса chat — used on the landing to SHOW the
// AI-broker experience: ask by voice or text, get answered, stay anonymous.
// Pure presentation (no state, no network), bilingual, crisp at any size —
// preferable to a blurry screenshot. Mirrors ConsultantWidget's styling.

import Image from 'next/image'
import { Mic, ArrowUp, Play, ShieldCheck } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    subtitle: 'AI-брокер · анонимно',
    greeting: 'Я Балиса — AI-брокер. Опишите, что ищете, — подберу за минуту.',
    voice: 'Голосовое',
    reply: 'Нашёл 5 вилл в Чангу под аренду, доходность 9–11%. Показать с документами и расчётом?',
    chips: ['Показать виллы', 'Какие документы?'],
    placeholder: 'Напишите или скажите…',
    note: 'Голосом или текстом, анонимно. Контакты оставляете, только если хотите, чтобы с вами связались.',
  },
  en: {
    subtitle: 'AI broker · anonymous',
    greeting: "I'm Balisa — your AI broker. Describe what you want and I'll shortlist in a minute.",
    voice: 'Voice message',
    reply: 'Found 5 villas in Canggu for rental, 9–11% yield. Show them with documents and the math?',
    chips: ['Show villas', 'What documents?'],
    placeholder: 'Type or speak…',
    note: 'By voice or text, anonymously. You leave contacts only if you want to be reached.',
  },
  id: {
    subtitle: 'Broker AI · anonim',
    greeting: 'Saya Balisa — broker AI. Jelaskan apa yang Anda cari, dan saya akan menyusun daftar pilihan dalam satu menit.',
    voice: 'Pesan suara',
    reply: 'Menemukan 5 vila di Canggu untuk disewakan, imbal hasil 9–11%. Tampilkan beserta dokumen dan perhitungannya?',
    chips: ['Tampilkan vila', 'Dokumen apa saja?'],
    placeholder: 'Ketik atau ucapkan…',
    note: 'Lewat suara atau teks, secara anonim. Anda meninggalkan kontak hanya jika ingin dihubungi.',
  },
  fr: {
    subtitle: 'Courtier IA · anonyme',
    greeting: 'Je suis Balisa — votre courtier IA. Décrivez ce que vous cherchez et je vous fais une présélection en une minute.',
    voice: 'Message vocal',
    reply: 'J’ai trouvé 5 villas à Canggu pour la location, rendement de 9 à 11 %. Les afficher avec les documents et les calculs ?',
    chips: ['Afficher les villas', 'Quels documents ?'],
    placeholder: 'Écrivez ou parlez…',
    note: 'Par la voix ou le texte, en toute anonymité. Vous ne laissez vos coordonnées que si vous souhaitez être contacté.',
  },
  de: {
    subtitle: 'KI-Makler · anonym',
    greeting: 'Ich bin Balisa — Ihr KI-Makler. Beschreiben Sie, was Sie suchen, und ich stelle in einer Minute eine Auswahl zusammen.',
    voice: 'Sprachnachricht',
    reply: 'Ich habe 5 Villen in Canggu zur Vermietung gefunden, 9–11 % Rendite. Mit Unterlagen und Kalkulation anzeigen?',
    chips: ['Villen anzeigen', 'Welche Unterlagen?'],
    placeholder: 'Schreiben oder sprechen…',
    note: 'Per Sprache oder Text, anonym. Kontaktdaten hinterlassen Sie nur, wenn Sie erreicht werden möchten.',
  },
  zh: {
    subtitle: 'AI 经纪人 · 匿名',
    greeting: '我是 Balisa——您的 AI 经纪人。描述您想要的，我一分钟内为您筛选。',
    voice: '语音消息',
    reply: '在 Canggu 找到 5 套可出租别墅，收益率 9–11%。要连同文件和测算一起展示吗？',
    chips: ['查看别墅', '需要哪些文件？'],
    placeholder: '输入或说话…',
    note: '通过语音或文字，匿名进行。只有在您希望被联系时才留下联系方式。',
  },
  nl: {
    subtitle: 'AI-makelaar · anoniem',
    greeting: 'Ik ben Balisa — uw AI-makelaar. Beschrijf wat u zoekt en ik stel binnen een minuut een selectie samen.',
    voice: 'Spraakbericht',
    reply: '5 villa\'s in Canggu voor verhuur gevonden, rendement 9–11%. Tonen met documenten en berekening?',
    chips: ["Villa's tonen", 'Welke documenten?'],
    placeholder: 'Typ of spreek…',
    note: 'Via spraak of tekst, anoniem. U laat alleen contactgegevens achter als u benaderd wilt worden.',
  },
  ban: {
    subtitle: 'Broker AI · anonim',
    greeting: 'Tiang Balisa — broker AI. Jlentrehang napi sane karereh, tiang jagi nyiapang pilihan sajeroning awai.',
    voice: 'Pesan suara',
    reply: 'Manggihin 5 vila ring Canggu buat kasewaang, hasil 9–11%. Edengang sareng dokumen miwah itungan?',
    chips: ['Edengang vila', 'Dokumen napi?'],
    placeholder: 'Tulis utawi baosang…',
    note: 'Lewat suara utawi teks, anonim. Kontak kakutang wantah yening meled kahubungin.',
  },
} as const

// Fixed bar heights for the voice waveform (no Math.random — stable render).
const WAVE = [5, 9, 14, 8, 17, 11, 6, 13, 18, 10, 7, 15, 9, 5, 12, 8]

export function BalinaChatMock({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  return (
    <div className="w-full max-w-[420px] mx-auto" data-llm-skip="">
      <div className="rounded-[26px] bg-white border border-[var(--color-border)] shadow-[0_24px_60px_-20px_rgba(16,42,30,0.35)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--color-primary-soft)] border-b border-[var(--color-border)]">
          <Image src="/balina.jpg" alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-[14px] font-semibold text-[#111827] leading-tight">{pickCopy({ ru: 'Балиса', en: 'Balisa', id: 'Balisa', fr: 'Balisa', de: 'Balisa', zh: 'Balisa', nl: 'Balisa', ban: 'Balisa' }, lang)}</div>
            <div className="text-[11px] text-[var(--color-text-muted)] leading-tight flex items-center gap-1">
              <ShieldCheck size={11} className="text-[var(--color-primary)]" /> {c.subtitle}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 bg-[var(--color-search-bg)] flex flex-col gap-3">
          {/* Balisa greeting */}
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

          {/* Balisa reply + chips */}
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
