'use client'

// Карта рядом со списком каталога (владелец 20.11.2026, макет CatB): цены
// пузырями, нажал — список объектов в этой точке со ссылками. Подложка —
// OpenFreeMap (OpenStreetMap), без ключа и без оплаты, как ListingMap.
// На телефоне карта открывается кнопкой «На карте» поверх списка.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Map as MapIcon, X } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'
import { useScrollLock } from '@/lib/use-scroll-lock'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'

export type CatalogMapItem = { slug: string; title: string; href: string; priceUsd: number | null; thumb: string | null }
export type CatalogMapGroup = { key: string; lat: number; lng: number; items: CatalogMapItem[] }

const COPY = {
  ru: { here: (k: number) => `Показать ${k} ${k % 10 === 1 && k % 100 !== 11 ? 'объект' : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100) ? 'объекта' : 'объектов'} здесь`, all: 'Показать все', open: 'На карте', close: 'Закрыть карту', n: (k: number) => `${k} ${k % 10 === 1 && k % 100 !== 11 ? 'объект' : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100) ? 'объекта' : 'объектов'}` },
  en: { here: (k: number) => `Show ${k} listings here`, all: 'Show all', open: 'Map', close: 'Close map', n: (k: number) => `${k} listings` },
  id: { here: (k: number) => `Tampilkan ${k} properti di sini`, all: 'Tampilkan semua', open: 'Peta', close: 'Tutup peta', n: (k: number) => `${k} properti` },
  fr: { here: (k: number) => `Afficher ${k} biens ici`, all: 'Tout afficher', open: 'Carte', close: 'Fermer la carte', n: (k: number) => `${k} biens` },
  de: { here: (k: number) => `${k} Objekte hier zeigen`, all: 'Alle zeigen', open: 'Karte', close: 'Karte schließen', n: (k: number) => `${k} Objekte` },
  zh: { here: (k: number) => `显示此处 ${k} 个房源`, all: '显示全部', open: '地图', close: '关闭地图', n: (k: number) => `${k} 个房源` },
  nl: { here: (k: number) => `Toon ${k} objecten hier`, all: 'Alles tonen', open: 'Kaart', close: 'Kaart sluiten', n: (k: number) => `${k} objecten` },
  ban: { here: (k: number) => `Tampilang ${k} properti driki`, all: 'Tampilang sami', open: 'Peta', close: 'Tutup peta', n: (k: number) => `${k} properti` },
  pl: { here: (k: number) => `Pokaż ${k} ofert tutaj`, all: 'Pokaż wszystkie', open: 'Mapa', close: 'Zamknij mapę', n: (k: number) => `${k} ofert` },
  uk: { here: (k: number) => `Показати ${k} об’єктів тут`, all: 'Показати всі', open: 'На мапі', close: 'Закрити мапу', n: (k: number) => `${k} об’єктів` },
} as const

const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!))

function MapCanvas({ groups, lang, className, onArea, onView, zoomOnly = false, area = null }: { area?: string | null; groups: CatalogMapGroup[]; lang: Lang; className: string; onArea?: (a: [number, number, number, number]) => void; onView?: (v: { area: [number, number, number, number]; n: number } | null) => void; zoomOnly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  // Колбэки — через ref: раньше они стояли в зависимостях эффекта, и после
  // каждого сдвига карта пересоздавалась и прыгала на весь Бали (телефон, 21.11.2026).
  const onAreaRef = useRef(onArea)
  const onViewRef = useRef(onView)
  useEffect(() => { onAreaRef.current = onArea; onViewRef.current = onView })
  // Где стояла камера: список после «N объектов» пересобирается, карта
  // создаётся заново — и раньше прыгала на весь Бали (владелец 21.11.2026).
  const camRef = useRef<{ center: [number, number]; zoom: number } | null>(null)
  // «Показать все» — снова весь остров. Эффект объявлен до эффекта карты,
  // поэтому срабатывает раньше, чем карта создаётся заново.
  useEffect(() => { if (!area) camRef.current = null }, [area])
  const { currency } = useCurrency()
  const c = pickCopy(COPY, lang)
  useEffect(() => {
    let map: import('maplibre-gl').Map | null = null
    let cancelled = false
    import('maplibre-gl').then(({ default: ml }) => {
      if (cancelled || !ref.current) return
      map = new ml.Map({ container: ref.current, style: STYLE, center: [115.17, -8.65], zoom: 9.6, attributionControl: { compact: true } })
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
      const m = map
      m.on('load', () => {
        if (!groups.length) return
        const b = new ml.LngLatBounds([groups[0].lng, groups[0].lat], [groups[0].lng, groups[0].lat])
        for (const g of groups) b.extend([g.lng, g.lat])
        // Сдвиги карты самим сайтом (подгонка, клик по группе) не считаем —
        // кнопка «Показать N здесь» только после движения человеком.
        let auto = true
        if (camRef.current) m.jumpTo(camRef.current)
        else m.fitBounds(b, { padding: 48, maxZoom: 14, animate: false })
        m.on('movestart', e => { if ((e as { originalEvent?: Event }).originalEvent) auto = false })
        m.on('moveend', () => {
          const ctr = m.getCenter()
          camRef.current = { center: [ctr.lng, ctr.lat], zoom: m.getZoom() }
          if (auto) { auto = false; return }
          const bb = m.getBounds()
          const area: [number, number, number, number] = [bb.getWest(), bb.getSouth(), bb.getEast(), bb.getNorth()]
          const n = groups.reduce((t, g) => t + (g.lng >= area[0] && g.lng <= area[2] && g.lat >= area[1] && g.lat <= area[3] ? g.items.length : 0), 0)
          onViewRef.current?.({ area, n })
        })
        ref.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
        // Точки ближе 90 px друг к другу на экране — одним пузырём «N объектов»;
        // нажал — карта приближается к ним. Пересчёт после каждого сдвига.
        let markers: { mk: import('maplibre-gl').Marker; el: HTMLElement; slugs: Set<string> }[] = []
        let hot: string | null = null
        const paint = () => { for (const x of markers) x.el.classList.toggle('bx-cat-pin--hot', !!hot && x.slugs.has(hot)) }
        // Навели на карточку в списке — её точка на карте подсвечивается (владелец 20.11.2026).
        const onHover = (e: Event) => { hot = (e as CustomEvent<string | null>).detail ?? null; paint() }
        window.addEventListener('bx-cat-hover', onHover)
        m.once('remove', () => window.removeEventListener('bx-cat-hover', onHover))
        const draw = () => {
          markers.forEach(x => x.mk.remove()); markers = []
          const pts = groups.map(g => ({ g, p: m.project([g.lng, g.lat]) }))
          const used = new Set<number>()
          for (let a = 0; a < pts.length; a++) {
            if (used.has(a)) continue
            used.add(a)
            const members = [pts[a]]
            for (let k = a + 1; k < pts.length; k++) {
              if (used.has(k)) continue
              if (Math.hypot(pts[k].p.x - pts[a].p.x, pts[k].p.y - pts[a].p.y) < 90) { used.add(k); members.push(pts[k]) }
            }
            const items = members.flatMap(x => x.g.items)
            const lng = members.reduce((t, x) => t + x.g.lng, 0) / members.length
            const lat = members.reduce((t, x) => t + x.g.lat, 0) / members.length
            const el = document.createElement('button')
            el.type = 'button'
            el.className = 'bx-cat-pin'
            const mk = new ml.Marker({ element: el }).setLngLat([lng, lat])
            if (members.length > 1) {
              el.textContent = c.n(items.length)
              el.classList.add('bx-cat-pin--many')
              el.addEventListener('click', e => {
                e.stopPropagation()
                const bb = new ml.LngLatBounds([members[0].g.lng, members[0].g.lat], [members[0].g.lng, members[0].g.lat])
                members.forEach(x => bb.extend([x.g.lng, x.g.lat]))
                // На телефоне только приближаем: карта не закрывается, список
                // фильтрует кнопка «Показать N здесь» после приближения.
                if (zoomOnly) { m.fitBounds(bb, { padding: 64, maxZoom: 16 }); return }
                auto = true
                onViewRef.current?.(null)
                // Камеру запоминаем заранее: список сейчас пересоберётся, и
                // новая карта должна встать сюда же, а не на весь остров.
                const cam = m.cameraForBounds(bb, { padding: 80, maxZoom: 16 })
                if (cam?.center) { const cc = ml.LngLat.convert(cam.center); camRef.current = { center: [cc.lng, cc.lat], zoom: cam.zoom ?? m.getZoom() } }
                m.fitBounds(bb, { padding: 80, maxZoom: 16 })
                // И список слева — только объекты этой области (запас ~150 м по краям).
                const pad = 0.0015
                onAreaRef.current?.([bb.getWest() - pad, bb.getSouth() - pad, bb.getEast() + pad, bb.getNorth() + pad])
              })
            } else {
              const prices = items.map(i => i.priceUsd).filter((p): p is number => p != null && p > 0)
              el.textContent = items.length > 1 ? c.n(items.length) : prices[0] ? formatPrice(prices[0], currency, lang) : items[0].title.slice(0, 18)
              const html = `<div class="bx-cat-pop">${items.slice(0, 8).map(i => `<a href="${esc(i.href)}">${i.thumb ? `<img src="${esc(i.thumb)}" alt="" loading="lazy">` : '<span></span>'}<span><b>${esc(i.title)}</b>${i.priceUsd ? `<em>${esc(formatPrice(i.priceUsd, currency, lang))}</em>` : ''}</span></a>`).join('')}${items.length > 8 ? `<p>+${items.length - 8}</p>` : ''}</div>`
              mk.setPopup(new ml.Popup({ offset: 18, maxWidth: 'min(300px, calc(100vw - 32px))', closeButton: false }).setHTML(html))
            }
            mk.addTo(m); markers.push({ mk, el, slugs: new Set(items.map(i => i.slug)) })
          }
        }
        draw()
        m.on('moveend', () => { draw(); paint() })
      })
    })
    return () => { cancelled = true; map?.remove() }
  }, [groups, currency, lang, c, zoomOnly])
  return <div ref={ref} className={`w-full overflow-hidden bg-[#EEF1EF] ${className}`} />
}

/** Компьютер: карта справа, едет вместе со страницей. Телефон: кнопка внизу. */
// Только Бали: точка с ошибочными координатами (в море, на Ломбоке) иначе
// отодвигала карту на полрегиона.
const onBali = (g: CatalogMapGroup) => g.lng > 114.4 && g.lng < 115.75 && g.lat > -8.95 && g.lat < -8.05

// Карта читает адресную строку (?area=) — без Suspense статичная сборка каталога падает.
export function CatalogMap(props: { groups: CatalogMapGroup[]; lang?: Lang }) {
  return <Suspense fallback={null}><CatalogMapInner {...props} /></Suspense>
}

function CatalogMapInner({ groups: all, lang = 'ru' }: { groups: CatalogMapGroup[]; lang?: Lang }) {
  const groups = useMemo(() => all.filter(onBali), [all])
  const c = pickCopy(COPY, lang)
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const params = useSearchParams()
  const area = params?.get('area') ?? null
  // Нажали на «N объектов» — область в адрес (?area=…), сервер отфильтрует список.
  const onArea = useMemo(() => (a: [number, number, number, number]) => {
    const sp = new URLSearchParams(params?.toString() ?? '')
    sp.set('area', a.map(x => x.toFixed(5)).join(','))
    sp.delete('page')
    router.push(`${pathname}?${sp.toString()}`, { scroll: false })
  }, [params, pathname, router])
  const clearArea = () => {
    const sp = new URLSearchParams(params?.toString() ?? '')
    sp.delete('area')
    const q = sp.toString()
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }
  const [view, setView] = useState<{ area: [number, number, number, number]; n: number } | null>(null)
  const onView = useMemo(() => (v: { area: [number, number, number, number]; n: number } | null) => setView(v), [])
  // Вариант B (владелец 20.11.2026): после сдвига карты — «Показать N объектов здесь».
  const hereBtn = view && view.n > 0 && (
    <button type="button" onClick={() => { const a = view.area; setView(null); setOpen(false); onArea(a) }}
      className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-[5] inline-flex h-12 -translate-x-1/2 cursor-pointer items-center whitespace-nowrap rounded-xl border-0 bg-[var(--color-primary)] px-6 text-[16px] font-semibold text-white shadow-[0_8px_24px_rgb(0_0_0/.25)] hover:bg-[var(--color-primary-pressed)]">
      {c.here(view.n)}
    </button>
  )
  const allBtn = area && (
    <button type="button" onClick={clearArea}
      className="absolute left-3 top-3 z-[5] inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#0F1A15] px-4 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgb(0_0_0/.1),0_6px_16px_rgb(0_0_0/.2)]">
      <X size={16} aria-hidden /> {c.all}
    </button>
  )
  const [wide, setWide] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  useScrollLock(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (wide) return <div className="relative h-full"><MapCanvas groups={groups} lang={lang} className="h-full" onArea={onArea} onView={onView} area={area} />{allBtn}{hereBtn}</div>
  return (
    <>
      {/* data-no-typo: карта внутри Suspense оживает позже, чем типограф
          заменяет пробелы, — иначе React видит другой текст и перестраивает блок. */}
      <button type="button" onClick={() => setOpen(true)} data-no-typo
        className="fixed bottom-6 left-1/2 z-[40] inline-flex h-12 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#0F1A15] px-5 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgb(0_0_0/.1),0_8px_24px_rgb(0_0_0/.24)] lg:hidden">
        <MapIcon size={18} aria-hidden /> {c.open}
      </button>
      {open && createPortal(
        <div className="fixed inset-x-0 top-0 z-[9999] h-[100dvh] overscroll-none bg-white" role="dialog" aria-modal="true" aria-label={c.open}>
          <MapCanvas groups={groups} lang={lang} className="h-full" onView={onView} zoomOnly area={area} />{area && (
            <button type="button" onClick={() => { setOpen(false); clearArea() }}
              className="absolute left-[68px] top-4 z-[5] inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#0F1A15] px-4 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgb(0_0_0/.1),0_6px_16px_rgb(0_0_0/.2)]">
              <X size={16} aria-hidden /> {c.all}
            </button>
          )}{hereBtn}
          <button type="button" onClick={() => setOpen(false)} aria-label={c.close}
            className="absolute left-4 top-4 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#0F1A15] shadow-[0_1px_2px_rgb(0_0_0/.1),0_6px_16px_rgb(0_0_0/.18)]">
            <X size={20} />
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
