'use client'

import { MapPin } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'

// Google Maps берёт деньги за каждую загрузку карты. Раньше карты грузились
// только вошедшим; теперь вход убран, и чтобы счёт не рос от каждого
// заглянувшего на страницу, карта грузится по нажатию.
const LABEL = {
  ru: 'Показать карту', en: 'Show map', id: 'Tampilkan peta', fr: 'Afficher la carte',
  de: 'Karte anzeigen', zh: '显示地图', nl: 'Kaart tonen', ban: 'Edengang peta',
  pl: 'Pokaż mapę', uk: 'Показати карту',
} as const

export function MapLoadPrompt({ lang, onLoad }: { lang: Lang; onLoad: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <button
        type="button"
        onClick={onLoad}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-[14px] font-semibold text-white shadow-md transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] cursor-pointer"
      >
        <MapPin size={16} />
        {pickCopy(LABEL, lang)}
      </button>
    </div>
  )
}
