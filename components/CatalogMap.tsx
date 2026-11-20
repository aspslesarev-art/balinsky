'use client'

// Карта рядом со списком каталога (владелец 20.11.2026, макет CatB): цены
// пузырями, нажал — список объектов в этой точке со ссылками. Подложка —
// OpenFreeMap (OpenStreetMap), без ключа и без оплаты, как ListingMap.
// На телефоне карта открывается кнопкой «На карте» поверх списка.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Map as MapIcon, X } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'

export type CatalogMapItem = { slug: string; title: string; href: string; priceUsd: number | null; thumb: string | null }
export type CatalogMapGroup = { key: string; lat: number; lng: number; items: CatalogMapItem[] }

const COPY = {
  ru: { open: 'На карте', close: 'Закрыть карту', n: (k: number) => `${k} ${k % 10 === 1 && k % 100 !== 11 ? 'объект' : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100) ? 'объекта' : 'объектов'}` },
  en: { open: 'Map', close: 'Close map', n: (k: number) => `${k} listings` },
  id: { open: 'Peta', close: 'Tutup peta', n: (k: number) => `${k} properti` },
  fr: { open: 'Carte', close: 'Fermer la carte', n: (k: number) => `${k} biens` },
  de: { open: 'Karte', close: 'Karte schließen', n: (k: number) => `${k} Objekte` },
  zh: { open: '地图', close: '关闭地图', n: (k: number) => `${k} 个房源` },
  nl: { open: 'Kaart', close: 'Kaart sluiten', n: (k: number) => `${k} objecten` },
  ban: { open: 'Peta', close: 'Tutup peta', n: (k: number) => `${k} properti` },
  pl: { open: 'Mapa', close: 'Zamknij mapę', n: (k: number) => `${k} ofert` },
  uk: { open: 'На мапі', close: 'Закрити мапу', n: (k: number) => `${k} об’єктів` },
} as const

const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!))

function MapCanvas({ groups, lang, className }: { groups: CatalogMapGroup[]; lang: Lang; className: string }) {
  const ref = useRef<HTMLDivElement>(null)
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
        m.fitBounds(b, { padding: 48, maxZoom: 14, animate: false })
        ref.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
        // Точки ближе 90 px друг к другу на экране — одним пузырём «N объектов»;
        // нажал — карта приближается к ним. Пересчёт после каждого сдвига.
        let markers: import('maplibre-gl').Marker[] = []
        const draw = () => {
          markers.forEach(mk => mk.remove()); markers = []
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
                m.fitBounds(bb, { padding: 80, maxZoom: 16 })
              })
            } else {
              const prices = items.map(i => i.priceUsd).filter((p): p is number => p != null && p > 0)
              el.textContent = items.length > 1 ? c.n(items.length) : prices[0] ? formatPrice(prices[0], currency, lang) : items[0].title.slice(0, 18)
              const html = `<div class="bx-cat-pop">${items.slice(0, 8).map(i => `<a href="${esc(i.href)}">${i.thumb ? `<img src="${esc(i.thumb)}" alt="" loading="lazy">` : '<span></span>'}<span><b>${esc(i.title)}</b>${i.priceUsd ? `<em>${esc(formatPrice(i.priceUsd, currency, lang))}</em>` : ''}</span></a>`).join('')}${items.length > 8 ? `<p>+${items.length - 8}</p>` : ''}</div>`
              mk.setPopup(new ml.Popup({ offset: 18, maxWidth: '300px', closeButton: false }).setHTML(html))
            }
            mk.addTo(m); markers.push(mk)
          }
        }
        draw()
        m.on('moveend', draw)
      })
    })
    return () => { cancelled = true; map?.remove() }
  }, [groups, currency, lang, c])
  return <div ref={ref} className={`w-full overflow-hidden bg-[#EEF1EF] ${className}`} />
}

/** Компьютер: карта справа, едет вместе со страницей. Телефон: кнопка внизу. */
// Только Бали: точка с ошибочными координатами (в море, на Ломбоке) иначе
// отодвигала карту на полрегиона.
const onBali = (g: CatalogMapGroup) => g.lng > 114.4 && g.lng < 115.75 && g.lat > -8.95 && g.lat < -8.05

export function CatalogMap({ groups: all, lang = 'ru' }: { groups: CatalogMapGroup[]; lang?: Lang }) {
  const groups = useMemo(() => all.filter(onBali), [all])
  const c = pickCopy(COPY, lang)
  const [wide, setWide] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open])

  if (wide) return <MapCanvas groups={groups} lang={lang} className="h-full" />
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="fixed bottom-6 left-1/2 z-[40] inline-flex h-12 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#0F1A15] px-5 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgb(0_0_0/.1),0_8px_24px_rgb(0_0_0/.24)] lg:hidden">
        <MapIcon size={18} aria-hidden /> {c.open}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[9999] bg-white" role="dialog" aria-modal="true" aria-label={c.open}>
          <MapCanvas groups={groups} lang={lang} className="h-full" />
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
