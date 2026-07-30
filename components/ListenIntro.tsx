'use client'

// Кнопка «Послушать» рядом с названием объекта: короткий устный рассказ
// голосом Андрея, без открытия чата.
//
// Первое нажатие по объекту может занять несколько секунд — сервер пишет
// сценарий и синтезирует речь. Дальше и текст, и mp3 закэшированы, так что
// для всех следующих посетителей звук стартует сразу.
import { useEffect, useRef, useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

const LABEL = { ru: 'Послушать', en: 'Listen', id: 'Dengarkan', fr: 'Écouter', de: 'Anhören', zh: '收听', nl: 'Luisteren', ban: 'Dengarkan', pl: 'Posłuchaj', uk: 'Послухати' }
const STOP = { ru: 'Стоп', en: 'Stop', id: 'Berhenti', fr: 'Arrêter', de: 'Stopp', zh: '停止', nl: 'Stoppen', ban: 'Suudang', pl: 'Zatrzymaj', uk: 'Стоп' }
const WAIT = { ru: 'Готовлю…', en: 'Preparing…', id: 'Menyiapkan…', fr: 'Préparation…', de: 'Bereite vor…', zh: '准备中…', nl: 'Voorbereiden…', ban: 'Nyiapang…', pl: 'Przygotowuję…', uk: 'Готую…' }

type Phase = 'idle' | 'loading' | 'playing'

export function ListenIntro({ id, lang }: { id: string; lang: Lang }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  const cleanup = () => {
    const audio = audioRef.current
    if (audio) {
      // pause() не вызывает ended/error — обработчики снимаем сами.
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audioRef.current = null
    }
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
  }

  // Ушли со страницы — голос замолкает.
  useEffect(() => () => cleanup(), [])

  const stop = () => { cleanup(); setPhase('idle') }

  const play = async () => {
    setPhase('loading')
    try {
      const res = await fetch('/api/voice-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, lang }),
      })
      if (!res.ok) { setPhase('idle'); return }
      const url = URL.createObjectURL(await res.blob())
      urlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      const done = () => stop()
      audio.onended = done
      audio.onerror = done
      await audio.play()
      setPhase('playing')
    } catch {
      setPhase('idle')
    }
  }

  const label = phase === 'playing'
    ? pickCopy(STOP, lang)
    : phase === 'loading' ? pickCopy(WAIT, lang) : pickCopy(LABEL, lang)
  const isBusy = phase !== 'idle'

  return (
    <button
      type="button"
      onClick={phase === 'playing' ? stop : play}
      disabled={phase === 'loading'}
      aria-label={label}
      title={label}
      className={`shrink-0 inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border text-[13px] font-medium transition-colors disabled:opacity-70 ${
        isBusy
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]'
          : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-pressed)]'
      }`}
    >
      {phase === 'loading'
        ? <Loader2 size={15} className="animate-spin" />
        : phase === 'playing'
          ? <Square size={15} strokeWidth={2.4} fill="currentColor" />
          : <Play size={15} strokeWidth={2.4} fill="currentColor" />}
      {label}
    </button>
  )
}
