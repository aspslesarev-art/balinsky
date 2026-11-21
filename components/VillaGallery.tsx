'use client'

// The villa page's media block: one big photo that pages left/right in place,
// and under it a row of «feature» tiles — floor plans, master plan, video, sun,
// 3D map (owner's mock-up «Медиаблок виллы», variant A, 2026-11-10). Clicking
// the photo or a tile opens the full-screen viewer on that tab.
// Floor plans = audit «document» images (lib/listing-photos.ts) + the 3D model,
// when the villa has one (lib/villa-3d-plans.ts).

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image, { type ImageProps } from 'next/image'
import { Play, Pause, MapPinned, Rotate3d, Megaphone, Volume2, VolumeX } from 'lucide-react'
import type { PromoKit } from '@/lib/promo-kits'
import { MediaViewer, ytThumb, type GalleryVideo, type Tab, type ViewerTab } from './MediaViewer'
import { pickCopy, type Lang } from '@/lib/i18n'
import { WishlistButton, type WishlistInput } from './WishlistButton'
import { MEDIA_TILE, MediaTileLabel } from './media-tile'

export type { GalleryVideo, ViewerTab } from './MediaViewer'

// Кнопка Play на главном фото (владелец 19.11.2026): фото сменяются одно за
// другим «как при наведении в каталоге» — тот же приём, что в PhotoSlider:
// два слоя, у каждого фото одно непрерывное движение (photo-motion-*),
// верхний гаснет, под ним уже стоит следующий; внизу бежит полоса.
const ADVANCE_MS = 2000
const FADE_MS = 600
const PRESETS = 6

const COPY = {
  ru: { mute: 'Без звука', unmute: 'Включить звук', play: 'Смотреть слайд-шоу', pause: 'Пауза', promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Видео', plans: 'Планировки', model3d: '3D-модель', open: 'Открыть фото', close: 'Закрыть', prev: 'Назад', next: 'Вперёд', more: (n: number) => `+${n} фото` },
  en: { mute: 'Mute', unmute: 'Unmute', play: 'Play slideshow', pause: 'Pause', promo: 'Marketing', tour: '3D tour', master: 'Master plan', photos: 'Photos', videos: 'Videos', plans: 'Floor plans', model3d: '3D model', open: 'Open photo', close: 'Close', prev: 'Previous', next: 'Next', more: (n: number) => `+${n} photos` },
  id: { mute: 'Bisukan', unmute: 'Nyalakan suara', play: 'Putar tayangan slide', pause: 'Jeda', promo: 'Materi promosi', tour: 'Tur 3D', master: 'Masterplan', photos: 'Foto', videos: 'Video', plans: 'Denah', model3d: 'Model 3D', open: 'Buka foto', close: 'Tutup', prev: 'Sebelumnya', next: 'Berikutnya', more: (n: number) => `+${n} foto` },
  fr: { mute: 'Couper le son', unmute: 'Activer le son', play: 'Lancer le diaporama', pause: 'Pause', promo: 'Publicité', tour: 'Visite 3D', master: 'Plan masse', photos: 'Photos', videos: 'Vidéos', plans: 'Plans', model3d: 'Modèle 3D', open: 'Ouvrir la photo', close: 'Fermer', prev: 'Précédent', next: 'Suivant', more: (n: number) => `+${n} photos` },
  de: { mute: 'Stumm', unmute: 'Ton an', play: 'Diashow abspielen', pause: 'Pause', promo: 'Werbung', tour: '3D-Rundgang', master: 'Lageplan', photos: 'Fotos', videos: 'Videos', plans: 'Grundrisse', model3d: '3D-Modell', open: 'Foto öffnen', close: 'Schließen', prev: 'Zurück', next: 'Weiter', more: (n: number) => `+${n} Fotos` },
  zh: { mute: '静音', unmute: '开启声音', play: '播放幻灯片', pause: '暂停', promo: '推广素材', tour: '3D 漫游', master: '总平面图', photos: '照片', videos: '视频', plans: '平面图', model3d: '3D 模型', open: '查看照片', close: '关闭', prev: '上一张', next: '下一张', more: (n: number) => `+${n} 张` },
  nl: { mute: 'Dempen', unmute: 'Geluid aan', play: 'Diavoorstelling afspelen', pause: 'Pauze', promo: 'Reclame', tour: '3D-tour', master: 'Masterplan', photos: "Foto's", videos: "Video's", plans: 'Plattegronden', model3d: '3D-model', open: 'Foto openen', close: 'Sluiten', prev: 'Vorige', next: 'Volgende', more: (n: number) => `+${n} foto's` },
  ban: { mute: 'Bisukan', unmute: 'Nyalakan suara', play: 'Putar slide', pause: 'Jeda', promo: 'Promosi', tour: 'Tur 3D', master: 'Masterplan', photos: 'Poto', videos: 'Vidéo', plans: 'Denah', model3d: 'Model 3D', open: 'Buka foto', close: 'Nutup', prev: 'Sadurungné', next: 'Salanturné', more: (n: number) => `+${n} poto` },
  pl: { mute: 'Wycisz', unmute: 'Włącz dźwięk', play: 'Odtwórz pokaz slajdów', pause: 'Pauza', promo: 'Reklama', tour: 'Spacer 3D', master: 'Plan osiedla', photos: 'Zdjęcia', videos: 'Wideo', plans: 'Rzuty', model3d: 'Model 3D', open: 'Otwórz zdjęcie', close: 'Zamknij', prev: 'Poprzednie', next: 'Następne', more: (n: number) => `+${n} zdjęć` },
  uk: { mute: 'Без звуку', unmute: 'Увімкнути звук', play: 'Дивитися слайд-шоу', pause: 'Пауза', promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Відео', plans: 'Планування', model3d: '3D-модель', open: 'Відкрити фото', close: 'Закрити', prev: 'Назад', next: 'Вперед', more: (n: number) => `+${n} фото` },
} as const

// Обложка плитки. Спутник «Локации» (Esri, бесплатно) иногда не доходит до
// браузера — тогда пробуем второй адрес того же сервиса, а если и он молчит,
// убираем картинку: под ней значок плитки, а не пустой серый квадрат.
function CoverImage({ src, alt, ...rest }: Omit<ImageProps, 'src'> & { src: string }) {
  const [tries, setTries] = useState(0)
  const esri = src.startsWith('https://server.arcgisonline.com/')
  if (tries >= (esri ? 2 : 1)) return null
  const s = tries === 1 ? src.replace('https://server.arcgisonline.com/', 'https://services.arcgisonline.com/') : src
  return <Image key={s} {...rest} src={s} alt={alt} onError={() => setTries(t => t + 1)} />
}

// Used by both the villa and the apartment detail pages.
export function VillaGallery({ photos, alts, plans, plan3dUrl, videos, title, lang, wishlistItem, extraTiles, masterplan, masterplanCover, tourUrl, plansAreMasterplan = false, promo, viewerTabs = [], belowTiles, bleed = false, tilesAs = 'tiles', ambient, belowHero, overHero, aside, afterTiles, topRight }: {
  photos: string[]
  alts?: (string | undefined)[]
  plans: string[]
  plan3dUrl: string | null
  videos: GalleryVideo[]
  title: string
  lang: Lang
  /** Heart toggle in the top-right corner of the cover (apartment page). */
  wishlistItem?: WishlistInput
  /** Extra tiles after the gallery's own — sun & shade, Google 3D map
   *  (SunShadowBlock / Google3DMapBlock with `tile`). */
  extraTiles?: ReactNode
  /** Генплан комплекса с подсвеченной виллой — вкладка справа от планировок. */
  masterplan?: ReactNode
  /** Картинка для плитки «Генплан» в ленте превью. */
  masterplanCover?: string | null
  /** 3D-тур комплекса (lib/tour3d.ts), встраивается окном. */
  tourUrl?: string | null
  /** `plans` — генплан комплекса, а не планировки (страница ЖК): другая подпись. */
  plansAreMasterplan?: boolean
  /** Готовые сторис для агентов (lib/promo-kits.ts). */
  promo?: PromoKit | null
  /** Свои вкладки окна с плитками (после видео/3D-тура, перед «Рекламой»). */
  viewerTabs?: ViewerTab[]
  /** Под плитками: кнопка «Скачать презентацию PDF» (страница виллы). */
  belowTiles?: ReactNode
  /** Главное фото во всю ширину экрана, от края до края (страница виллы). */
  bleed?: boolean
  /** «text» — вместо плиток строка ссылок «Фото 10 · Видео 3 · …» (стиль
   *  «Журнал», страница виллы; макет владельца 19.11.2026). */
  tilesAs?: 'tiles' | 'text'
  /** Звук места под слайд-шоу (/ambient/<x>.mp3): джунгли, океан, поля, сад. */
  ambient?: string | null
  /** Сразу под главным фото, до ряда медиа (полоса цены, вариант A). */
  belowHero?: ReactNode
  /** Поверх фото справа, по сетке страницы (только компьютер) — форма записи на созвон. */
  overHero?: ReactNode
  /** Колонка справа под фото (карточка связи) и что идёт слева после превью. */
  aside?: ReactNode
  /** Значки справа сверху на фото: сохранить, поделиться, PDF, ошибка (макет BtnA). */
  topRight?: ReactNode
  afterTiles?: ReactNode
}) {
  const base = pickCopy(COPY, lang)
  const c = plansAreMasterplan ? { ...base, plans: base.master } : base
  const [open, setOpen] = useState<{ tab: Tab; i: number } | null>(null)
  const [cur, setCur] = useState(0)
  const swipe = useRef<number | null>(null)
  // Слайд-шоу: from — с какого фото начали, k — сколько сменилось, fading —
  // верхний слой гаснет перед сменой.
  const [show, setShow] = useState<{ from: number; k: number } | null>(null)
  const [fading, setFading] = useState(false)
  const showing = show !== null
  // Звук места (владелец 19.11.2026): «как будто смотрим видео». Web Audio —
  // петля без щелчка на стыке, плавное нарастание; звук стартует только по
  // нажатию Play (браузеры иначе не дают), «без звука» запоминаем на сеанс.
  const audio = useRef<{ ctx: AudioContext; gain: GainNode; src: AudioBufferSourceNode | null; buf: AudioBuffer | null } | null>(null)
  const [muted, setMuted] = useState(false)
  useEffect(() => { try { setMuted(sessionStorage.getItem('bx-ambient-muted') === '1') } catch {} }, [])
  // Создание AudioContext держит главный поток ~100 мс (замер 21.11.2026) —
  // на компьютере делаем это при наведении на фото, а не в момент нажатия Play,
  // иначе первый кадр слайд-шоу запаздывает. Контекст стартует «на паузе»,
  // включается в soundOn по нажатию.
  const audioCtx = () => {
    if (audio.current) return audio.current
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const a = audio.current = { ctx: new Ctx(), gain: null as unknown as GainNode, src: null, buf: null }
    a.gain = a.ctx.createGain(); a.gain.gain.value = 0; a.gain.connect(a.ctx.destination)
    return a
  }
  const warmAudio = () => { if (ambient && !muted && !audio.current) { try { audioCtx() } catch (e) { console.error('ambient', e) } } }
  const soundOn = async () => {
    if (!ambient) return
    try {
      const a = audioCtx()
      if (!a) return
      if (a.ctx.state === 'suspended') await a.ctx.resume()
      if (!a.buf) a.buf = await a.ctx.decodeAudioData(await (await fetch(ambient)).arrayBuffer())
      if (a.src) return
      const src = a.ctx.createBufferSource()
      src.buffer = a.buf
      src.loop = true
      // У mp3 по краям тишина кодировщика — обходим её, иначе на стыке щелчок.
      src.loopStart = 0.06
      src.loopEnd = Math.max(0.1, a.buf.duration - 0.06)
      src.connect(a.gain)
      src.start(0, 0.06)
      a.src = src
      const t = a.ctx.currentTime
      a.gain.gain.cancelScheduledValues(t)
      a.gain.gain.setValueAtTime(a.gain.gain.value, t)
      a.gain.gain.linearRampToValueAtTime(0.55, t + 1.5)
    } catch (e) { console.error('ambient', e) }
  }
  const soundOff = () => {
    const a = audio.current
    if (!a?.src) return
    const src = a.src
    a.src = null
    const t = a.ctx.currentTime
    a.gain.gain.cancelScheduledValues(t)
    a.gain.gain.setValueAtTime(a.gain.gain.value, t)
    a.gain.gain.linearRampToValueAtTime(0, t + 0.6)
    setTimeout(() => { try { src.stop() } catch {} }, 700)
  }
  useEffect(() => () => { audio.current?.ctx.close().catch(() => {}) }, [])
  // Слайд-шоу листает только на уже загруженное фото: на медленном интернете
  // верхний слой гас раньше, чем грузился нижний, и мелькал чёрный фон.
  // «Загружено» = скачано И раскодировано (img.decode): иначе браузер
  // раскодировал 2560-px кадр только в момент, когда верхний слой начинал
  // гаснуть, и смена кадра подтормаживала.
  const loaded = useRef(new Set<string>())
  const markLoaded = (src: string, img?: HTMLImageElement) => {
    if (!img?.decode) { loaded.current.add(src); return }
    img.decode().catch(() => {}).finally(() => loaded.current.add(src))
  }
  // Пока вкладка скрыта или фото ушло с экрана — не листаем: иначе каждые 2 с
  // качался и раскодировался новый кадр, которого никто не видит.
  const heroRef = useRef<HTMLDivElement>(null)
  const onScreen = useRef(true)
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => { onScreen.current = e.isIntersecting })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const nextSrc = useRef<string | null>(null)
  useEffect(() => {
    const s = photos.length ? photos : plans.slice(0, 1)
    nextSrc.current = show && s.length ? s[(show.from + show.k + 1) % s.length] : null
  }, [show, photos, plans])
  useEffect(() => {
    if (!showing) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const iv = setInterval(() => {
      if (document.hidden || !onScreen.current) return
      if (nextSrc.current && !loaded.current.has(nextSrc.current)) return
      setFading(true)
      timers.push(setTimeout(() => { setShow(p => p && { ...p, k: p.k + 1 }); setFading(false) }, FADE_MS))
    }, ADVANCE_MS)
    return () => { clearInterval(iv); timers.forEach(clearTimeout) }
  }, [showing])
  const planCount = plans.length + (plan3dUrl ? 1 : 0)
  // Вкладку окна можно открыть снаружи (карточка «Зоны вокруг» в разделе «Участок»).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const tab = (e as CustomEvent<{ tab?: Tab }>).detail?.tab
      if (tab && (!tab.startsWith('x:') || viewerTabs.some(v => `x:${v.key}` === tab))) setOpen({ tab, i: 0 })
    }
    window.addEventListener('bx:open-media', onOpen)
    return () => window.removeEventListener('bx:open-media', onOpen)
  }, [viewerTabs])
  if (photos.length === 0 && planCount === 0 && videos.length === 0) return null

  const slides = photos.length ? photos : plans.slice(0, 1)
  const n = slides.length
  const topIdx = show ? (show.from + show.k) % n : Math.min(cur, n - 1)
  const shown = slides[Math.min(cur, n - 1)] ?? null
  const stop = () => { soundOff(); if (show) { setCur(topIdx); setShow(null); setFading(false) } }
  const step = (d: number) => { stop(); setCur(i => ((show ? topIdx : i) + d + n) % n) }
  const play = () => {
    // Заранее грузится только следующее фото (нижний слой, ужатая копия).
    // Раньше тут качались все оригиналы разом — на телефоне они забивали
    // канал, и нужный кадр не успевал.
    setShow({ from: Math.min(cur, n - 1), k: 0 })
    if (!muted) void soundOn()
  }
  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    try { sessionStorage.setItem('bx-ambient-muted', m ? '1' : '0') } catch {}
    if (m) soundOff(); else if (showing) void soundOn()
  }
  const openAt = () => { stop(); setOpen({ tab: photos.length ? 'photos' : 'plans', i: photos.length ? topIdx : 0 }) }
  // Слои A/B меняются ролями каждый шаг; фото в слое меняется, только пока он нижний.
  const aTop = (show?.k ?? 0) % 2 === 0
  const nextIdx = (topIdx + 1) % n
  const aIdx = aTop ? topIdx : nextIdx, bIdx = aTop ? nextIdx : topIdx
  // Ключ — по физическому слою (как в PhotoSlider): слой, ставший верхним, не
  // пересоздаётся, иначе на смене кадра фото грузится заново — белая вспышка.
  const layer = (name: 'a' | 'b', idx: number, top: boolean) => (
    <Image key={`${name}-${idx}`} src={slides[idx]} alt="" aria-hidden fill sizes={bleed ? '100vw' : '(min-width: 1024px) 720px, 100vw'}
      className={`object-cover photo-motion-${idx % PRESETS} ${top ? `z-[2] transition-opacity duration-[600ms] ease-in-out ${fading ? 'opacity-0' : 'opacity-100'}` : 'z-[1]'}`}
      style={{ animationDuration: `${2 * ADVANCE_MS}ms`, animationTimingFunction: 'linear', animationFillMode: 'forwards' }}
      onLoad={e => markLoaded(slides[idx], e.currentTarget)} onError={() => loaded.current.add(slides[idx])} />
  )
  const heroH = bleed ? `h-[260px] sm:h-[360px] md:h-[440px] ${overHero ? 'lg:h-[640px]' : 'lg:h-[480px]'}` : 'h-[300px] sm:h-[400px] md:h-[480px]'
  const round = bleed ? '' : 'rounded-xl'
  const hasTiles = planCount > 0 || !!masterplan || videos.length > 0 || !!tourUrl || !!extraTiles || !!promo || viewerTabs.some(v => !v.hideTile)

  // «Журнал» (владелец 19.11.2026): медиа под фото — превью-картинки с
  // подписью под ними, чтобы мультимедиа привлекало внимание.
      const promoCover = promo ? (promo.series[0].thumbs?.[0] ?? promo.series[0].files[0]) : null
      const links: { key: string; label: string; count?: number; cover: string | null; unopt?: boolean; icon?: ReactNode; tab: Tab; i: number }[] = [
        ...(photos.length > 1 ? [{ key: 'photos', label: c.photos, count: photos.length, cover: photos[1], tab: 'photos' as Tab, i: 1 }] : []),
        ...(videos.length > 0 ? [{ key: 'videos', label: c.videos, count: videos.length > 1 ? videos.length : undefined, cover: ytThumb(videos[0].url), unopt: true, tab: 'videos' as Tab, i: 0 }] : []),
        ...(planCount > 0 ? [{ key: 'plans', label: c.plans, count: planCount > 1 ? planCount : undefined, cover: plans[0] ?? null, tab: 'plans' as Tab, i: 0 }] : []),
        ...(masterplan ? [{ key: 'master', label: c.master, cover: masterplanCover ?? null, tab: 'master' as Tab, i: 0 }] : []),
        ...(tourUrl ? [{ key: 'tour', label: c.tour, cover: photos[2] ?? photos[0] ?? null, tab: 'tour' as Tab, i: 0 }] : []),
        ...viewerTabs.filter(v => !v.hideTile).map(v => ({ key: `x:${v.key}`, label: v.label, count: v.count, cover: v.cover ?? null, unopt: /arcgisonline\.com/.test(v.cover ?? ''), icon: v.icon, tab: `x:${v.key}` as Tab, i: 0 })),
        ...(promo ? [{ key: 'promo', label: c.promo, cover: promoCover, unopt: true, tab: 'promo' as Tab, i: 0 }] : []),
      ]

  const belowBlock = (
    <>
      {belowHero}

      {tilesAs === 'text' ? (links.length > 0 && (
          <nav aria-label={c.photos} className="-mx-6 mt-2 flex w-[calc(100%+3rem)] max-w-none snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-1 md:mx-0 md:mt-4 md:w-auto md:max-w-full md:flex-wrap md:gap-x-5 md:gap-y-6 md:overflow-visible md:px-0 [scrollbar-width:none]">
            {links.map(l => (
              <button key={l.key} type="button" onClick={() => { stop(); setOpen({ tab: l.tab, i: l.i }) }}
                className="group flex w-[148px] shrink-0 cursor-pointer snap-start flex-col gap-2 border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F1A15] md:w-[calc((100%-60px)/4)] md:min-w-0 md:flex-none xl:w-[calc((100%-120px)/7)]">
                <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-md bg-[#F1F3F2]">
                  {l.icon && <span aria-hidden className="absolute inset-0 flex items-center justify-center text-[#0F1A15]/40">{l.icon}</span>}
                  {l.cover && <CoverImage src={l.cover} alt="" fill sizes="(min-width: 768px) 200px, 148px" unoptimized={l.unopt} className="object-cover transition-transform duration-[320ms] ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.04]" />}
                  {l.key === 'videos' && <span className="absolute inset-0 flex items-center justify-center text-white [filter:drop-shadow(0_2px_6px_rgb(0_0_0/.4))]"><svg width="36" height="36" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46.5" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M38.3 30L38.3 70L73.3 50Z" fill="currentColor" /></svg></span>}
                  {/* Число — плашкой на картинке (владелец 21.11.2026): подпись не переносится на вторую строку. */}
                  {l.count != null && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-[#0F1A15]/75 px-2 py-0.5 text-[12px] font-semibold leading-[1.4] tabular-nums text-white backdrop-blur-sm">{l.count}</span>}
                </span>
                <span className="text-[15px] font-semibold leading-tight text-[#0F1A15] group-hover:underline group-hover:underline-offset-4">
                  {l.label}
                </span>
              </button>
            ))}
          </nav>
      )) : hasTiles && (
        <div className="grid grid-cols-3 sm:grid-flow-col sm:auto-cols-fr gap-2">
          {planCount > 0 && (
            <button type="button" onClick={() => setOpen({ tab: 'plans' as Tab, i: 0 })} className={MEDIA_TILE} aria-label={c.plans}>
              {plans[0] && <Image src={plans[0]} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" />}
              <MediaTileLabel icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><path d="M14 14h4v4h-4z"/></svg>}>
                {c.plans}{planCount > 1 ? ` ${planCount}` : ''}
              </MediaTileLabel>
            </button>
          )}
          {masterplan && (
            <button type="button" onClick={() => setOpen({ tab: 'master' as Tab, i: 0 })} className={MEDIA_TILE} aria-label={c.master}>
              {masterplanCover && <Image src={masterplanCover} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" />}
              <MediaTileLabel icon={<MapPinned size={18} aria-hidden />}>{c.master}</MediaTileLabel>
            </button>
          )}
          {videos.length > 0 && (
            <button type="button" onClick={() => setOpen({ tab: 'videos' as Tab, i: 0 })} className={MEDIA_TILE} aria-label={c.videos}>
              {ytThumb(videos[0].url) && <Image src={ytThumb(videos[0].url)!} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" unoptimized />}
              <MediaTileLabel icon={<Play size={18} fill="currentColor" aria-hidden />}>{c.videos}{videos.length > 1 ? ` ${videos.length}` : ''}</MediaTileLabel>
            </button>
          )}
          {tourUrl && (
            <button type="button" onClick={() => setOpen({ tab: 'tour' as Tab, i: 0 })} className={MEDIA_TILE} aria-label={c.tour}>
              {(photos[1] ?? photos[0]) && <Image src={photos[1] ?? photos[0]} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" />}
              <MediaTileLabel icon={<Rotate3d size={18} aria-hidden />}>{c.tour}</MediaTileLabel>
            </button>
          )}
          {extraTiles}
          {viewerTabs.filter(v => !v.hideTile).map(v => (
            <button key={v.key} type="button" onClick={() => setOpen({ tab: `x:${v.key}`, i: 0 })} className={MEDIA_TILE} aria-label={v.label}>
              {v.cover && <CoverImage src={v.cover} alt="" width={200} height={96} sizes="200px" unoptimized={/arcgisonline\.com/.test(v.cover)} className="w-full h-full object-cover" />}
              <MediaTileLabel icon={v.icon}>{v.label}</MediaTileLabel>
            </button>
          ))}
          {promo && (
            <button type="button" onClick={() => setOpen({ tab: 'promo' as Tab, i: 0 })} className={MEDIA_TILE} aria-label={c.promo}>
              {/* eslint-disable-next-line @next/next/no-img-element -- лёгкое превью сторис */}
              <img src={promo.series[0].thumbs?.[0] ?? promo.series[0].files[0]} alt="" className="w-full h-full object-cover" />
              <MediaTileLabel icon={<Megaphone size={18} aria-hidden />}>{c.promo}</MediaTileLabel>
            </button>
          )}
        </div>
      )}

      {belowTiles}
    </>
  )

  return (
    <section className="flex flex-col gap-2">
      <div ref={heroRef} className={`relative overflow-hidden bg-[#1B211E] ${heroH} ${round} ${bleed ? 'ml-[calc(50%-50vw)] w-screen max-w-none' : ''}`}
        onPointerEnter={e => { if (e.pointerType === 'mouse') warmAudio() }}
        onPointerDown={e => { if (e.pointerType !== 'mouse') swipe.current = e.clientX }}
        onPointerUp={e => {
          const x0 = swipe.current; swipe.current = null
          if (x0 == null || n < 2) return
          const dx = e.clientX - x0
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1)
        }}>
        {shown && (
          // Как на YouTube (владелец 20.11.2026): нажал на кадр — пошло, ещё раз — пауза.
          <button type="button" onClick={n > 1 ? (showing ? stop : play) : openAt} aria-label={n > 1 ? (showing ? c.pause : c.play) : c.open}
            className={`absolute inset-0 block ${n > 1 ? 'cursor-pointer' : 'cursor-zoom-in'} overflow-hidden ${round} focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white`}>
            <Image key={shown} src={shown} alt={alts?.[Math.min(cur, n - 1)] ?? title} fill sizes={bleed ? '100vw' : '(min-width: 1024px) 720px, 100vw'} priority={cur === 0}
              className={`object-cover transition-opacity duration-[600ms] ${showing ? 'opacity-0' : 'opacity-100'}`} draggable={false} />
            {showing && <>{layer('a', aIdx, aTop)}{layer('b', bIdx, !aTop)}</>}
          </button>
        )}
        {n > 1 && !showing && (
          <button type="button" onClick={play} aria-label={c.play}
            className={`absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 ${overHero ? 'lg:left-[36%]' : ''} -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-white transition-transform duration-[120ms] [filter:drop-shadow(0_2px_8px_rgb(0_0_0/.35))] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}>
            {/* Классический значок (образец владельца 19.11.2026): толстое кольцо ~7% диаметра,
                острый треугольник 40% высоты, по центру тяжести. */}
            <svg width="80" height="80" viewBox="0 0 100 100" aria-hidden="true" className="block">
              <circle cx="50" cy="50" r="46.5" fill="none" stroke="currentColor" strokeWidth="7" />
              <path d="M38.3 30L38.3 70L73.3 50Z" fill="currentColor" />
            </svg>
          </button>
        )}
        {showing && <>
          <button type="button" onClick={stop} aria-label={c.pause}
            className="absolute bottom-3 left-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgb(16_24_20/0.6)] text-white hover:bg-[rgb(16_24_20/0.8)] focus-visible:outline-2 focus-visible:outline-white">
            <Pause size={18} fill="currentColor" aria-hidden />
          </button>
          {ambient && (
            <button type="button" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute} aria-pressed={muted}
              className="absolute bottom-3 left-16 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgb(16_24_20/0.6)] text-white hover:bg-[rgb(16_24_20/0.8)] focus-visible:outline-2 focus-visible:outline-white">
              {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[3px] bg-white/30">
            {/* scaleX, а не width: width пересчитывал раскладку и перерисовывал страницу каждый кадр. */}
            <div key={Math.floor(show.k / n)} className="h-full w-full origin-left bg-white" style={{ animation: `photo-progress-x ${n * ADVANCE_MS}ms linear forwards` }} />
          </div>
        </>}
        {wishlistItem && <WishlistButton item={wishlistItem} className="absolute top-4 right-4 z-10" />}
        {topRight && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[12] mx-auto w-full max-w-[1280px] px-4 pt-4 md:px-6 md:pt-5">
            <div className="pointer-events-auto ml-auto w-fit">{topRight}</div>
          </div>
        )}
        {overHero && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[11] hidden w-full max-w-[1280px] -translate-x-1/2 px-6 lg:block">
            <div className="pointer-events-auto ml-auto mt-6 w-[392px]">{overHero}</div>
          </div>
        )}
      </div>
      {aside ? (
        // Справа от полосы под фото, превью и раздела «Объект» — карточка связи,
        // едет рядом (владелец 20.11.2026); на телефоне — после «Объекта».
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_392px] lg:items-start lg:gap-16">
          <div className="flex min-w-0 flex-col gap-2">{belowBlock}{afterTiles}</div>
          <aside className="mt-10 lg:sticky lg:top-[96px] lg:mt-6">{aside}</aside>
        </div>
      ) : belowBlock}

      {open && (
        <MediaViewer
          photos={photos} plans={plans} plan3dUrl={plan3dUrl} videos={videos} alts={alts} title={title} lang={lang} masterplan={masterplan} tourUrl={tourUrl} plansLabel={c.plans} promo={promo} viewerTabs={viewerTabs}
          tab={open.tab} index={open.i} onChange={(tab, i) => setOpen({ tab, i })} onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}
