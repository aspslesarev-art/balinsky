'use client'

import { useState } from 'react'
import { ExternalLink, Map as MapIcon, Satellite, Footprints } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { VIEWER_ASIDE_LG, VIEWER_LABEL } from './media-viewer-aside'

// Вкладка «Локация» в окне медиа (владелец 20.11.2026, макет LocA): справа
// карта Google, слева выбор «Карта / Спутник / Улица» и «Рядом». Встроенная
// карта и вид с улицы у Google бесплатные и без ключа; человечка в любое место
// — по кнопке «Открыть в Google Картах».

const COPY = {
  ru: { title: 'Локация', map: 'Карта', sat: 'Спутник', street: 'Улица — пройтись', near: 'Рядом', open: 'Открыть в Google Картах', streetHint: 'Двигайтесь стрелками. Если улицы нет — значит, Google здесь не снимал.' },
  en: { title: 'Location', map: 'Map', sat: 'Satellite', street: 'Street — walk around', near: 'Nearby', open: 'Open in Google Maps', streetHint: 'Move with the arrows. No street view means Google hasn’t filmed here.' },
  id: { title: 'Lokasi', map: 'Peta', sat: 'Satelit', street: 'Jalan — jelajahi', near: 'Terdekat', open: 'Buka di Google Maps', streetHint: 'Gunakan panah untuk bergerak. Jika kosong, Google belum merekam di sini.' },
  fr: { title: 'Emplacement', map: 'Carte', sat: 'Satellite', street: 'Rue — se promener', near: 'À proximité', open: 'Ouvrir dans Google Maps', streetHint: 'Avancez avec les flèches. Pas de vue de rue : Google n’a pas filmé ici.' },
  de: { title: 'Lage', map: 'Karte', sat: 'Satellit', street: 'Straße — umsehen', near: 'In der Nähe', open: 'In Google Maps öffnen', streetHint: 'Mit den Pfeilen bewegen. Keine Straßenansicht: Google hat hier nicht gefilmt.' },
  zh: { title: '位置', map: '地图', sat: '卫星', street: '街景 — 走走看', near: '附近', open: '在 Google 地图中打开', streetHint: '用箭头移动。没有街景说明 Google 未在此拍摄。' },
  nl: { title: 'Locatie', map: 'Kaart', sat: 'Satelliet', street: 'Straat — rondkijken', near: 'In de buurt', open: 'Openen in Google Maps', streetHint: 'Beweeg met de pijlen. Geen straatbeeld: Google heeft hier niet gefilmd.' },
  ban: { title: 'Genah', map: 'Peta', sat: 'Satelit', street: 'Margi — mamargi', near: 'Paek', open: 'Buka ring Google Maps', streetHint: 'Ngangge panah. Yening puyung, Google durung ngambil gambar driki.' },
  pl: { title: 'Lokalizacja', map: 'Mapa', sat: 'Satelita', street: 'Ulica — spacer', near: 'W pobliżu', open: 'Otwórz w Mapach Google', streetHint: 'Poruszaj się strzałkami. Brak widoku ulicy — Google tu nie filmował.' },
  uk: { title: 'Локація', map: 'Карта', sat: 'Супутник', street: 'Вулиця — пройтися', near: 'Поруч', open: 'Відкрити в Google Картах', streetHint: 'Рухайтеся стрілками. Немає вулиці — Google тут не знімав.' },
} as const

type Mode = 'map' | 'sat' | 'street'

export function LocationView({ lat, lng, place, near, lang }: {
  lat: number
  lng: number
  /** «Санур, Бали». */
  place: string | null
  near: { label: string; value: string }[]
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const [mode, setMode] = useState<Mode>('map')
  const hl = lang === 'uk' ? 'uk' : lang === 'ban' ? 'id' : lang
  const src = mode === 'street'
    ? `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&hl=${hl}&output=svembed`
    : `https://www.google.com/maps?q=${lat},${lng}&z=${mode === 'sat' ? 17 : 16}${mode === 'sat' ? '&t=k' : ''}&hl=${hl}&output=embed`
  const openHref = mode === 'street'
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  const modes: { k: Mode; label: string; Icon: typeof MapIcon }[] = [
    { k: 'map', label: c.map, Icon: MapIcon },
    { k: 'sat', label: c.sat, Icon: Satellite },
    { k: 'street', label: c.street, Icon: Footprints },
  ]
  const buttons = (
    <div className="flex gap-2 lg:flex-col">
      {modes.map(({ k, label, Icon }) => (
        <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}
          className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-3 text-[14px] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] lg:h-12 lg:flex-none lg:justify-start lg:px-4 lg:text-[16px] ${mode === k ? 'border-0 bg-[#0F1A15] font-semibold text-white' : 'border border-[#ECEFED] bg-white text-[#0F1A15] hover:border-[#0F1A15]'}`}>
          <Icon size={18} aria-hidden /> <span className="truncate lg:hidden">{label.split(' —')[0]}</span><span className="hidden truncate lg:inline">{label}</span>
        </button>
      ))}
    </div>
  )
  return (
    <div className="flex h-full w-full flex-col bg-white lg:flex-row">
      <aside className={`hidden ${VIEWER_ASIDE_LG} text-[#0F1A15]`}>
        <div className="flex flex-col gap-1">
          <span className={VIEWER_LABEL}>{c.title}</span>
          {place && <span className="text-[15px] text-[#4A5550]">{place}</span>}
        </div>
        {buttons}
        {mode === 'street' && <span className="text-[13px] leading-[1.5] text-[#6B7570]">{c.streetHint}</span>}
        {near.length > 0 && (
          <div className="flex flex-col">
            <span className={`${VIEWER_LABEL} mb-1`}>{c.near}</span>
            {near.map(n => (
              <span key={n.label} className="flex justify-between gap-3 border-b border-[#ECEFED] py-2.5 text-[15px]">
                <span className="min-w-0">{n.label}</span><span className="shrink-0 text-[#6B7570]">{n.value}</span>
              </span>
            ))}
          </div>
        )}
        <a href={openHref} target="_blank" rel="noopener noreferrer"
          className="mt-auto inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-[16px] font-semibold text-white no-underline hover:bg-[var(--color-primary-pressed)]">
          {c.open} <ExternalLink size={16} aria-hidden />
        </a>
      </aside>
      <div className="p-3 lg:hidden">{buttons}</div>
      <div className="relative min-h-0 flex-1">
        <iframe key={mode} src={src} title={c.title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen
          className="absolute inset-0 h-full w-full border-0" />
        <a href={openHref} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-3 left-3 right-3 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white no-underline lg:hidden">
          {c.open} <ExternalLink size={16} aria-hidden />
        </a>
      </div>
    </div>
  )
}
