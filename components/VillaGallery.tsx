'use client'

// The villa page's media block: one big photo that pages left/right in place,
// and under it a row of «feature» tiles — floor plans, master plan, video, sun,
// 3D map (owner's mock-up «Медиаблок виллы», variant A, 2026-11-10). Clicking
// the photo or a tile opens the full-screen viewer on that tab.
// Floor plans = audit «document» images (lib/listing-photos.ts) + the 3D model,
// when the villa has one (lib/villa-3d-plans.ts).

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Play, MapPinned, Rotate3d, Megaphone } from 'lucide-react'
import type { PromoKit } from '@/lib/promo-kits'
import { MediaViewer, ytThumb, type GalleryVideo, type Tab, type ViewerTab } from './MediaViewer'
import { pickCopy, type Lang } from '@/lib/i18n'
import { WishlistButton, type WishlistInput } from './WishlistButton'
import { MEDIA_TILE, MediaTileLabel } from './media-tile'

export type { GalleryVideo, ViewerTab } from './MediaViewer'

const COPY = {
  ru: { promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Видео', plans: 'Планировки', model3d: '3D-модель', open: 'Открыть фото', close: 'Закрыть', prev: 'Назад', next: 'Вперёд', more: (n: number) => `+${n} фото` },
  en: { promo: 'Marketing', tour: '3D tour', master: 'Master plan', photos: 'Photos', videos: 'Videos', plans: 'Floor plans', model3d: '3D model', open: 'Open photo', close: 'Close', prev: 'Previous', next: 'Next', more: (n: number) => `+${n} photos` },
  id: { promo: 'Materi promosi', tour: 'Tur 3D', master: 'Masterplan', photos: 'Foto', videos: 'Video', plans: 'Denah', model3d: 'Model 3D', open: 'Buka foto', close: 'Tutup', prev: 'Sebelumnya', next: 'Berikutnya', more: (n: number) => `+${n} foto` },
  fr: { promo: 'Publicité', tour: 'Visite 3D', master: 'Plan masse', photos: 'Photos', videos: 'Vidéos', plans: 'Plans', model3d: 'Modèle 3D', open: 'Ouvrir la photo', close: 'Fermer', prev: 'Précédent', next: 'Suivant', more: (n: number) => `+${n} photos` },
  de: { promo: 'Werbung', tour: '3D-Rundgang', master: 'Lageplan', photos: 'Fotos', videos: 'Videos', plans: 'Grundrisse', model3d: '3D-Modell', open: 'Foto öffnen', close: 'Schließen', prev: 'Zurück', next: 'Weiter', more: (n: number) => `+${n} Fotos` },
  zh: { promo: '推广素材', tour: '3D 漫游', master: '总平面图', photos: '照片', videos: '视频', plans: '平面图', model3d: '3D 模型', open: '查看照片', close: '关闭', prev: '上一张', next: '下一张', more: (n: number) => `+${n} 张` },
  nl: { promo: 'Reclame', tour: '3D-tour', master: 'Masterplan', photos: "Foto's", videos: "Video's", plans: 'Plattegronden', model3d: '3D-model', open: 'Foto openen', close: 'Sluiten', prev: 'Vorige', next: 'Volgende', more: (n: number) => `+${n} foto's` },
  ban: { promo: 'Promosi', tour: 'Tur 3D', master: 'Masterplan', photos: 'Poto', videos: 'Vidéo', plans: 'Denah', model3d: 'Model 3D', open: 'Buka foto', close: 'Nutup', prev: 'Sadurungné', next: 'Salanturné', more: (n: number) => `+${n} poto` },
  pl: { promo: 'Reklama', tour: 'Spacer 3D', master: 'Plan osiedla', photos: 'Zdjęcia', videos: 'Wideo', plans: 'Rzuty', model3d: 'Model 3D', open: 'Otwórz zdjęcie', close: 'Zamknij', prev: 'Poprzednie', next: 'Następne', more: (n: number) => `+${n} zdjęć` },
  uk: { promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Відео', plans: 'Планування', model3d: '3D-модель', open: 'Відкрити фото', close: 'Закрити', prev: 'Назад', next: 'Вперед', more: (n: number) => `+${n} фото` },
} as const

// Used by both the villa and the apartment detail pages.
export function VillaGallery({ photos, alts, plans, plan3dUrl, videos, title, lang, wishlistItem, extraTiles, masterplan, masterplanCover, tourUrl, plansAreMasterplan = false, promo, viewerTabs = [], belowTiles }: {
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
}) {
  const base = pickCopy(COPY, lang)
  const c = plansAreMasterplan ? { ...base, plans: base.master } : base
  const [open, setOpen] = useState<{ tab: Tab; i: number } | null>(null)
  const [cur, setCur] = useState(0)
  const swipe = useRef<number | null>(null)
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
  const shown = slides[Math.min(cur, n - 1)] ?? null
  const step = (d: number) => setCur(i => (i + d + n) % n)
  const openAt = () => setOpen({ tab: photos.length ? 'photos' : 'plans', i: photos.length ? Math.min(cur, n - 1) : 0 })
  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[rgb(16_24_20/0.55)] hover:bg-[rgb(16_24_20/0.75)] text-white flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-white'
  const hasTiles = planCount > 0 || !!masterplan || videos.length > 0 || !!tourUrl || !!extraTiles || !!promo || viewerTabs.some(v => !v.hideTile)

  return (
    <section className="flex flex-col gap-2">
      <div className="relative"
        onPointerDown={e => { if (e.pointerType !== 'mouse') swipe.current = e.clientX }}
        onPointerUp={e => {
          const x0 = swipe.current; swipe.current = null
          if (x0 == null || n < 2) return
          const dx = e.clientX - x0
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1)
        }}>
        {shown && (
          <button type="button" onClick={openAt} aria-label={c.open}
            className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <Image key={shown} src={shown} alt={alts?.[Math.min(cur, n - 1)] ?? title} width={920} height={480} sizes="(min-width: 1024px) 720px, 100vw" priority={cur === 0}
              className="w-full h-[300px] sm:h-[400px] md:h-[480px] object-cover rounded-xl" draggable={false} />
          </button>
        )}
        {n > 1 && <>
          <button type="button" onClick={() => step(-1)} aria-label={c.prev} className={`${arrow} left-3 hidden sm:flex`}><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => step(1)} aria-label={c.next} className={`${arrow} right-3 hidden sm:flex`}><ChevronRight size={22} /></button>
          <span className="absolute right-3 bottom-3 z-10 pointer-events-none px-3 py-1.5 rounded-lg bg-[rgb(16_24_20/0.72)] text-white text-[13px] sm:text-[14px] font-semibold tabular-nums">
            {Math.min(cur, n - 1) + 1} / {n}{photos.length ? ` ${c.photos.toLowerCase()}` : ''}
          </span>
        </>}
        {wishlistItem && <WishlistButton item={wishlistItem} className="absolute top-4 right-4 z-10" />}
      </div>

      {hasTiles && (
        <div className="grid grid-cols-3 sm:grid-flow-col sm:auto-cols-fr gap-2">
          {planCount > 0 && (
            <button type="button" onClick={() => setOpen({ tab: 'plans', i: 0 })} className={MEDIA_TILE} aria-label={c.plans}>
              {plans[0] && <Image src={plans[0]} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" />}
              <MediaTileLabel icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><path d="M14 14h4v4h-4z"/></svg>}>
                {c.plans}{planCount > 1 ? ` ${planCount}` : ''}
              </MediaTileLabel>
            </button>
          )}
          {masterplan && (
            <button type="button" onClick={() => setOpen({ tab: 'master', i: 0 })} className={MEDIA_TILE} aria-label={c.master}>
              {masterplanCover && <Image src={masterplanCover} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" />}
              <MediaTileLabel icon={<MapPinned size={18} aria-hidden />}>{c.master}</MediaTileLabel>
            </button>
          )}
          {videos.length > 0 && (
            <button type="button" onClick={() => setOpen({ tab: 'videos', i: 0 })} className={MEDIA_TILE} aria-label={c.videos}>
              {ytThumb(videos[0].url) && <Image src={ytThumb(videos[0].url)!} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" unoptimized />}
              <MediaTileLabel icon={<Play size={18} fill="currentColor" aria-hidden />}>{c.videos}{videos.length > 1 ? ` ${videos.length}` : ''}</MediaTileLabel>
            </button>
          )}
          {tourUrl && (
            <button type="button" onClick={() => setOpen({ tab: 'tour', i: 0 })} className={MEDIA_TILE} aria-label={c.tour}>
              {(photos[1] ?? photos[0]) && <Image src={photos[1] ?? photos[0]} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" />}
              <MediaTileLabel icon={<Rotate3d size={18} aria-hidden />}>{c.tour}</MediaTileLabel>
            </button>
          )}
          {extraTiles}
          {viewerTabs.filter(v => !v.hideTile).map(v => (
            <button key={v.key} type="button" onClick={() => setOpen({ tab: `x:${v.key}`, i: 0 })} className={MEDIA_TILE} aria-label={v.label}>
              {v.cover && <Image src={v.cover} alt="" width={200} height={96} sizes="200px" className="w-full h-full object-cover" />}
              <MediaTileLabel icon={v.icon}>{v.label}</MediaTileLabel>
            </button>
          ))}
          {promo && (
            <button type="button" onClick={() => setOpen({ tab: 'promo', i: 0 })} className={MEDIA_TILE} aria-label={c.promo}>
              {/* eslint-disable-next-line @next/next/no-img-element -- лёгкое превью сторис */}
              <img src={promo.series[0].thumbs?.[0] ?? promo.series[0].files[0]} alt="" className="w-full h-full object-cover" />
              <MediaTileLabel icon={<Megaphone size={18} aria-hidden />}>{c.promo}</MediaTileLabel>
            </button>
          )}
        </div>
      )}

      {belowTiles}

      {open && (
        <MediaViewer
          photos={photos} plans={plans} plan3dUrl={plan3dUrl} videos={videos} alts={alts} title={title} lang={lang} masterplan={masterplan} tourUrl={tourUrl} plansLabel={c.plans} promo={promo} viewerTabs={viewerTabs}
          tab={open.tab} index={open.i} onChange={(tab, i) => setOpen({ tab, i })} onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}
