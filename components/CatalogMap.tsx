'use client'

// Карта рядом со списком каталога (владелец 20.11.2026, макет CatB): цены
// пузырями, нажал — список объектов в этой точке со ссылками. Подложка —
// OpenFreeMap (OpenStreetMap), без ключа и без оплаты, как ListingMap.
// На телефоне карта открывается кнопкой «На карте» поверх списка.
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCatalogRouter } from '@/lib/use-catalog-router'
import { createPortal } from 'react-dom'
import { Loader2, Map as MapIcon, X } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'
import { useScrollLock } from '@/lib/use-scroll-lock'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'

// priceFrom — цена «от» (ЖК), facts — «2 спальни · 76 м²» для подсказки.
export type CatalogMapItem = { slug: string; title: string; href: string; priceUsd: number | null; thumb: string | null; priceFrom?: boolean; facts?: string }
export type CatalogMapGroup = { key: string; lat: number; lng: number; items: CatalogMapItem[] }

const COPY = {
  ru: { from: 'от', here: (k: number) => `Показать ${k} ${k % 10 === 1 && k % 100 !== 11 ? 'объект' : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100) ? 'объекта' : 'объектов'} здесь`, all: 'Показать все', open: 'На карте', close: 'Закрыть карту', n: (k: number) => `${k} ${k % 10 === 1 && k % 100 !== 11 ? 'объект' : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100) ? 'объекта' : 'объектов'}` },
  en: { from: 'from', here: (k: number) => `Show ${k} listings here`, all: 'Show all', open: 'Map', close: 'Close map', n: (k: number) => `${k} listings` },
  id: { from: 'dari', here: (k: number) => `Tampilkan ${k} properti di sini`, all: 'Tampilkan semua', open: 'Peta', close: 'Tutup peta', n: (k: number) => `${k} properti` },
  fr: { from: 'dès', here: (k: number) => `Afficher ${k} biens ici`, all: 'Tout afficher', open: 'Carte', close: 'Fermer la carte', n: (k: number) => `${k} biens` },
  de: { from: 'ab', here: (k: number) => `${k} Objekte hier zeigen`, all: 'Alle zeigen', open: 'Karte', close: 'Karte schließen', n: (k: number) => `${k} Objekte` },
  zh: { from: '从', here: (k: number) => `显示此处 ${k} 个房源`, all: '显示全部', open: '地图', close: '关闭地图', n: (k: number) => `${k} 个房源` },
  nl: { from: 'vanaf', here: (k: number) => `Toon ${k} objecten hier`, all: 'Alles tonen', open: 'Kaart', close: 'Kaart sluiten', n: (k: number) => `${k} objecten` },
  ban: { from: 'saking', here: (k: number) => `Tampilang ${k} properti driki`, all: 'Tampilang sami', open: 'Peta', close: 'Tutup peta', n: (k: number) => `${k} properti` },
  pl: { from: 'od', here: (k: number) => `Pokaż ${k} ofert tutaj`, all: 'Pokaż wszystkie', open: 'Mapa', close: 'Zamknij mapę', n: (k: number) => `${k} ofert` },
  uk: { from: 'від', here: (k: number) => `Показати ${k} об’єктів тут`, all: 'Показати всі', open: 'На мапі', close: 'Закрити мапу', n: (k: number) => `${k} об’єктів` },
} as const

// Картинка в подсказке — то же первое фото, что у карточки в списке, но через
// оптимизатор Next (как карточка) и маленькая: 128 px = 64 px × 2 для чётких
// экранов, ~5 КБ вместо оригинала до 3 МБ. Раньше бралась прямая ссылка CDN:
// на ближайшем к Бали узле Cloudflare (CGK) часть файлов закэширована пустыми
// (0 байт), и в подсказке было пусто, хотя карточка — через оптимизатор —
// показывала фото (владелец 22.11.2026). Хосты — как images.remotePatterns
// в next.config.ts; чужие ссылки оптимизатор не берёт, их отдаём как есть.
const OPTIMIZABLE = /^https:\/\/(images\.balinsky\.info|ifdgiwxothmcalibmydv\.supabase\.co|[a-z0-9-]+\.b-cdn\.net|v5\.airtableusercontent\.com|dl\.airtable\.com)\//
const thumbSrc = (u: string) => (OPTIMIZABLE.test(u) ? `/_next/image?url=${encodeURIComponent(u)}&w=128&q=75` : u)

const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!))

type Area = [number, number, number, number]
// Точки ближе размера пузыря (в пикселях экрана) сливаются в «N объектов».
// Раньше порог был 90 px по прямой, а пузырь шириной ~105 px — соседние
// пузыри налезали друг на друга (21.11.2026).
const PIN_W = 112
const PIN_H = 34
const areaKey = (a: Area) => a.map(x => x.toFixed(5)).join(',')
const parseAreaKey = (s: string | null): Area | null => {
  if (!s) return null
  const n = s.split(',').map(Number)
  return n.length === 4 && n.every(Number.isFinite) && n[0] < n[2] && n[1] < n[3] ? [n[0], n[1], n[2], n[3]] : null
}

type Parked = {
  el: HTMLDivElement
  m: import('maplibre-gl').Map
  ml: typeof import('maplibre-gl')
  zoomOnly: boolean
  view: string | null
  pushed: string | null
  groups: string
  area: string | null
}
// Одна «запаркованная» карта на несколько секунд после размонтирования.
let parked: { p: Parked; timer: ReturnType<typeof setTimeout> } | null = null
function park(p: Parked) {
  if (parked) { clearTimeout(parked.timer); parked.p.m.remove() }
  p.el.remove()
  parked = { p, timer: setTimeout(() => { if (parked?.p === p) { p.m.remove(); parked = null } }, 15000) }
}
function takeParked(zoomOnly: boolean): Parked | null {
  if (!parked || parked.p.zoomOnly !== zoomOnly) return null
  clearTimeout(parked.timer)
  const p = parked.p
  parked = null
  return p
}

function MapCanvas({ groups, lang, className, onArea, onView, zoomOnly = false, follow = false, area = null }: { area?: string | null; groups: CatalogMapGroup[]; lang: Lang; className: string; onArea?: (a: Area, replace?: boolean) => void; onView?: (v: { area: Area; n: number } | null) => void; zoomOnly?: boolean; follow?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  // Карта создаётся ОДИН раз на всё время жизни блока. Раньше она
  // пересоздавалась на каждый ответ сервера (после «Показать N здесь», смены
  // валюты) — мигала, заново грузила подложку и закрывала подсказку (21.11.2026).
  const mapRef = useRef<{ m: import('maplibre-gl').Map; ml: typeof import('maplibre-gl') } | null>(null)
  const [ready, setReady] = useState(false)
  const onAreaRef = useRef(onArea)
  const onViewRef = useRef(onView)
  const groupsRef = useRef(groups)
  const areaRef = useRef(area)
  const followRef = useRef(follow)
  useEffect(() => { onAreaRef.current = onArea; onViewRef.current = onView; groupsRef.current = groups; areaRef.current = area; followRef.current = follow })
  // Список следует за картой (владелец 21.11.2026: «чтобы слева было то, что я
  // на карте смотрю»): через полсекунды после того, как карта остановилась.
  // Новый сдвиг отменяет ожидание — запрос один на остановку, а не на кадр.
  const followTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopFollow = () => { if (followTimer.current) { clearTimeout(followTimer.current); followTimer.current = null } }
  // true — ближайший сдвиг делает сам сайт (подгонка, клик по «N объектов»):
  // кнопку «Показать N здесь» после него не показываем.
  const autoRef = useRef(false)
  // Область, которую карта сама только что отдала в адрес: камеру к ней не
  // везём — она уже там.
  const pushedRef = useRef<string | null>(null)
  // Что сейчас видно на карте — «Показать N здесь» отдаёт в адрес ровно это.
  const viewRef = useRef<string | null>(null)
  const drawRef = useRef<() => void>(() => {})
  const hotRef = useRef<string | null>(null)
  // Что карта уже показывает (точки и область) — чтобы двигать камеру только при перемене.
  const shownRef = useRef<{ groups: string; area: string | null } | null>(null)
  const { currency } = useCurrency()
  const c = pickCopy(COPY, lang)

  const paint = () => {
    const hot = hotRef.current
    ref.current?.querySelectorAll<HTMLElement>('.bx-cat-pin').forEach(el =>
      el.classList.toggle('bx-cat-pin--hot', !!hot && (el.dataset.slugs ?? '').split(' ').includes(hot)))
  }

  // Камера: на выбранную область (?area) или на все точки.
  const fit = (animate: boolean) => {
    const h = mapRef.current
    if (!h) return
    const a = parseAreaKey(areaRef.current)
    const gs = groupsRef.current
    if (!a && !gs.length) return
    autoRef.current = true
    if (a) h.m.fitBounds([[a[0], a[1]], [a[2], a[3]]], { padding: 0, animate })
    else {
      const b = new h.ml.LngLatBounds([gs[0].lng, gs[0].lat], [gs[0].lng, gs[0].lat])
      for (const g of gs) b.extend([g.lng, g.lat])
      h.m.fitBounds(b, { padding: 48, maxZoom: 14, animate })
    }
    // Камера не сдвинулась (уже там) — флажок не должен съесть следующий
    // сдвиг человека.
    if (!h.m.isMoving()) autoRef.current = false
  }

  // useLayoutEffect: запаркованная карта встаёт на место до отрисовки кадра —
  // без пустого мигания при переходе между списком с фильтром и без.
  useLayoutEffect(() => {
    let cancelled = false
    let detach: (() => void) | null = null
    // Навели на карточку в списке — её точка на карте подсвечивается (владелец 20.11.2026).
    const onHover = (e: Event) => { hotRef.current = (e as CustomEvent<string | null>).detail ?? null; paint() }
    window.addEventListener('bx-cat-hover', onHover)
    // Картинка в подсказке не загрузилась — пробуем исходную ссылку, а если и
    // она пустая, ставим серую заглушку вместо значка «битой» картинки.
    const host = ref.current
    const onImgError = (e: Event) => {
      const img = e.target as HTMLImageElement
      if (img.tagName !== 'IMG' || !img.closest('.bx-cat-pop')) return
      const raw = img.dataset.raw
      if (raw && img.getAttribute('src') !== raw) { img.src = raw; return }
      img.replaceWith(document.createElement('span'))
    }
    host?.addEventListener('error', onImgError, true)
    const attach = (inst: Parked, reused: boolean) => {
      const { m } = inst
      // Слушатели ставим ДО первой подгонки камеры. Раньше подгонка шла
      // первой, её «конец сдвига» никто не слышал, и флажок «это сайт»
      // съедал первый сдвиг человека — кнопка «Показать N здесь» не
      // появлялась (на телефоне — после нажатия на «N объектов»).
      const onStart = (e: { originalEvent?: unknown }) => { stopFollow(); if (e.originalEvent) autoRef.current = false }
      const onEnd = () => {
        drawRef.current()
        const bb = m.getBounds()
        const v: Area = [bb.getWest(), bb.getSouth(), bb.getEast(), bb.getNorth()]
        viewRef.current = areaKey(v)
        if (autoRef.current) { autoRef.current = false; return }
        // Видно ровно выбранную область — кнопка «Показать N здесь» ни к чему.
        if (viewRef.current === areaRef.current) { onViewRef.current?.(null); return }
        const n = groupsRef.current.reduce((t, g) => t + (g.lng >= v[0] && g.lng <= v[2] && g.lat >= v[1] && g.lat <= v[3] ? g.items.length : 0), 0)
        if (followRef.current) {
          // Пустое место (море) список не трогает — остаётся прежний.
          stopFollow()
          if (n > 0) followTimer.current = setTimeout(() => {
            followTimer.current = null
            pushedRef.current = areaKey(v)
            onAreaRef.current?.(v, true)
          }, 500)
          return
        }
        onViewRef.current?.({ area: v, n })
      }
      m.on('movestart', onStart)
      m.on('moveend', onEnd)
      if (reused) {
        viewRef.current = inst.view
        pushedRef.current = inst.pushed
        shownRef.current = { groups: inst.groups, area: inst.area }
      }
      mapRef.current = { m, ml: inst.ml }
      detach = () => {
        stopFollow()
        m.off('movestart', onStart)
        m.off('moveend', onEnd)
        park({ ...inst, view: viewRef.current, pushed: pushedRef.current, groups: shownRef.current?.groups ?? '', area: shownRef.current?.area ?? null })
      }
      setReady(true)
    }
    // Список с фильтром и без — для Next это разные страницы, и при переходе
    // между ними блок с картой монтируется заново. Готовую карту не выбрасываем,
    // а переносим: без этого после «Показать N здесь» она гасла и грузилась с нуля.
    const prev = takeParked(zoomOnly)
    if (prev && ref.current) {
      ref.current.appendChild(prev.el)
      attach(prev, true)
      autoRef.current = true
      prev.m.resize()
      if (!prev.m.isMoving()) autoRef.current = false
    } else {
      import('maplibre-gl').then(({ default: ml }) => {
        if (cancelled || !ref.current) return
        const el = document.createElement('div')
        el.style.cssText = 'position:absolute;inset:0'
        ref.current.appendChild(el)
        const m = new ml.Map({ container: el, style: STYLE, center: [115.17, -8.65], zoom: 9.6, attributionControl: { compact: true } })
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
        m.on('load', () => {
          if (cancelled) { m.remove(); return }
          el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
          attach({ el, m, ml, zoomOnly, view: null, pushed: null, groups: '', area: null }, false)
        })
        detach = () => { if (!mapRef.current) m.remove() }
      })
    }
    return () => {
      cancelled = true
      window.removeEventListener('bx-cat-hover', onHover)
      host?.removeEventListener('error', onImgError, true)
      detach?.()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Пузыри. Те, что после сдвига остались прежними, не пересоздаются: раньше
  // после каждого сдвига все исчезали и появлялись заново (мигание), а
  // открытая подсказка закрывалась от малейшего движения карты.
  useEffect(() => {
    const markers = new globalThis.Map<string, import('maplibre-gl').Marker>()
    drawRef.current = () => {
      const h = mapRef.current
      if (!h) return
      const { m, ml } = h
      // Сначала крупные точки: пузырь встаёт на них, и разбивка не скачет.
      const pts = groupsRef.current
        .map(g => ({ g, p: m.project([g.lng, g.lat]) }))
        .sort((a, b) => b.g.items.length - a.g.items.length || (a.g.key < b.g.key ? -1 : 1))
      const used = new Set<number>()
      const next = new globalThis.Map<string, import('maplibre-gl').Marker>()
      for (let a = 0; a < pts.length; a++) {
        if (used.has(a)) continue
        used.add(a)
        const members = [pts[a]]
        for (let k = a + 1; k < pts.length; k++) {
          if (used.has(k)) continue
          if (Math.abs(pts[k].p.x - pts[a].p.x) < PIN_W && Math.abs(pts[k].p.y - pts[a].p.y) < PIN_H) { used.add(k); members.push(pts[k]) }
        }
        const items = members.flatMap(x => x.g.items)
        const prices = items.map(i => i.priceUsd).filter((p): p is number => p != null && p > 0)
        const label = items.length > 1 ? c.n(items.length) : prices[0] ? (items[0].priceFrom ? `${c.from} ` : '') + formatPrice(prices[0], currency, lang) : items[0].title.slice(0, 18)
        const key = `${members.map(x => x.g.key).sort().join(';')}|${label}`
        const old = markers.get(key)
        if (old) { markers.delete(key); next.set(key, old); continue }
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'bx-cat-pin'
        el.textContent = label
        el.dataset.slugs = items.map(i => i.slug).join(' ')
        // Пузырь стоит на самой крупной точке группы — так соседние пузыри
        // не налезают друг на друга.
        const mk = new ml.Marker({ element: el }).setLngLat([pts[a].g.lng, pts[a].g.lat])
        const popup = () => new ml.Popup({ offset: 18, maxWidth: 'min(300px, calc(100vw - 32px))', closeButton: false }).setHTML(
          `<div class="bx-cat-pop">${items.slice(0, 8).map(i => `<a href="${esc(i.href)}">${i.thumb ? `<img src="${esc(thumbSrc(i.thumb))}" data-raw="${esc(i.thumb)}" alt="" width="64" height="48" loading="lazy" decoding="async">` : '<span></span>'}<span><b>${esc(i.title)}</b>${i.priceUsd ? `<strong>${esc((i.priceFrom ? `${c.from} ` : '') + formatPrice(i.priceUsd, currency, lang))}</strong>` : ''}${i.facts ? `<em>${esc(i.facts)}</em>` : ''}</span></a>`).join('')}${items.length > 8 ? `<p>+${items.length - 8}</p>` : ''}</div>`)
        if (members.length > 1) {
          el.classList.add('bx-cat-pin--many')
          el.addEventListener('click', e => {
            e.stopPropagation()
            const bb = new ml.LngLatBounds([members[0].g.lng, members[0].g.lat], [members[0].g.lng, members[0].g.lat])
            members.forEach(x => bb.extend([x.g.lng, x.g.lat]))
            const pad = zoomOnly ? 64 : 80
            // Точки так близко, что и на самом крупном масштабе останутся
            // одним пузырём, — показываем их списком. Раньше нажатие просто
            // ничего не меняло, и до объектов было не добраться.
            const cam = m.cameraForBounds(bb, { padding: pad, maxZoom: 16 })
            const stuck = !cam || (cam.zoom ?? m.getZoom()) - m.getZoom() < 0.5
            if (stuck) { if (!mk.getPopup()) mk.setPopup(popup()); if (!mk.getPopup()?.isOpen()) mk.togglePopup() }
            // На телефоне только приближаем: карта не закрывается, список
            // фильтрует кнопка «Показать N здесь» после приближения.
            if (zoomOnly) { if (!stuck) m.fitBounds(bb, { padding: pad, maxZoom: 16, duration: 800 }); return }
            onViewRef.current?.(null)
            // И список слева — только объекты этой области (запас ~150 м по краям).
            const ext = 0.0015
            const ar: Area = [bb.getWest() - ext, bb.getSouth() - ext, bb.getEast() + ext, bb.getNorth() + ext]
            pushedRef.current = areaKey(ar)
            if (!stuck) {
              autoRef.current = true
              m.fitBounds(bb, { padding: pad, maxZoom: 16, duration: 800 })
              if (!m.isMoving()) autoRef.current = false
            }
            onAreaRef.current?.(ar)
          })
        } else {
          mk.setPopup(popup())
        }
        mk.addTo(m)
        next.set(key, mk)
      }
      markers.forEach(mk => mk.remove())
      markers.clear()
      next.forEach((mk, k) => markers.set(k, mk))
      paint()
    }
    drawRef.current()
    return () => { markers.forEach(mk => mk.remove()); markers.clear() }
  }, [currency, lang, c, zoomOnly, ready])

  // Поменялись точки (фильтры) или область в адресе — перерисовать и, если
  // нужно, перевезти камеру. Первый раз — сразу, без анимации.
  const groupsKey = useMemo(() => groups.map(g => `${g.key}:${g.items.length}`).join(';'), [groups])
  useEffect(() => {
    if (!ready) return
    const prev = shownRef.current
    shownRef.current = { groups: groupsKey, area }
    if (!prev) { fit(false); return }
    if (prev.groups !== groupsKey) drawRef.current()
    if (prev.area !== area) {
      // Область пришла из адреса («Назад», «Показать все») — едем к ней.
      // Свою только что отданную не трогаем: камера уже там.
      const own = !!area && (area === pushedRef.current || area === viewRef.current)
      pushedRef.current = null
      if (!own) fit(true)
      return
    }
    // Новые фильтры без выбранной области — показать все их точки.
    if (prev.groups !== groupsKey && !area) fit(true)
  }, [ready, groupsKey, area])

  return <div ref={ref} className={`relative w-full overflow-hidden bg-[#EEF1EF] ${className}`} />
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
  // Обычный router.push на корень каталога (/ru/villy) отдавал из кэша
  // браузера список без фильтров: адрес менялся, а список — нет («Показать N
  // здесь» ничего не делало). useCatalogRouter дотягивает новую выдачу с сервера.
  const router = useCatalogRouter()
  // Пока сервер собирает список под область — крутилка на карте.
  const [pending, startTransition] = useTransition()
  const pathname = usePathname() ?? ''
  const params = useSearchParams()
  const area = params?.get('area') ?? null
  // Нажали на «N объектов» — область в адрес (?area=…), сервер отфильтрует список.
  // replace — когда список сам следует за картой: иначе «Назад» пришлось бы
  // жать по разу на каждый сдвиг.
  const onArea = useMemo(() => (a: [number, number, number, number], replace = false) => {
    const sp = new URLSearchParams(params?.toString() ?? '')
    sp.set('area', a.map(x => x.toFixed(5)).join(','))
    sp.delete('page')
    const href = `${pathname}?${sp.toString()}`
    startTransition(() => (replace ? router.replace : router.push)(href, { scroll: false }))
  }, [params, pathname, router])
  const clearArea = () => {
    const sp = new URLSearchParams(params?.toString() ?? '')
    sp.delete('area')
    sp.delete('page')
    const q = sp.toString()
    startTransition(() => router.push(q ? `${pathname}?${q}` : pathname, { scroll: false }))
  }
  const [view, setView] = useState<{ area: [number, number, number, number]; n: number } | null>(null)
  const onView = setView
  // Область сменилась (нажали, «Назад», «Показать все») — старая кнопка «Показать N здесь» уже не про то.
  useEffect(() => { setView(null) }, [area])
  const spinner = pending && (
    <span aria-hidden
      className="pointer-events-none absolute left-1/2 top-4 z-[5] flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[#0F1A15] shadow-[0_1px_2px_rgb(0_0_0/.1),0_6px_16px_rgb(0_0_0/.18)]">
      <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />
    </span>
  )
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

  // Компьютер: список сам следует за картой, кнопка «Показать N здесь» не нужна.
  // Телефон: список под картой не виден — там по-прежнему кнопка.
  if (wide) return <div className="relative h-full"><MapCanvas groups={groups} lang={lang} className="h-full" onArea={onArea} area={area} follow />{allBtn}{spinner}</div>
  return (
    <>
      {/* data-no-typo: карта внутри Suspense оживает позже, чем типограф
          заменяет пробелы, — иначе React видит другой текст и перестраивает блок. */}
      <button type="button" onClick={() => { setView(null); setOpen(true) }} data-no-typo
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
