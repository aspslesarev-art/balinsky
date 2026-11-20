'use client'

// Полноэкранное окно медиаблока (макет «Окно медиаблока», владелец
// 2026-11-11): шапка с названием и вкладками, у каждой вкладки своя нижняя
// панель. На телефоне вкладки внизу, под большим пальцем. С 2026-11-19 окно
// белое, в стиле «Журнал» окна аналитики: текстовые вкладки, тонкие линии.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, Play, Box, Download, Minus, Plus } from 'lucide-react'
import type { PromoKit } from '@/lib/promo-kits'
import { pickCopy, type Lang } from '@/lib/i18n'
import { VIEWER_ASIDE, VIEWER_LABEL } from './media-viewer-aside'

export type GalleryVideo = { url: string; name: string | null }
export type BaseTab = 'photos' | 'videos' | 'plans' | 'master' | 'tour' | 'promo'
// Свои вкладки окна (солнце и ветер, 3D-карта, документы) — ключ `x:<key>`.
export type Tab = BaseTab | `x:${string}`

/** Вкладка окна медиаблока со своей плиткой. `bleed` — без отступов (документы),
 *  `hideTile` — без плитки под фото, открывается событием bx:open-media (зоны). */
export type ViewerTab = { key: string; label: string; icon: ReactNode; cover?: string | null; content: ReactNode; bleed?: boolean; hideTile?: boolean }

const COPY = {
  ru: { promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Видео', plans: 'Планировки', model3d: '3D-модель', plan: (n: number) => `План ${n}`, model3dSub: 'Покрутить дом', close: 'Закрыть', prev: 'Назад', next: 'Вперёд', dlPhoto: 'Скачать фото', dlPlan: 'Скачать план', zoomIn: 'Приблизить', zoomOut: 'Отдалить', swipe: 'Листайте пальцем', pinch: 'Двумя пальцами - приблизить', nowPlaying: 'Сейчас играет', upNext: 'Дальше', videosN: (n: number) => `${n} видео`, rotate: 'Поверните телефон - на весь экран',
    promoTitle: 'Сторис для агента', promoText: 'Без названия объекта и застройщика. Скачайте серию и выкладывайте по одной в день.', storiesN: (n: number) => `${n} сторис`, day: (n: number) => `День ${n}`, dlAll: (n: number) => `Скачать все ${n}`, saveAll: (n: number) => `Сохранить все ${n} в Фото`, oneADay: 'Выкладывайте по одной в день', dl: 'Скачать' },
  en: { promo: 'Marketing', tour: '3D tour', master: 'Master plan', photos: 'Photos', videos: 'Videos', plans: 'Floor plans', model3d: '3D model', plan: (n: number) => `Plan ${n}`, model3dSub: 'Spin the house', close: 'Close', prev: 'Previous', next: 'Next', dlPhoto: 'Download photo', dlPlan: 'Download plan', zoomIn: 'Zoom in', zoomOut: 'Zoom out', swipe: 'Swipe to browse', pinch: 'Pinch to zoom', nowPlaying: 'Now playing', upNext: 'Up next', videosN: (n: number) => `${n} videos`, rotate: 'Rotate your phone for full screen',
    promoTitle: 'Stories for agents', promoText: 'No project or developer name. Download a series and post one a day.', storiesN: (n: number) => `${n} stories`, day: (n: number) => `Day ${n}`, dlAll: (n: number) => `Download all ${n}`, saveAll: (n: number) => `Save all ${n} to Photos`, oneADay: 'Post one a day', dl: 'Download' },
  id: { promo: 'Pemasaran', tour: 'Tur 3D', master: 'Rencana induk', photos: 'Foto', videos: 'Video', plans: 'Denah', model3d: 'Model 3D', plan: (n: number) => `Denah ${n}`, model3dSub: 'Putar rumahnya', close: 'Tutup', prev: 'Sebelumnya', next: 'Berikutnya', dlPhoto: 'Unduh foto', dlPlan: 'Unduh denah', zoomIn: 'Perbesar', zoomOut: 'Perkecil', swipe: 'Geser untuk melihat', pinch: 'Cubit untuk memperbesar', nowPlaying: 'Sedang diputar', upNext: 'Berikutnya', videosN: (n: number) => `${n} video`, rotate: 'Putar ponsel untuk layar penuh', promoTitle: 'Story untuk agen', promoText: 'Tanpa nama proyek dan pengembang. Unduh serinya dan unggah satu per hari.', storiesN: (n: number) => `${n} story`, day: (n: number) => `Hari ${n}`, dlAll: (n: number) => `Unduh semua ${n}`, saveAll: (n: number) => `Simpan semua ${n} ke Foto`, oneADay: 'Unggah satu per hari', dl: 'Unduh' },
  fr: { promo: 'Marketing', tour: 'Visite 3D', master: 'Plan de masse', photos: 'Photos', videos: 'Vidéos', plans: 'Plans', model3d: 'Modèle 3D', plan: (n: number) => `Plan ${n}`, model3dSub: 'Faire pivoter la maison', close: 'Fermer', prev: 'Précédent', next: 'Suivant', dlPhoto: 'Télécharger la photo', dlPlan: 'Télécharger le plan', zoomIn: 'Zoomer', zoomOut: 'Dézoomer', swipe: 'Faites glisser pour parcourir', pinch: 'Pincez pour zoomer', nowPlaying: 'En cours de lecture', upNext: 'À suivre', videosN: (n: number) => `${n} vidéos`, rotate: 'Tournez votre téléphone pour le plein écran', promoTitle: 'Stories pour agents', promoText: 'Sans nom du projet ni du promoteur. Téléchargez la série et publiez-en une par jour.', storiesN: (n: number) => `${n} stories`, day: (n: number) => `Jour ${n}`, dlAll: (n: number) => `Tout télécharger (${n})`, saveAll: (n: number) => `Enregistrer les ${n} dans Photos`, oneADay: 'Publiez-en une par jour', dl: 'Télécharger' },
  de: { promo: 'Marketing', tour: '3D-Tour', master: 'Lageplan', photos: 'Fotos', videos: 'Videos', plans: 'Grundrisse', model3d: '3D-Modell', plan: (n: number) => `Plan ${n}`, model3dSub: 'Haus drehen', close: 'Schließen', prev: 'Zurück', next: 'Weiter', dlPhoto: 'Foto herunterladen', dlPlan: 'Plan herunterladen', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', swipe: 'Wischen zum Blättern', pinch: 'Mit zwei Fingern zoomen', nowPlaying: 'Läuft gerade', upNext: 'Als Nächstes', videosN: (n: number) => `${n} Videos`, rotate: 'Drehen Sie das Handy für Vollbild', promoTitle: 'Stories für Makler', promoText: 'Ohne Projekt- und Bauträgernamen. Laden Sie die Serie herunter und posten Sie eine pro Tag.', storiesN: (n: number) => `${n} Stories`, day: (n: number) => `Tag ${n}`, dlAll: (n: number) => `Alle ${n} herunterladen`, saveAll: (n: number) => `Alle ${n} in Fotos sichern`, oneADay: 'Eine pro Tag posten', dl: 'Herunterladen' },
  zh: { promo: '推广', tour: '3D看房', master: '总平面图', photos: '照片', videos: '视频', plans: '户型图', model3d: '3D模型', plan: (n: number) => `户型图 ${n}`, model3dSub: '旋转房屋', close: '关闭', prev: '上一张', next: '下一张', dlPhoto: '下载照片', dlPlan: '下载户型图', zoomIn: '放大', zoomOut: '缩小', swipe: '滑动浏览', pinch: '双指缩放', nowPlaying: '正在播放', upNext: '下一个', videosN: (n: number) => `${n}个视频`, rotate: '横置手机全屏观看', promoTitle: '经纪人快拍素材', promoText: '不含项目和开发商名称。下载整套素材，每天发布一张。', storiesN: (n: number) => `${n}张快拍`, day: (n: number) => `第${n}天`, dlAll: (n: number) => `全部下载（${n}）`, saveAll: (n: number) => `将${n}张全部存入相册`, oneADay: '每天发布一张', dl: '下载' },
  nl: { promo: 'Marketing', tour: '3D-tour', master: 'Masterplan', photos: 'Foto’s', videos: 'Video’s', plans: 'Plattegronden', model3d: '3D-model', plan: (n: number) => `Plattegrond ${n}`, model3dSub: 'Draai het huis', close: 'Sluiten', prev: 'Vorige', next: 'Volgende', dlPhoto: 'Foto downloaden', dlPlan: 'Plattegrond downloaden', zoomIn: 'Inzoomen', zoomOut: 'Uitzoomen', swipe: 'Veeg om te bladeren', pinch: 'Knijp om te zoomen', nowPlaying: 'Speelt nu', upNext: 'Hierna', videosN: (n: number) => `${n} video’s`, rotate: 'Draai je telefoon voor volledig scherm', promoTitle: 'Stories voor makelaars', promoText: 'Zonder project- of ontwikkelaarsnaam. Download de reeks en plaats er één per dag.', storiesN: (n: number) => `${n} stories`, day: (n: number) => `Dag ${n}`, dlAll: (n: number) => `Alle ${n} downloaden`, saveAll: (n: number) => `Alle ${n} bewaren in Foto’s`, oneADay: 'Plaats er één per dag', dl: 'Downloaden' },
  ban: { promo: 'Promosi', tour: 'Tur 3D', master: 'Rencana induk', photos: 'Foto', videos: 'Video', plans: 'Denah', model3d: 'Model 3D', plan: (n: number) => `Denah ${n}`, model3dSub: 'Ulengang umahe', close: 'Tutup', prev: 'Sadurungnyane', next: 'Salanturnyane', dlPhoto: 'Unduh foto', dlPlan: 'Unduh denah', zoomIn: 'Gedenang', zoomOut: 'Alitang', swipe: 'Geser anggen nyingakin', pinch: 'Anggen jriji kalih anggen ngedenang', nowPlaying: 'Mangkin kaputer', upNext: 'Salanturnyane', videosN: (n: number) => `${n} video`, rotate: 'Ulengang HP anggen layar penuh', promoTitle: 'Story anggen agen', promoText: 'Tanpa wasta proyek miwah pangwangun. Unduh serine lan unggah asiki sabilang rahina.', storiesN: (n: number) => `${n} story`, day: (n: number) => `Rahina ${n}`, dlAll: (n: number) => `Unduh sami ${n}`, saveAll: (n: number) => `Simpen sami ${n} ring Foto`, oneADay: 'Unggah asiki sabilang rahina', dl: 'Unduh' },
  pl: { promo: 'Marketing', tour: 'Wycieczka 3D', master: 'Plan zagospodarowania', photos: 'Zdjęcia', videos: 'Filmy', plans: 'Rzuty', model3d: 'Model 3D', plan: (n: number) => `Rzut ${n}`, model3dSub: 'Obróć dom', close: 'Zamknij', prev: 'Poprzednie', next: 'Następne', dlPhoto: 'Pobierz zdjęcie', dlPlan: 'Pobierz rzut', zoomIn: 'Powiększ', zoomOut: 'Pomniejsz', swipe: 'Przesuń, aby przeglądać', pinch: 'Uszczypnij, aby powiększyć', nowPlaying: 'Teraz odtwarzane', upNext: 'Następne', videosN: (n: number) => `Filmy: ${n}`, rotate: 'Obróć telefon, aby zobaczyć na pełnym ekranie', promoTitle: 'Relacje dla agentów', promoText: 'Bez nazwy projektu i dewelopera. Pobierz serię i publikuj jedną dziennie.', storiesN: (n: number) => `Relacje: ${n}`, day: (n: number) => `Dzień ${n}`, dlAll: (n: number) => `Pobierz wszystkie (${n})`, saveAll: (n: number) => `Zapisz wszystkie (${n}) w Zdjęciach`, oneADay: 'Publikuj jedną dziennie', dl: 'Pobierz' },
  uk: { promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Відео', plans: 'Планування', model3d: '3D-модель', plan: (n: number) => `План ${n}`, model3dSub: 'Покрутити будинок', close: 'Закрити', prev: 'Назад', next: 'Вперед', dlPhoto: 'Завантажити фото', dlPlan: 'Завантажити план', zoomIn: 'Наблизити', zoomOut: 'Віддалити', swipe: 'Гортайте пальцем', pinch: 'Двома пальцями — наблизити', nowPlaying: 'Зараз грає', upNext: 'Далі', videosN: (n: number) => `${n} відео`, rotate: 'Поверніть телефон — на весь екран', promoTitle: 'Сторіс для агента', promoText: 'Без назви об’єкта та забудовника. Завантажте серію і викладайте по одній на день.', storiesN: (n: number) => `${n} сторіс`, day: (n: number) => `День ${n}`, dlAll: (n: number) => `Завантажити всі ${n}`, saveAll: (n: number) => `Зберегти всі ${n} у Фото`, oneADay: 'Викладайте по одній на день', dl: 'Завантажити' },
} as const

function ytId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/)
  return m ? m[1] : null
}
export const ytThumb = (url: string) => { const id = ytId(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null }

/** Ссылка «скачать» для файла из Supabase Storage (?download=имя). */
function downloadHref(src: string): string {
  const name = decodeURIComponent(src.split('?')[0].split('/').pop() ?? 'file')
  return src.includes('/storage/v1/object/public/') ? `${src.split('?')[0]}?download=${encodeURIComponent(name)}` : src
}

function useWide() {
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

type Item = { kind: 'img'; src: string; alt: string } | { kind: 'video'; url: string; name: string | null } | { kind: '3d'; src: string } | { kind: 'node' } | { kind: 'promo' } | { kind: 'custom'; content: ReactNode; bleed?: boolean }

export function MediaViewer({ photos, plans, plan3dUrl, videos, alts, title, lang, tab, index, onChange, onClose, masterplan, tourUrl, plansLabel, promo, viewerTabs = [] }: {
  photos: string[]; plans: string[]; plan3dUrl: string | null; videos: GalleryVideo[]; masterplan?: ReactNode; tourUrl?: string | null; plansLabel?: string; promo?: PromoKit | null; viewerTabs?: ViewerTab[]
  alts?: (string | undefined)[]; title: string; lang: Lang
  tab: Tab; index: number; onChange: (tab: Tab, i: number) => void; onClose: () => void
}) {
  const base = pickCopy(COPY, lang)
  const tabCopy = pickCopy({
    ru: { promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Видео', plans: 'Планировки' },
    en: { promo: 'Marketing', tour: '3D tour', master: 'Master plan', photos: 'Photos', videos: 'Videos', plans: 'Floor plans' },
    id: { promo: 'Materi promosi', tour: 'Tur 3D', master: 'Masterplan', photos: 'Foto', videos: 'Video', plans: 'Denah' },
    fr: { promo: 'Publicité', tour: 'Visite 3D', master: 'Plan masse', photos: 'Photos', videos: 'Vidéos', plans: 'Plans' },
    de: { promo: 'Werbung', tour: '3D-Rundgang', master: 'Lageplan', photos: 'Fotos', videos: 'Videos', plans: 'Grundrisse' },
    zh: { promo: '推广素材', tour: '3D 漫游', master: '总平面图', photos: '照片', videos: '视频', plans: '平面图' },
    nl: { promo: 'Reclame', tour: '3D-tour', master: 'Masterplan', photos: "Foto's", videos: "Video's", plans: 'Plattegronden' },
    ban: { promo: 'Promosi', tour: 'Tur 3D', master: 'Masterplan', photos: 'Poto', videos: 'Vidéo', plans: 'Denah' },
    pl: { promo: 'Reklama', tour: 'Spacer 3D', master: 'Plan osiedla', photos: 'Zdjęcia', videos: 'Wideo', plans: 'Rzuty' },
    uk: { promo: 'Реклама', tour: '3D-тур', master: 'Генплан', photos: 'Фото', videos: 'Відео', plans: 'Планування' },
  }, lang)
  const c = { ...base, ...tabCopy, ...(plansLabel ? { plans: plansLabel } : {}) }
  const wide = useWide()

  const lists: Record<string, Item[]> = {
    photos: photos.map((src, i) => ({ kind: 'img' as const, src, alt: alts?.[i] ?? title })),
    plans: [
      ...(plan3dUrl ? [{ kind: '3d' as const, src: `${plan3dUrl}?lang=${lang}` }] : []),
      ...plans.map(src => ({ kind: 'img' as const, src, alt: `${title} - ${c.plans.toLowerCase()}` })),
    ],
    master: masterplan ? [{ kind: 'node' as const }] : [],
    videos: videos.map(v => ({ kind: 'video' as const, url: v.url, name: v.name })),
    tour: tourUrl ? [{ kind: '3d' as const, src: tourUrl }] : [],
    promo: promo ? [{ kind: 'promo' as const }] : [],
    ...Object.fromEntries(viewerTabs.map(v => [`x:${v.key}`, [{ kind: 'custom' as const, content: v.content, bleed: v.bleed }]])),
  }
  const labelOf = (t: Tab) => t.startsWith('x:') ? viewerTabs.find(v => `x:${v.key}` === t)?.label ?? '' : c[t as BaseTab]
  const countOf = (t: Tab) => (t === 'photos' || t === 'videos' || t === 'plans') ? lists[t].length : null
  const tabs = ([...(['photos', 'plans', 'master', 'videos', 'tour'] as Tab[]), ...viewerTabs.map(v => `x:${v.key}` as Tab), 'promo'] as Tab[]).filter(t => (lists[t] ?? []).length > 0)

  const items = lists[tab] ?? []
  const count = items.length
  const i = Math.min(index, Math.max(count - 1, 0))
  const item = items[i]
  const go = useCallback((d: number) => { if (count > 1) onChange(tab, (i + d + count) % count) }, [count, i, tab, onChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (tab === 'photos' && e.key === 'ArrowRight') go(1)
      else if (tab === 'photos' && e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [go, onClose, tab])

  const mobileNav = useRef<HTMLElement>(null)
  useEffect(() => {
    mobileNav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [tab])

  // Заголовок: «Вилла CITRINE №2 в Убуде - 109,4 м², …» → название и подпись.
  const dash = title.indexOf(' - ')
  const head = dash > 0 ? title.slice(0, dash) : title
  const sub = dash > 0 ? title.slice(dash + 3) : ''
  const mobileSub = `${labelOf(tab)}${tab === 'photos' && count > 1 ? ` · ${i + 1} / ${count}` : countOf(tab) ? ` · ${countOf(tab)}` : ''}`

  const tabBtn = (t: Tab) => (
    <button key={t} type="button" onClick={() => onChange(t, 0)} aria-current={t === tab ? 'page' : undefined}
      className={`shrink-0 h-11 lg:h-10 whitespace-nowrap border-0 border-b-2 bg-transparent px-0 pt-1 text-[15px] inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1A15] ${t === tab ? 'border-[#0F1A15] font-semibold text-[#0F1A15]' : 'border-transparent text-[#6B7570] hover:text-[#0F1A15]'}`}>
      {labelOf(t)}{countOf(t) ? <span className="font-normal text-[#6B7570]">{countOf(t)}</span> : null}
    </button>
  )

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] bg-white text-[#0F1A15] flex flex-col">
      <header className="h-16 shrink-0 flex items-center gap-6 pl-4 pr-2 lg:px-6 border-b border-[#ECEFED]">
        <div className="flex-1 lg:flex-none lg:w-[260px] min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold truncate">{head}</span>
          <span className="text-[13px] text-[#6B7570] truncate">{wide ? sub : mobileSub}</span>
        </div>
        <nav className="hidden lg:flex flex-1 min-w-0 self-stretch items-end justify-center-safe gap-8 overflow-x-auto [scrollbar-width:none]">{tabs.map(tabBtn)}</nav>
        <div className="shrink-0 flex justify-end">
          <button type="button" onClick={onClose} aria-label={c.close} className="w-11 h-11 rounded-full border-0 bg-transparent text-[#0F1A15] hover:bg-[#F1F3F2] flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1A15]"><X size={22} strokeWidth={1.75} /></button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'photos' && <PhotosPane items={items as Extract<Item, { kind: 'img' }>[]} i={i} go={go} pick={k => onChange(tab, k)} c={c} wide={wide} />}
        {tab === 'plans' && <PlansPane items={items} i={i} pick={k => onChange(tab, k)} c={c} wide={wide} />}
        {tab === 'videos' && <VideosPane items={items as Extract<Item, { kind: 'video' }>[]} i={i} pick={k => onChange(tab, k)} c={c} wide={wide} title={title} />}
        {tab === 'master' && <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">{masterplan}</div>}
        {tab === 'tour' && item?.kind === '3d' && <div className="flex-1 min-h-0 p-4 lg:p-6"><iframe src={item.src} title={c.tour} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" className="w-full h-full rounded-lg border border-[#ECEFED] bg-white" /></div>}
        {tab === 'promo' && promo && <PromoPane promo={promo} c={c} wide={wide} />}
        {item?.kind === 'custom' && <div key={tab} className={`flex-1 min-h-0 ${item.bleed ? '' : 'p-3 lg:p-6'}`}>{item.content}</div>}
      </div>

      <nav ref={mobileNav} className="lg:hidden shrink-0 flex gap-6 overflow-x-auto px-4 pt-1 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-[#ECEFED] [scrollbar-width:none]">{tabs.map(tabBtn)}</nav>
    </div>
  )
}

type RuCopy = typeof COPY['ru']
type C = { [K in keyof RuCopy]: RuCopy[K] extends (...a: infer A) => string ? (...a: A) => string : string } & Record<BaseTab, string>

// Второстепенная кнопка - контур, главная - зелёная кнопка сайта.
const ghostBtn = 'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[#0F1A15] bg-transparent hover:bg-[#F1F3F2] text-[14px] text-[#0F1A15] no-underline cursor-pointer transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1A15]'
const primaryBtn = 'inline-flex items-center justify-center gap-2 h-11 px-[18px] rounded-xl border-0 bg-[var(--color-primary)] hover:brightness-110 text-[15px] font-semibold text-white no-underline cursor-pointer transition-[filter] duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1A15]'
// Выбранная картинка в списке - как в окне аналитики: обводка с отступом.
const pickedOutline = { outline: '2px solid #0F1A15', outlineOffset: 3 }

function PhotosPane({ items, i, go, pick, c, wide }: { items: { src: string; alt: string }[]; i: number; go: (d: number) => void; pick: (k: number) => void; c: C; wide: boolean }) {
  const swipe = useRef<number | null>(null)
  const cur = items[i]
  const thumbs = useRef<HTMLDivElement>(null)
  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-k="${i}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [i])
  if (!cur) return null
  const arrow = 'absolute top-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-[#0F1A15]/70 hover:bg-[#0F1A15]/85 text-white flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1A15]'
  const stage = (
      <div className="relative flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center gap-3 lg:px-24 lg:py-6"
        onPointerDown={e => { if (e.pointerType !== 'mouse') swipe.current = e.clientX }}
        onPointerUp={e => { const x0 = swipe.current; swipe.current = null; if (x0 != null && Math.abs(e.clientX - x0) > 40) go(e.clientX < x0 ? 1 : -1) }}>
        <div className="relative w-full flex-1 min-h-0 max-h-[60vh] lg:max-h-none">
          <Image key={cur.src} src={cur.src} alt={cur.alt} fill sizes="100vw" className="object-contain lg:rounded-lg" draggable={false} priority />
        </div>
        {!wide && items.length > 1 && (
          <>
            <div className="flex gap-1.5" aria-hidden>
              {items.slice(Math.max(0, Math.min(i - 2, items.length - 5)), Math.max(0, Math.min(i - 2, items.length - 5)) + 5).map((it, k, arr) => {
                const idx = items.indexOf(it)
                return <span key={idx} className={`h-1.5 rounded-full ${idx === i ? 'w-[18px] bg-[#0F1A15]' : 'w-1.5 bg-[#0F1A15]/25'}`} data-n={arr.length} />
              })}
            </div>
            <span className="text-[13px] text-[#6B7570] pb-2">{c.swipe}</span>
          </>
        )}
        {wide && items.length > 1 && <>
          <button type="button" onClick={() => go(-1)} aria-label={c.prev} className={`${arrow} left-6`}><ChevronLeft size={24} /></button>
          <button type="button" onClick={() => go(1)} aria-label={c.next} className={`${arrow} right-6`}><ChevronRight size={24} /></button>
        </>}
      </div>
  )
  if (!wide) return stage
  return (
    <div className="flex-1 min-h-0 flex">
      <aside className={VIEWER_ASIDE}>
        <div className="flex flex-col gap-1">
          <span className={VIEWER_LABEL}>{c.photos} <span className="tabular-nums">· {i + 1} / {items.length}</span></span>
          <span className="text-[13px] leading-[1.5] text-[#4A5550] line-clamp-2">{cur.alt}</span>
        </div>
        <a href={downloadHref(cur.src)} download className={primaryBtn}><Download size={16} aria-hidden />{c.dlPhoto}</a>
        {items.length > 1 && (
          <div ref={thumbs} className="grid grid-cols-2 gap-3 p-1">
            {items.map((it, k) => (
              <button key={k} data-k={k} type="button" onClick={() => pick(k)} aria-label={`${k + 1}`}
                style={k === i ? pickedOutline : undefined}
                className={`relative aspect-[3/2] rounded-md overflow-hidden border-0 p-0 bg-[#F1F3F2] cursor-pointer transition-opacity duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1A15] ${k === i ? '' : 'opacity-70 hover:opacity-100'}`}>
                <Image src={it.src} alt="" fill sizes="136px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </aside>
      {stage}
    </div>
  )
}

function PlansPane({ items, i, pick, c, wide }: { items: Item[]; i: number; pick: (k: number) => void; c: C; wide: boolean }) {
  const [zoom, setZoom] = useState(1)
  useEffect(() => setZoom(1), [i])
  const cur = items[i]
  let planNo = 0
  const labels = items.map(it => it.kind === '3d' ? { title: c.model3d, sub: c.model3dSub } : { title: c.plan(++planNo), sub: '' })
  const thumbOf = (it: Item) => it.kind === 'img' ? it.src : null
  const view = cur?.kind === '3d'
    ? <iframe key={cur.src} src={cur.src} title={c.model3d} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" className="w-full h-full border-0 bg-white" />
    : cur?.kind === 'img'
      ? <div className="w-full h-full overflow-auto flex items-center justify-center">
          <div className="relative w-[94%] h-[94%] transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
            <Image key={cur.src} src={cur.src} alt={cur.alt} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      : null
  const dl = cur?.kind === 'img' ? <a href={downloadHref(cur.src)} download className={`${primaryBtn} ${wide ? '' : 'h-12 w-full'}`}><Download size={16} aria-hidden />{c.dlPlan}</a> : null

  if (!wide) {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3">
        <div className="relative flex-1 min-h-0 rounded-xl bg-white border border-[#ECEFED] overflow-hidden">
          {view}
          {cur?.kind === 'img' && <span className="absolute left-2.5 bottom-2.5 px-2 py-1 rounded-md bg-[rgb(15_26_21/0.75)] text-white text-[12px]">{c.pinch}</span>}
        </div>
        {items.length > 1 && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {labels.map((l, k) => (
              <button key={k} type="button" onClick={() => pick(k)} className={`shrink-0 h-11 px-3.5 rounded-xl border text-[14px] cursor-pointer ${k === i ? 'border-[#0F1A15] font-semibold text-[#0F1A15]' : 'border-[#ECEFED] text-[#4A5550]'}`}>{l.title}</button>
            ))}
          </div>
        )}
        {dl}
      </div>
    )
  }
  return (
    <div className="flex-1 min-h-0 flex">
      {items.length > 1 && (
        <aside className={VIEWER_ASIDE}>
          <span className={VIEWER_LABEL}>{c.plans}</span>
          {items.map((it, k) => (
            <button key={k} type="button" onClick={() => pick(k)}
              className={`flex items-center gap-3 py-1 border-0 bg-transparent text-left cursor-pointer transition-opacity duration-[120ms] ${k === i ? '' : 'opacity-70 hover:opacity-100'}`}>
              <span className="relative w-16 h-12 shrink-0 rounded-md bg-[#F6F7F6] border border-[#ECEFED] overflow-hidden flex items-center justify-center" style={k === i ? pickedOutline : undefined}>
                {thumbOf(it) ? <Image src={thumbOf(it)!} alt="" fill sizes="64px" className="object-cover" /> : <Box size={22} className="text-[#1B6E4A]" aria-hidden />}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={`text-[14px] ${k === i ? 'font-semibold text-[#0F1A15]' : 'text-[#4A5550]'}`}>{labels[k].title}</span>
                {labels[k].sub && <span className="text-[13px] text-[#6B7570]">{labels[k].sub}</span>}
              </span>
            </button>
          ))}
        </aside>
      )}
      <div className="flex-1 min-w-0 p-6 flex flex-col gap-4">
        <div className="relative flex-1 min-h-0 rounded-xl bg-white border border-[#ECEFED] overflow-hidden">
          {view}
          {cur?.kind === 'img' && (
            <div className="absolute right-4 bottom-4 flex flex-col rounded-[10px] bg-white border border-[#ECEFED] shadow-[0_1px_2px_rgb(0_0_0/.04),0_4px_12px_rgb(0_0_0/.06)] overflow-hidden text-[#0F1A15]">
              <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.5))} aria-label={c.zoomIn} className="w-11 h-11 flex items-center justify-center hover:bg-[#F1F3F2] cursor-pointer"><Plus size={18} /></button>
              <button type="button" onClick={() => setZoom(z => Math.max(1, z - 0.5))} aria-label={c.zoomOut} className="w-11 h-11 flex items-center justify-center border-t border-[#ECEFED] hover:bg-[#F1F3F2] cursor-pointer"><Minus size={18} /></button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[15px] font-semibold">{labels[i]?.title}</span>
          <span className="flex-1" />
          {dl}
        </div>
      </div>
    </div>
  )
}

function VideosPane({ items, i, pick, c, wide, title }: { items: { url: string; name: string | null }[]; i: number; pick: (k: number) => void; c: C; wide: boolean; title: string }) {
  const cur = items[i]
  if (!cur) return null
  const id = ytId(cur.url)
  const player = id
    ? <iframe key={id} src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={cur.name ?? title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="w-full aspect-video border-0 lg:rounded-xl bg-black" />
    : <a href={cur.url} target="_blank" rel="noopener noreferrer" className="text-[#0F1A15] underline p-4">{cur.name ?? cur.url}</a>
  const list = items.map((v, k) => ({ v, k })).filter(({ k }) => wide || k !== i)
  const row = ({ v, k }: { v: { url: string; name: string | null }; k: number }) => (
    <button key={k} type="button" onClick={() => pick(k)}
      className={`flex gap-3 py-1 border-0 bg-transparent text-left cursor-pointer transition-opacity duration-[120ms] ${k === i ? '' : 'opacity-70 hover:opacity-100'}`}>
      <span className="relative w-[120px] aspect-video shrink-0 rounded-md overflow-hidden bg-[#F1F3F2] text-white" style={k === i && wide ? pickedOutline : undefined}>
        {ytThumb(v.url) && <Image src={ytThumb(v.url)!} alt="" fill sizes="136px" className="object-cover" unoptimized />}
        <span className="absolute inset-0 flex items-center justify-center"><Play size={16} fill="currentColor" aria-hidden /></span>
      </span>
      <span className="flex flex-col gap-1 pt-0.5">
        <span className={`text-[14px] leading-snug ${k === i ? 'font-semibold text-[#0F1A15]' : 'text-[#4A5550]'}`}>{v.name ?? `${c.videos} ${k + 1}`}</span>
        {wide && <span className="text-[13px] text-[#6B7570]">{k === i ? c.nowPlaying : c.upNext}</span>}
      </span>
    </button>
  )
  if (!wide) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pb-4">
        {player}
        <div className="px-4 flex flex-col gap-1">
          <span className="text-[17px] font-semibold">{cur.name ?? `${c.videos} ${i + 1}`}</span>
          <span className="text-[13px] text-[#6B7570]">{c.rotate}</span>
        </div>
        {list.length > 0 && (
          <div className="px-4 flex flex-col gap-2">
            <span className={VIEWER_LABEL}>{c.upNext}</span>
            {list.map(row)}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex-1 min-h-0 flex">
      {items.length > 1 && (
        <aside className={`${VIEWER_ASIDE} !gap-3`}>
          <span className={VIEWER_LABEL}>{c.videosN(items.length)}</span>
          {list.map(row)}
        </aside>
      )}
      <div className="flex-1 min-w-0 p-6 flex flex-col gap-4 overflow-y-auto">
        <div className="w-full max-w-[1100px]">{player}</div>
        <span className="text-[17px] font-semibold">{cur.name ?? `${c.videos} ${i + 1}`}</span>
      </div>
    </div>
  )
}

function PromoPane({ promo, c, wide }: { promo: PromoKit; c: C; wide: boolean }) {
  const [s, setS] = useState(0)
  const series = promo.series[Math.min(s, promo.series.length - 1)]
  const files = series.files

  async function saveAll() {
    // На телефоне — системное «Сохранить в Фото» через меню «Поделиться».
    try {
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (!wide && nav.share && nav.canShare) {
        const blobs = await Promise.all(files.map(f => fetch(f).then(r => r.blob())))
        const shareFiles = blobs.map((b, k) => new File([b], `story-${k + 1}.png`, { type: b.type || 'image/png' }))
        if (nav.canShare({ files: shareFiles })) { await nav.share({ files: shareFiles }); return }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      console.error('[promo] share failed', err)
    }
    files.forEach((f, k) => setTimeout(() => {
      const a = document.createElement('a')
      a.href = downloadHref(f)
      a.download = ''
      document.body.appendChild(a); a.click(); a.remove()
    }, k * 400))
  }

  // Компьютер: сторис целиком влезают по высоте окна (владелец: «обрезается»).
  // Ширина плитки - меньшая из «доли ширины ряда» и «высоты ряда × 9/16»;
  // 100cq* - размеры ряда-контейнера, 54px - кнопка «Скачать» с отступом.
  const perRow = Math.min(files.length, 4)
  const rowsN = Math.ceil(files.length / perRow)
  const tileW = `min(calc((100cqw - ${(perRow - 1) * 20 + 1}px) / ${perRow}), calc(((100cqh - ${(rowsN - 1) * 20}px) / ${rowsN} - 54px) * 9 / 16))`
  const tile = (f: string, k: number, mobile: boolean) => (
    <div key={f} className="flex flex-col gap-2.5 min-h-0" style={mobile ? undefined : { width: tileW }}>
      <div className="relative shrink-0 rounded-xl overflow-hidden bg-[#F1F3F2]">
        <a href={f} target="_blank" rel="noopener" className="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0F1A15]">
          {/* eslint-disable-next-line @next/next/no-img-element -- готовое лёгкое превью */}
          <img src={series.thumbs?.[k] ?? f} alt={`${series.title} ${k + 1}`} loading="lazy" className="block w-full aspect-[9/16] object-cover" />
        </a>
        <span className="absolute left-2.5 top-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[12px] font-semibold">{c.day(k + 1)}</span>
        {mobile && (
          <a href={downloadHref(f)} download aria-label={c.dl} className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[rgb(15_26_21/0.8)] text-white flex items-center justify-center"><Download size={18} aria-hidden /></a>
        )}
      </div>
      {!mobile && <a href={downloadHref(f)} download className={`${ghostBtn} h-11`}><Download size={16} aria-hidden />{c.dl}</a>}
    </div>
  )

  if (!wide) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 flex gap-1.5 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none]">
          {promo.series.map((x, k) => (
            <button key={x.title} type="button" onClick={() => setS(k)} className={`shrink-0 h-10 px-3.5 rounded-xl border text-[14px] cursor-pointer ${k === s ? 'border-[#0F1A15] font-semibold text-[#0F1A15]' : 'border-[#ECEFED] text-[#4A5550]'}`}>{x.title}</button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 grid grid-cols-2 auto-rows-max gap-3 content-start">{files.map((f, k) => tile(f, k, true))}</div>
        <div className="shrink-0 px-4 pt-3 flex flex-col gap-1.5">
          <button type="button" onClick={saveAll} className={`${primaryBtn} h-12 text-[16px]`}>{c.saveAll(files.length)}</button>
          <span className="text-center text-[12px] text-[#6B7570]">{c.oneADay}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex-1 min-h-0 flex">
      <aside className={VIEWER_ASIDE}>
        <div className="flex flex-col gap-2">
          <span className="text-[20px] font-semibold tracking-tight">{c.promoTitle}</span>
          <span className="text-[14px] leading-[1.55] text-[#4A5550]">{c.promoText}</span>
        </div>
        <div className="flex flex-col gap-2">
          {promo.series.map((x, k) => (
            <button key={x.title} type="button" onClick={() => setS(k)}
              className={`flex items-center gap-3 py-1 border-0 bg-transparent text-left cursor-pointer transition-opacity duration-[120ms] ${k === s ? '' : 'opacity-70 hover:opacity-100'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- лёгкое превью */}
              <img src={x.thumbs?.[0] ?? x.files[0]} alt="" className="w-10 h-[72px] object-cover rounded-md" style={k === s ? pickedOutline : undefined} />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{x.title}</span>
                <span className="text-[13px] text-[#6B7570]">{c.storiesN(x.files.length)}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0 p-6 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span className="text-[17px] font-semibold">{series.title}</span>
          <span className="text-[14px] text-[#6B7570]">1080 × 1920 · PNG</span>
          <span className="flex-1" />
          <button type="button" onClick={saveAll} className={primaryBtn}><Download size={16} aria-hidden />{c.dlAll(files.length)}</button>
        </div>
        <div className="flex-1 min-h-0 w-full max-w-[1000px] flex flex-wrap content-start gap-5 [container-type:size]">{files.map((f, k) => tile(f, k, false))}</div>
      </div>
    </div>
  )
}
