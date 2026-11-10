'use client'

// The villa page's media block: one big photo plus a thumbnail strip, and a
// full-screen viewer with three tabs, Photos / Videos / Floor plans. All media
// lives here at the top of the page, nothing scrolls the visitor away.
// Floor plans = audit «document» images (lib/listing-photos.ts) + the 3D model,
// when the villa has one (lib/villa-3d-plans.ts).

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, Play, Box, MapPinned } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { WishlistButton, type WishlistInput } from './WishlistButton'

export type GalleryVideo = { url: string; name: string | null }
type Tab = 'photos' | 'videos' | 'plans' | 'master'

const COPY = {
  ru: { master: 'Генплан', photos: 'Фото', videos: 'Видео', plans: 'Планировки', model3d: '3D-модель', open: 'Открыть фото', close: 'Закрыть', prev: 'Назад', next: 'Вперёд', more: (n: number) => `+${n} фото` },
  en: { master: 'Master plan', photos: 'Photos', videos: 'Videos', plans: 'Floor plans', model3d: '3D model', open: 'Open photo', close: 'Close', prev: 'Previous', next: 'Next', more: (n: number) => `+${n} photos` },
  id: { master: 'Masterplan', photos: 'Foto', videos: 'Video', plans: 'Denah', model3d: 'Model 3D', open: 'Buka foto', close: 'Tutup', prev: 'Sebelumnya', next: 'Berikutnya', more: (n: number) => `+${n} foto` },
  fr: { master: 'Plan masse', photos: 'Photos', videos: 'Vidéos', plans: 'Plans', model3d: 'Modèle 3D', open: 'Ouvrir la photo', close: 'Fermer', prev: 'Précédent', next: 'Suivant', more: (n: number) => `+${n} photos` },
  de: { master: 'Lageplan', photos: 'Fotos', videos: 'Videos', plans: 'Grundrisse', model3d: '3D-Modell', open: 'Foto öffnen', close: 'Schließen', prev: 'Zurück', next: 'Weiter', more: (n: number) => `+${n} Fotos` },
  zh: { master: '总平面图', photos: '照片', videos: '视频', plans: '平面图', model3d: '3D 模型', open: '查看照片', close: '关闭', prev: '上一张', next: '下一张', more: (n: number) => `+${n} 张` },
  nl: { master: 'Masterplan', photos: "Foto's", videos: "Video's", plans: 'Plattegronden', model3d: '3D-model', open: 'Foto openen', close: 'Sluiten', prev: 'Vorige', next: 'Volgende', more: (n: number) => `+${n} foto's` },
  ban: { master: 'Masterplan', photos: 'Poto', videos: 'Vidéo', plans: 'Denah', model3d: 'Model 3D', open: 'Buka foto', close: 'Nutup', prev: 'Sadurungné', next: 'Salanturné', more: (n: number) => `+${n} poto` },
  pl: { master: 'Plan osiedla', photos: 'Zdjęcia', videos: 'Wideo', plans: 'Rzuty', model3d: 'Model 3D', open: 'Otwórz zdjęcie', close: 'Zamknij', prev: 'Poprzednie', next: 'Następne', more: (n: number) => `+${n} zdjęć` },
  uk: { master: 'Генплан', photos: 'Фото', videos: 'Відео', plans: 'Планування', model3d: '3D-модель', open: 'Відкрити фото', close: 'Закрити', prev: 'Назад', next: 'Вперед', more: (n: number) => `+${n} фото` },
} as const

function ytId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/)
  return m ? m[1] : null
}
const ytThumb = (url: string) => { const id = ytId(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null }

const chip = 'text-white text-[14px] px-4 py-2.5 hover:bg-white/[0.12] focus-visible:bg-white/[0.12] transition-colors'
const tile = 'relative h-[72px] rounded-lg overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'

// Used by both the villa and the apartment detail pages.
export function VillaGallery({ photos, alts, plans, plan3dUrl, videos, title, lang, wishlistItem, extraChips, masterplan, masterplanCover }: {
  photos: string[]
  alts?: (string | undefined)[]
  plans: string[]
  plan3dUrl: string | null
  videos: GalleryVideo[]
  title: string
  lang: Lang
  /** Heart toggle in the top-right corner of the cover (apartment page). */
  wishlistItem?: WishlistInput
  /** Extra buttons in the chip bar — sun & shade, Google 3D map (complex page). */
  extraChips?: ReactNode
  /** Генплан комплекса с подсвеченной виллой — вкладка справа от планировок. */
  masterplan?: ReactNode
  /** Картинка для плитки «Генплан» в ленте превью. */
  masterplanCover?: string | null
}) {
  const c = pickCopy(COPY, lang)
  const [open, setOpen] = useState<{ tab: Tab; i: number } | null>(null)
  const planCount = plans.length + (plan3dUrl ? 1 : 0)
  if (photos.length === 0 && planCount === 0 && videos.length === 0) return null

  const cover = photos[0] ?? plans[0] ?? null
  // Strip: up to 4 photo thumbs, then a video tile and a plans tile when present.
  // The strip is 4 cells on phones and 5 from sm, so the photo thumbs fill
  // whatever the video/plan tiles leave, and «+N» sits on the last visible one.
  const extra = (videos.length > 0 ? 1 : 0) + (planCount > 0 ? 1 : 0) + (masterplan ? 1 : 0)
  const thumbs = photos.slice(1, 1 + Math.max(1, 5 - extra))
  const mobileN = Math.min(thumbs.length, Math.max(1, 4 - extra))
  const restMobile = photos.length - 1 - mobileN
  const restDesk = photos.length - 1 - thumbs.length

  return (
    <section className="flex flex-col gap-2">
      <div className="relative">
        {cover && (
          <button type="button" onClick={() => setOpen({ tab: photos.length ? 'photos' : 'plans', i: 0 })} aria-label={c.open}
            className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <Image src={cover} alt={alts?.[0] ?? title} width={920} height={480} sizes="(min-width: 1024px) 720px, 100vw" priority
              className="w-full h-[300px] sm:h-[400px] md:h-[480px] object-cover rounded-xl" />
          </button>
        )}
        {wishlistItem && <WishlistButton item={wishlistItem} className="absolute top-4 right-4 z-10" />}
        <div className={`absolute bottom-4 flex bg-[rgb(16_24_20/0.8)] rounded-lg overflow-hidden whitespace-nowrap ${extraChips ? 'left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 overflow-x-auto [scrollbar-width:none]' : 'left-1/2 -translate-x-1/2'}`}>
          {photos.length > 0 && <button type="button" onClick={() => setOpen({ tab: 'photos', i: 0 })} className={`${chip} font-semibold bg-white/[0.16]`}>{photos.length} {c.photos.toLowerCase()}</button>}
          {videos.length > 0 && <button type="button" onClick={() => setOpen({ tab: 'videos', i: 0 })} className={chip}>{videos.length} {c.videos.toLowerCase()}</button>}
          {planCount > 0 && <button type="button" onClick={() => setOpen({ tab: 'plans', i: 0 })} className={chip}>{c.plans}{planCount > 1 ? ` ${planCount}` : ''}</button>}
          {masterplan && <button type="button" onClick={() => setOpen({ tab: 'master', i: 0 })} className={chip}>{c.master}</button>}
          {extraChips}
        </div>
      </div>

      {(thumbs.length > 0 || extra > 0) && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {thumbs.map((p, i) => {
            const idx = i + 1
            const more = 'absolute inset-0 items-center justify-center bg-[rgb(16_24_20/0.55)] text-white text-[14px] font-semibold'
            return (
              <button key={p} type="button" onClick={() => setOpen({ tab: 'photos', i: idx })} aria-label={`${c.open} ${idx + 1}`}
                className={`${tile} cursor-zoom-in ${i >= mobileN ? 'hidden sm:block' : ''}`}>
                <Image src={p} alt={alts?.[idx] ?? title} width={160} height={72} sizes="160px" className="w-full h-full object-cover" />
                {i === mobileN - 1 && restMobile > 0 && <span className={`${more} flex sm:hidden`}>{c.more(restMobile)}</span>}
                {i === thumbs.length - 1 && restDesk > 0 && <span className={`${more} hidden sm:flex`}>{c.more(restDesk)}</span>}
              </button>
            )
          })}
          {videos.length > 0 && (
            <button type="button" onClick={() => setOpen({ tab: 'videos', i: 0 })} className={tile} aria-label={c.videos}>
              {ytThumb(videos[0].url) && <Image src={ytThumb(videos[0].url)!} alt="" width={160} height={72} sizes="160px" className="w-full h-full object-cover" unoptimized />}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-[rgb(16_24_20/0.72)] text-white text-[12px] font-semibold">
                <Play size={18} fill="currentColor" aria-hidden />{c.videos}
              </span>
            </button>
          )}
          {planCount > 0 && (
            <button type="button" onClick={() => setOpen({ tab: 'plans', i: 0 })} className={tile} aria-label={c.plans}>
              {plans[0] && <Image src={plans[0]} alt="" width={160} height={72} sizes="160px" className="w-full h-full object-cover" />}
              {/* Как «+7 фото»: тёмная плашка и белый текст — светлая была почти не видна. */}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[rgb(16_24_20/0.62)] text-white text-[14px] font-semibold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><path d="M14 14h4v4h-4z"/></svg>
                {c.plans}{planCount > 1 ? ` ${planCount}` : ''}
              </span>
            </button>
          )}
          {masterplan && (
            <button type="button" onClick={() => setOpen({ tab: 'master', i: 0 })} className={tile} aria-label={c.master}>
              {masterplanCover && <Image src={masterplanCover} alt="" width={160} height={72} sizes="160px" className="w-full h-full object-cover" />}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[rgb(16_24_20/0.55)] text-white text-[14px] font-semibold">
                <MapPinned size={18} aria-hidden />
                {c.master}
              </span>
            </button>
          )}
        </div>
      )}

      {open && (
        <MediaViewer
          photos={photos} plans={plans} plan3dUrl={plan3dUrl} videos={videos} alts={alts} title={title} lang={lang} masterplan={masterplan}
          tab={open.tab} index={open.i} onChange={(tab, i) => setOpen({ tab, i })} onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}

function MediaViewer({ photos, plans, plan3dUrl, videos, alts, title, lang, tab, index, onChange, onClose, masterplan }: {
  photos: string[]; plans: string[]; plan3dUrl: string | null; videos: GalleryVideo[]; masterplan?: ReactNode
  alts?: (string | undefined)[]; title: string; lang: Lang
  tab: Tab; index: number; onChange: (tab: Tab, i: number) => void; onClose: () => void
}) {
  const c = pickCopy(COPY, lang)
  // Plans tab: the 3D model first (it is the richest view), then plan images.
  type Item = { kind: 'img'; src: string; alt: string } | { kind: 'video'; url: string; name: string | null } | { kind: '3d'; src: string } | { kind: 'node' }
  const lists: Record<Tab, Item[]> = {
    photos: photos.map((src, i) => ({ kind: 'img' as const, src, alt: alts?.[i] ?? title })),
    videos: videos.map(v => ({ kind: 'video' as const, url: v.url, name: v.name })),
    plans: [
      ...(plan3dUrl ? [{ kind: '3d' as const, src: `${plan3dUrl}?lang=${lang}` }] : []),
      ...plans.map(src => ({ kind: 'img' as const, src, alt: `${title} - ${c.plans.toLowerCase()}` })),
    ],
    master: masterplan ? [{ kind: 'node' as const }] : [],
  }
  const items = lists[tab]
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

  const tabs = (['photos', 'videos', 'plans', 'master'] as Tab[]).filter(t => lists[t].length > 0)
  const navBtn = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 focus-visible:bg-white/20 text-white flex items-center justify-center transition-colors'

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] bg-[#0C100E] flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map(t => (
            <button key={t} type="button" onClick={() => onChange(t, 0)}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${t === tab ? 'bg-white text-[#101814]' : 'text-white/80 hover:bg-white/10'}`}>
              {c[t]}{t !== 'master' && <> <span className="opacity-60">{lists[t].length}</span></>}
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
        {item?.kind === 'node' && (
          <div className="w-full max-w-[1200px] max-h-full overflow-y-auto">{masterplan}</div>
        )}
        {item?.kind === '3d' && (
          <iframe key={item.src} src={item.src} title={c.model3d} className="w-full h-full max-w-[1200px] rounded-lg border-0 bg-white" />
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
