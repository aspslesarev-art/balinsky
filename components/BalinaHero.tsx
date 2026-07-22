'use client'

// Home-page hero block: Балиса — our AI broker.
//
// Big circular portrait + intro copy + a fat input row with a voice
// mic and a send button. Submitting (Enter or send) opens the
// existing ConsultantWidget chat panel pre-filled with the typed
// text and auto-sends it. The voice button opens the widget and
// kicks the speech-recognition state straight away. Image lives at
// /balina.jpg.

import { useState, useRef, useEffect } from 'react'
import { detectLang, pickCopy } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Mic, Send, Sparkles } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// Cycling typewriter placeholder. Predictable rhythm — characters
// at a fixed cadence, just a slightly longer pause after punctuation
// so the eye can catch up. No random jitter (it read as "stuttering"
// in practice). Phase machine: type → hold full sentence → blank →
// short beat → next sentence from scratch.
function useTypewriter(examples: readonly string[], paused: boolean): string {
  const [text, setText] = useState('')
  useEffect(() => {
    if (paused || examples.length === 0) { setText(''); return }
    let cancelled = false
    let i = 0
    let pos = 0
    let phase: 'typing' | 'holding' = 'typing'
    let timer: ReturnType<typeof setTimeout> | null = null

    const typeMs = 60        // fixed cadence, no jitter
    const punctPauseMs = 220 // extra after . , — – : ;
    const holdMs = 2400      // full sentence display time
    const blankMs = 480      // beat with empty field before next phrase

    const delayAfter = (ch: string): number =>
      typeMs + (/[.,—–:;]/.test(ch) ? punctPauseMs : 0)

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
          timer = setTimeout(tick, delayAfter(current[pos - 1] ?? ''))
        }
      } else {
        setText('')
        i = (i + 1) % examples.length
        pos = 0
        phase = 'typing'
        timer = setTimeout(tick, blankMs)
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
    name: 'Балиса',
    title: 'Помогу подобрать недвижимость на Бали',
    subtitle: 'Расскажу что есть в продаже, помогу определиться и свяжу с менеджером застройщика.',
    // Static fallback shown on mobile + first render (before animation
    // hook fires). The desktop placeholder is replaced by a cycling
    // typewriter of varied EXAMPLES below.
    placeholderMobile: 'Что вы ищете?',
    sendAria: 'Отправить сообщение',
    voiceAria: 'Записать голосом',
    voiceUnsupported: 'Голос не поддерживается этим браузером',
    altPhoto: 'AI-брокер Балиса',
    examples: [
      'Семья с двумя детьми, важны школы — бюджет ~$600K',
      'Вилла 2 спальни, Букит или Санур, до $400K',
      'Хочу виды на океан или рисовые террасы',
      'Сёрфер: пешком до спота, до $500K',
      'Под Booking, доходность 10%+, новостройка',
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
    name: 'Balisa',
    title: "I'll help you find Bali real estate",
    subtitle: "I'll tell you what's on the market, help you choose, and connect you with a developer manager.",
    placeholderMobile: 'What are you looking for?',
    sendAria: 'Send message',
    voiceAria: 'Record by voice',
    voiceUnsupported: 'Voice input is not supported in this browser',
    altPhoto: 'AI broker Balisa',
    examples: [
      'Family with two kids, schools matter — budget ~$600K',
      'Villa, 2BR, Bukit or Sanur, up to $400K',
      'Ocean or rice-terrace views, must-have',
      'Surfer: walking distance to a break, up to $500K',
      'For Booking, 10%+ cap rate, new-build',
    ],
    examplesMobile: [
      'Villa 2BR, Bukit, up to $400K',
      'Ocean view',
      'Schools for two kids',
      'Walking distance to surf',
      'For Booking, 10%+',
    ],
  },
  id: {
    eyebrow: 'Broker AI',
    name: 'Balisa',
    title: 'Saya bantu Anda menemukan properti di Bali',
    subtitle: 'Saya beri tahu apa yang ada di pasar, bantu Anda memilih, dan hubungkan Anda dengan manajer pengembang.',
    placeholderMobile: 'Apa yang Anda cari?',
    sendAria: 'Kirim pesan',
    voiceAria: 'Rekam dengan suara',
    voiceUnsupported: 'Input suara tidak didukung di peramban ini',
    altPhoto: 'Broker AI Balisa',
    examples: [
      'Keluarga dengan dua anak, sekolah penting — anggaran ~$600K',
      'Vila 2 kamar tidur, Bukit atau Sanur, hingga $400K',
      'Pemandangan laut atau teras sawah, wajib ada',
      'Peselancar: jarak jalan kaki ke ombak, hingga $500K',
      'Untuk Booking, imbal hasil 10%+, bangunan baru',
    ],
    examplesMobile: [
      'Vila 2BR, Bukit, hingga $400K',
      'Pemandangan laut',
      'Sekolah untuk dua anak',
      'Jalan kaki ke spot selancar',
      'Untuk Booking, 10%+',
    ],
  },
  fr: {
    eyebrow: 'Courtier IA',
    name: 'Balisa',
    title: 'Je vous aide à trouver un bien immobilier à Bali',
    subtitle: 'Je vous dis ce qui est sur le marché, je vous aide à choisir et je vous mets en relation avec un gestionnaire promoteur.',
    placeholderMobile: 'Que recherchez-vous ?',
    sendAria: 'Envoyer le message',
    voiceAria: 'Enregistrer par la voix',
    voiceUnsupported: 'La saisie vocale n’est pas prise en charge par ce navigateur',
    altPhoto: 'Courtier IA Balisa',
    examples: [
      'Famille avec deux enfants, les écoles comptent — budget ~$600K',
      'Villa, 2 chambres, Bukit ou Sanur, jusqu’à $400K',
      'Vue sur l’océan ou les rizières, indispensable',
      'Surfeur : à distance de marche d’un spot, jusqu’à $500K',
      'Pour Booking, rendement 10%+, neuf',
    ],
    examplesMobile: [
      'Villa 2BR, Bukit, jusqu’à $400K',
      'Vue sur l’océan',
      'Écoles pour deux enfants',
      'À pied des spots de surf',
      'Pour Booking, 10%+',
    ],
  },
  de: {
    eyebrow: 'KI-Makler',
    name: 'Balisa',
    title: 'Ich helfe Ihnen, Immobilien auf Bali zu finden',
    subtitle: 'Ich sage Ihnen, was auf dem Markt ist, helfe bei der Auswahl und verbinde Sie mit einem Bauträger-Manager.',
    placeholderMobile: 'Wonach suchen Sie?',
    sendAria: 'Nachricht senden',
    voiceAria: 'Per Sprache aufnehmen',
    voiceUnsupported: 'Spracheingabe wird von diesem Browser nicht unterstützt',
    altPhoto: 'KI-Makler Balisa',
    examples: [
      'Familie mit zwei Kindern, Schulen wichtig — Budget ~$600K',
      'Villa, 2 Schlafzimmer, Bukit oder Sanur, bis $400K',
      'Meer- oder Reisterrassenblick, ein Muss',
      'Surfer: zu Fuß zum Break, bis $500K',
      'Für Booking, 10%+ Rendite, Neubau',
    ],
    examplesMobile: [
      'Villa 2BR, Bukit, bis $400K',
      'Meerblick',
      'Schulen für zwei Kinder',
      'Zu Fuß zum Surfspot',
      'Für Booking, 10%+',
    ],
  },
  zh: {
    eyebrow: 'AI 经纪人',
    name: 'Balisa',
    title: '我帮您在巴厘岛找到房产',
    subtitle: '我会告诉您市场上有什么，帮您做选择，并为您对接开发商经理。',
    placeholderMobile: '您在找什么？',
    sendAria: '发送消息',
    voiceAria: '用语音录制',
    voiceUnsupported: '此浏览器不支持语音输入',
    altPhoto: 'AI 经纪人 Balisa',
    examples: [
      '一家四口，两个孩子，重视学校——预算约 $600K',
      '别墅，2 卧，Bukit 或 Sanur，$400K 以内',
      '必须有海景或稻田梯田景观',
      '冲浪者：步行可达浪点，$500K 以内',
      '用于 Booking，10%+ 回报率，新建房',
    ],
    examplesMobile: [
      '别墅 2 卧，Bukit，$400K 以内',
      '海景',
      '两个孩子的学校',
      '步行可达冲浪点',
      '用于 Booking，10%+',
    ],
  },
  nl: {
    eyebrow: 'AI-makelaar',
    name: 'Balisa',
    title: 'Ik help u vastgoed op Bali te vinden',
    subtitle: 'Ik vertel u wat er op de markt is, help u kiezen en breng u in contact met een projectontwikkelaar-manager.',
    placeholderMobile: 'Waar bent u naar op zoek?',
    sendAria: 'Bericht verzenden',
    voiceAria: 'Opnemen met spraak',
    voiceUnsupported: 'Spraakinvoer wordt niet ondersteund in deze browser',
    altPhoto: 'AI-makelaar Balisa',
    examples: [
      'Gezin met twee kinderen, scholen zijn belangrijk — budget ~$600K',
      'Villa, 2 slaapkamers, Bukit of Sanur, tot $400K',
      'Uitzicht op zee of rijstterrassen, een must',
      'Surfer: op loopafstand van een break, tot $500K',
      'Voor Booking, 10%+ rendement, nieuwbouw',
    ],
    examplesMobile: [
      "Villa 2BR, Bukit, tot $400K",
      'Zeezicht',
      'Scholen voor twee kinderen',
      'Op loopafstand van surfspots',
      'Voor Booking, 10%+',
    ],
  },
  ban: {
    eyebrow: 'Broker AI',
    name: 'Balisa',
    title: 'Tiang nulungin ngrereh properti ring Bali',
    subtitle: 'Tiang jagi nyritayang napi sane wenten ring pasar, nulungin milih, tur nyambungang ka manajer pangwangun.',
    placeholderMobile: 'Napi sane karereh?',
    sendAria: 'Kirim pesan',
    voiceAria: 'Rekam nganggen suara',
    voiceUnsupported: 'Input suara nenten kadukung ring peramban puniki',
    altPhoto: 'Broker AI Balisa',
    examples: [
      'Kulawarga sareng pianak kalih, sekolah penting — anggaran ~$600K',
      'Vila, 2 kamar, Bukit utawi Sanur, kantos $400K',
      'Pemandangan segara utawi teras carik, patut wenten',
      'Peselancar: dados mamargi ka ombak, kantos $500K',
      'Buat Booking, hasil 10%+, wangunan anyar',
    ],
    examplesMobile: [
      'Vila 2BR, Bukit, kantos $400K',
      'Pemandangan segara',
      'Sekolah buat pianak kalih',
      'Mamargi ka spot selancar',
      'Buat Booking, 10%+',
    ],
  },
  pl: {
    eyebrow: 'Broker AI',
    name: 'Balisa',
    title: 'Pomogę Ci znaleźć nieruchomość na Bali',
    subtitle: 'Powiem, co jest na rynku, pomogę wybrać i połączę Cię z menedżerem dewelopera.',
    placeholderMobile: 'Czego szukasz?',
    sendAria: 'Wyślij wiadomość',
    voiceAria: 'Nagraj głosem',
    voiceUnsupported: 'Wprowadzanie głosowe nie jest obsługiwane w tej przeglądarce',
    altPhoto: 'Broker AI Balisa',
    examples: [
      'Rodzina z dwójką dzieci, ważne szkoły — budżet ~$600K',
      'Willa, 2 sypialnie, Bukit lub Sanur, do $400K',
      'Widok na ocean lub tarasy ryżowe, koniecznie',
      'Surfer: spacerem do fal, do $500K',
      'Pod Booking, rentowność 10%+, nowa inwestycja',
    ],
    examplesMobile: [
      'Willa 2BR, Bukit, do $400K',
      'Widok na ocean',
      'Szkoły dla dwójki dzieci',
      'Spacerem do surfingu',
      'Pod Booking, 10%+',
    ],
  },
  uk: {
    eyebrow: 'AI-брокер',
    name: 'Balisa',
    title: 'Допоможу знайти нерухомість на Балі',
    subtitle: 'Розкажу, що є в продажу, допоможу визначитися та зв’яжу з менеджером забудовника.',
    placeholderMobile: 'Що ви шукаєте?',
    sendAria: 'Надіслати повідомлення',
    voiceAria: 'Записати голосом',
    voiceUnsupported: 'Голосове введення не підтримується цим браузером',
    altPhoto: 'AI-брокер Balisa',
    examples: [
      'Сім’я з двома дітьми, важливі школи — бюджет ~$600K',
      'Віла 2 спальні, Букіт або Санур, до $400K',
      'Хочу краєвиди на океан або рисові тераси',
      'Серфер: пішки до спота, до $500K',
      'Під Booking, дохідність 10%+, новобудова',
    ],
    examplesMobile: [
      'Віла 2BR, Букіт, до $400K',
      'Краєвиди на океан',
      'Школи для двох дітей',
      'Пішки до серф-спотів',
      'Під Booking, 10%+',
    ],
  },
} as const

export function BalinaHero() {
  const pathname = usePathname() ?? ''
  const lang: Lang = detectLang(pathname)
  const c = pickCopy(COPY, lang)

  const [value, setValue] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Mobile uses shorter example strings — the long desktop sentences
  // get clipped to the first few chars in a narrow input and look
  // broken half-typed.
  const exampleSet = isNarrow ? c.examplesMobile : c.examples

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
    <section className="pt-8 md:pt-14 pb-8 md:pb-10" data-llm-skip="">
      <div className="rounded-3xl bg-gradient-to-br from-[var(--color-primary-soft)] via-white to-white border border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 md:gap-10 p-5 md:p-10 md:items-center">
          {/* Portrait — smaller on mobile so the input row gets the
              real estate it needs. Centered above copy on narrow
              screens, left of copy on md+. */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <div className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[260px] md:h-[260px] rounded-full overflow-hidden ring-4 ring-white shadow-[0_20px_50px_-15px_rgba(31,90,52,0.25)]">
                <Image
                  src="/balina.jpg"
                  alt={c.altPhoto}
                  fill
                  sizes="(max-width: 640px) 140px, (max-width: 768px) 180px, 260px"
                  priority
                  className="object-cover"
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
              {/* Real input. No placeholder attribute — animation lives in
                  the TypewriterOverlay below so the browser doesn't have
                  to re-shape the input on every char. */}
              <div className="relative flex-1 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={onKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  aria-label={c.placeholderMobile}
                  className="relative z-10 w-full bg-transparent border-0 outline-none text-[15px] md:text-[16px] leading-[1.45] text-[#111827] py-2.5 px-2.5"
                />
                {value.length === 0 && !focused && (
                  <TypewriterOverlay examples={exampleSet} />
                )}
              </div>
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

// Animated placeholder overlay. Sits absolutely above the input
// (z-index 0, real input is z-10). Renders a div whose text content
// changes char-by-char — much cheaper than poking the input's
// `placeholder` attribute (the browser re-shapes the input on every
// placeholder change, which is what showed up as "jank"). A blinking
// caret at the cursor position makes the animation feel intentional.
function TypewriterOverlay({ examples }: { examples: readonly string[] }) {
  const text = useTypewriter(examples, false)
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center px-2.5 pointer-events-none select-none text-[15px] md:text-[16px] leading-[1.45] text-[var(--color-text-muted)] overflow-hidden whitespace-nowrap"
    >
      <span>{text}</span>
      <span className="ml-[1px] inline-block w-[1.5px] h-[1.05em] bg-[var(--color-text-muted)] align-middle balina-caret" />
    </div>
  )
}
