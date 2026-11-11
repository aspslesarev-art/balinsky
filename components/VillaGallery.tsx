'use client'

// The villa page's media block: one big photo that pages left/right in place,
// and under it a row of «feature» tiles — floor plans, master plan, video, sun,
// 3D map (owner's mock-up «Медиаблок виллы», variant A, 2026-11-10). Clicking
// the photo or a tile opens the full-screen viewer on that tab.
// Floor plans = audit «document» images (lib/listing-photos.ts) + the 3D model,
// when the villa has one (lib/villa-3d-plans.ts).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, Play, Box, MapPinned, Rotate3d, Megaphone, Download } from 'lucide-react'
import type { PromoKit } from '@/lib/promo-kits'
import { pickCopy, type Lang } from '@/lib/i18n'
import { WishlistButton, type WishlistInput } from './WishlistButton'
import { MEDIA_TILE, MediaTileLabel } from './media-tile'

export type GalleryVideo = { url: string; name: string | null }
type BaseTab = 'photos' | 'videos' | 'plans' | 'master' | 'tour' | 'promo'
// Свои вкладки окна (солнце и ветер, 3D-карта, документы) — ключ `x:<key>`.
type Tab = BaseTab | `x:${string}`

/** Вкладка окна медиаблока со своей плиткой: солнце и ветер, 3D-карта, документы. */
export type ViewerTab = { key: string; label: string; icon: ReactNode; cover?: string | null; content: ReactNode }

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

function ytId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/)
  return m ? m[1] : null
}
const ytThumb = (url: string) => { const id = ytId(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null }


// Used by both the villa and the apartment detail pages.
export function VillaGallery({ photos, alts, plans, plan3dUrl, videos, title, lang, wishlistItem, extraTiles, masterplan, masterplanCover, tourUrl, plansAreMasterplan = false, promo, viewerTabs = [] }: {
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
}) {
  const base = pickCopy(COPY, lang)
  const c = plansAreMasterplan ? { ...base, plans: base.master } : base
  const [open, setOpen] = useState<{ tab: Tab; i: number } | null>(null)
  const [cur, setCur] = useState(0)
  const swipe = useRef<number | null>(null)
  const planCount = plans.length + (plan3dUrl ? 1 : 0)
  if (photos.length === 0 && planCount === 0 && videos.length === 0) return null

  const slides = photos.length ? photos : plans.slice(0, 1)
  const n = slides.length
  const shown = slides[Math.min(cur, n - 1)] ?? null
  const step = (d: number) => setCur(i => (i + d + n) % n)
  const openAt = () => setOpen({ tab: photos.length ? 'photos' : 'plans', i: photos.length ? Math.min(cur, n - 1) : 0 })
  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[rgb(16_24_20/0.55)] hover:bg-[rgb(16_24_20/0.75)] text-white flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-white'
  const hasTiles = planCount > 0 || !!masterplan || videos.length > 0 || !!tourUrl || !!extraTiles || !!promo || viewerTabs.length > 0

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
          {viewerTabs.map(v => (
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

      {open && (
        <MediaViewer
          photos={photos} plans={plans} plan3dUrl={plan3dUrl} videos={videos} alts={alts} title={title} lang={lang} masterplan={masterplan} tourUrl={tourUrl} plansLabel={c.plans} promo={promo} viewerTabs={viewerTabs}
          tab={open.tab} index={open.i} onChange={(tab, i) => setOpen({ tab, i })} onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}

function MediaViewer({ photos, plans, plan3dUrl, videos, alts, title, lang, tab, index, onChange, onClose, masterplan, tourUrl, plansLabel, promo, viewerTabs = [] }: {
  photos: string[]; plans: string[]; plan3dUrl: string | null; videos: GalleryVideo[]; masterplan?: ReactNode; tourUrl?: string | null; plansLabel?: string; promo?: PromoKit | null; viewerTabs?: ViewerTab[]
  alts?: (string | undefined)[]; title: string; lang: Lang
  tab: Tab; index: number; onChange: (tab: Tab, i: number) => void; onClose: () => void
}) {
  const base = pickCopy(COPY, lang)
  const c = plansLabel ? { ...base, plans: plansLabel } : base
  // Plans tab: the 3D model first (it is the richest view), then plan images.
  type Item = { kind: 'img'; src: string; alt: string } | { kind: 'video'; url: string; name: string | null } | { kind: '3d'; src: string } | { kind: 'node' } | { kind: 'promo' } | { kind: 'custom'; content: ReactNode }
  const lists: Record<string, Item[]> = {
    photos: photos.map((src, i) => ({ kind: 'img' as const, src, alt: alts?.[i] ?? title })),
    videos: videos.map(v => ({ kind: 'video' as const, url: v.url, name: v.name })),
    plans: [
      ...(plan3dUrl ? [{ kind: '3d' as const, src: `${plan3dUrl}?lang=${lang}` }] : []),
      ...plans.map(src => ({ kind: 'img' as const, src, alt: `${title} - ${c.plans.toLowerCase()}` })),
    ],
    master: masterplan ? [{ kind: 'node' as const }] : [],
    tour: tourUrl ? [{ kind: '3d' as const, src: tourUrl }] : [],
    promo: promo ? [{ kind: 'promo' as const }] : [],
    ...Object.fromEntries(viewerTabs.map(v => [`x:${v.key}`, [{ kind: 'custom' as const, content: v.content }]])),
  }
  const labelOf = (t: Tab) => t.startsWith('x:') ? viewerTabs.find(v => `x:${v.key}` === t)?.label ?? '' : c[t as BaseTab]
  const items = lists[tab] ?? []
  const count = items.length
  const i = Math.min(index, Math.max(count - 1, 0))
  const item = items[i]
  const go = useCallback((d: number) => { if (count > 1) onChange(tab, (i + d + count) % count) }, [count, i, tab, onChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [go, onClose])

  const tabs = ([...(['photos', 'videos', 'plans', 'master', 'tour'] as Tab[]), ...viewerTabs.map(v => `x:${v.key}` as Tab), 'promo'] as Tab[]).filter(t => (lists[t] ?? []).length > 0)
  const navBtn = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 focus-visible:bg-white/20 text-white flex items-center justify-center transition-colors'

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] bg-[#0C100E] flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map(t => (
            <button key={t} type="button" onClick={() => onChange(t, 0)}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${t === tab ? 'bg-white text-[#101814]' : 'text-white/80 hover:bg-white/10'}`}>
              {labelOf(t)}{(t === 'photos' || t === 'videos' || t === 'plans') && <> <span className="opacity-60">{lists[t].length}</span></>}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label={c.close} className="shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 md:px-16 pb-2">
        {item?.kind === 'img' && (
          <Image key={item.src} src={item.src} alt={item.alt} width={1600} height={1000} sizes="100vw"
            className="w-full h-full object-contain" />
        )}
        {item?.kind === 'video' && (() => {
          const id = ytId(item.url)
          return id ? (
            <iframe key={id} src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={item.name ?? title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
              className="w-full max-w-[1100px] aspect-video max-h-full rounded-lg border-0" />
          ) : (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white underline">{item.name ?? item.url}</a>
          )
        })()}
        {item?.kind === 'promo' && promo && (
          <div className="w-full max-w-[1200px] max-h-full overflow-y-auto text-white">
            <p className="m-0 mb-5 text-[14px] leading-[1.55] text-white/75 max-w-[68ch]">
              {lang === 'ru'
                ? 'Готовые сторис без названия объекта и застройщика. Нажмите на картинку - она откроется целиком: на телефоне удерживайте и выберите «Сохранить в Фото».'
                : 'Ready-made stories without the project or developer name. Tap an image to open it full size, then save it to your phone.'}
            </p>
            {promo.series.map(s => (
              <section key={s.title} className="mb-8">
                <h3 className="m-0 mb-3 text-[16px] font-semibold">{s.title}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {s.files.map((f, k) => (
                    <div key={f} className="flex flex-col gap-2">
                      <a href={f} target="_blank" rel="noopener" className="block rounded-lg overflow-hidden bg-white/5 focus-visible:outline-2 focus-visible:outline-white">
                        {/* eslint-disable-next-line @next/next/no-img-element -- готовое лёгкое превью, оптимизатор не нужен */}
                        <img src={s.thumbs?.[k] ?? f} alt={`${s.title} ${k + 1}`} width={270} height={480} loading="lazy" className="w-full h-auto aspect-[9/16] object-cover" />
                      </a>
                      <a href={`${f}?download=${encodeURIComponent(f.split('/').pop() ?? 'story.png')}`} className="inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg bg-white/10 hover:bg-white/20 text-[14px] font-medium">
                        <Download size={16} aria-hidden />{lang === 'ru' ? 'Скачать' : 'Download'}
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {item?.kind === 'custom' && (
          <div key={tab} className="w-full h-full">{item.content}</div>
        )}
        {item?.kind === 'node' && (
          <div className="w-full max-w-[1200px] max-h-full overflow-y-auto">{masterplan}</div>
        )}
        {item?.kind === '3d' && (
          <iframe key={item.src} src={item.src} title={tab === 'tour' ? c.tour : c.model3d} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" className="w-full h-full max-w-[1200px] rounded-lg border-0 bg-white" />
        )}
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={c.prev} className={`${navBtn} left-2 md:left-4`}><ChevronLeft size={22} /></button>
            <button type="button" onClick={() => go(1)} aria-label={c.next} className={`${navBtn} right-2 md:right-4`}><ChevronRight size={22} /></button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 justify-start md:justify-center overflow-x-auto px-4 pb-4 pt-2 [scrollbar-width:none]">
          {items.map((it, k) => {
            const src = it.kind === 'img' ? it.src : it.kind === 'video' ? ytThumb(it.url) : null
            return (
              <button key={k} type="button" onClick={() => onChange(tab, k)} aria-label={`${k + 1}`}
                className={`relative shrink-0 w-[72px] h-[48px] rounded-md overflow-hidden border-2 transition-colors ${k === i ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'} ${tab === 'plans' ? 'bg-white' : 'bg-white/10'}`}>
                {src ? <Image src={src} alt="" width={72} height={48} sizes="72px" className="w-full h-full object-cover" unoptimized={it.kind === 'video'} />
                  : <span className="absolute inset-0 flex items-center justify-center text-[#1B6E4A]"><Box size={20} aria-hidden /></span>}
                {it.kind === 'video' && <span className="absolute inset-0 flex items-center justify-center text-white"><Play size={14} fill="currentColor" aria-hidden /></span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
