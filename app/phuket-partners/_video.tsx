'use client'

// Ролик-питч в герое лендинга.
//
// Стартует по клику, а не автоплеем: озвучка — суть ролика, а браузеры
// глушат автозапуск со звуком, поэтому автоплей дал бы немую картинку и
// зритель не понял бы, что потерял. До клика показываем постер и кнопку.
//
// Если браузер отказал в воспроизведении со звуком (жёсткая политика,
// экономия трафика), не молчим: запускаем без звука и честно предлагаем
// включить его вторым касанием.

import { useRef, useState } from 'react'
import { Play, Volume2 } from 'lucide-react'

type Props = {
  src: string
  poster: string
  /** Подпись под плеером — что это и сколько длится. */
  caption?: string
}

export function PitchVideo({ src, poster, caption }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [failed, setFailed] = useState(false)

  async function start() {
    const el = ref.current
    if (!el) return

    setStarted(true)
    try {
      el.muted = false
      await el.play()
    } catch {
      // Со звуком не дали — играем без него, но говорим об этом.
      try {
        el.muted = true
        setMuted(true)
        await el.play()
      } catch {
        setFailed(true)
        setStarted(false)
      }
    }
  }

  async function unmute() {
    const el = ref.current
    if (!el) return
    el.muted = false
    setMuted(false)
    try {
      await el.play()
    } catch {
      setMuted(true)
    }
  }

  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#071A22] shadow-sm">
        <video
          ref={ref}
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          controls={started}
          controlsList="nodownload"
          className="block w-full aspect-video"
          onEnded={() => setStarted(false)}
        />

        {!started && (
          <button
            type="button"
            onClick={start}
            aria-label="Смотреть ролик, 60 секунд, со звуком"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/55 transition-colors hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg md:h-20 md:w-20">
              <Play className="ml-1 h-6 w-6 text-[var(--color-primary-pressed)] md:h-7 md:w-7" fill="currentColor" />
            </span>
            <span className="text-[12px] md:text-[13px] uppercase tracking-[0.18em] font-semibold text-white/90">
              60 секунд · со звуком
            </span>
          </button>
        )}

        {started && muted && (
          <button
            type="button"
            onClick={unmute}
            className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[13px] font-semibold text-[var(--color-primary-pressed)] shadow-md"
          >
            <Volume2 className="h-4 w-4" />
            Включить звук
          </button>
        )}
      </div>

      {(caption || failed) && (
        <figcaption className="mt-3 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          {failed
            ? 'Не удалось запустить ролик — всё то же самое расписано ниже на странице.'
            : caption}
        </figcaption>
      )}
    </figure>
  )
}
