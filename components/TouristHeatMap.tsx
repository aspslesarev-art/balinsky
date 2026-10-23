import { pickCopy, type Lang } from '@/lib/i18n'
import { ListingMap } from './ListingMap'
import { LazyMount } from './LazyMount'

// «Карта иностранных туристов» на страницах вилл и апартаментов (владелец
// 23.10.2026): видна сразу, без кнопки «Показать карту», и без надписей на
// самой карте — только объект красной точкой, оранжевые пятна туристов и
// одна пометка, что значат пятна.
// Бесплатная подложка OpenStreetMap вместо платной карты Google.
const NOTE = {
  ru: 'Чем ярче пятно, тем больше мест с оценкой от 4,3 и от 50 отзывов в Google',
  en: 'The brighter the spot, the more places rated 4.3+ with 50+ Google reviews',
}
const TITLE = { ru: 'Карта иностранных туристов', en: 'Where foreign tourists go', id: 'Peta turis asing', fr: 'Carte des touristes étrangers', de: 'Wo ausländische Touristen sind', zh: '外国游客聚集地图', nl: 'Waar buitenlandse toeristen zijn', ban: 'Peta turis asing', pl: 'Mapa zagranicznych turystów', uk: 'Карта іноземних туристів' }

export function TouristHeatMap({ lat, lng, name, lang }: { lat: number; lng: number; name: string; lang: Lang }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{pickCopy(TITLE, lang)}</h3>
      <LazyMount fallback={<div className="h-[420px] rounded-xl bg-[var(--color-search-bg)]" />}>
        <div className="relative">
          <ListingMap lat={lat} lng={lng} name={name} heat className="h-[420px]" />
          {/* Пометка на самой карте — что значат пятна (владелец 23.10.2026). */}
          <span className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-24px)] items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-[13px] text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/.06),0_4px_12px_rgb(0_0_0/.08)]">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full bg-[radial-gradient(circle,rgba(245,101,20,.85),rgba(255,214,102,.45))]" />
            {pickCopy(NOTE, lang)}
          </span>
        </div>
      </LazyMount>
    </section>
  )
}
