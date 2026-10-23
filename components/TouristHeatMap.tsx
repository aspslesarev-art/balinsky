import { pickCopy, type Lang } from '@/lib/i18n'
import { ListingMap } from './ListingMap'
import { LazyMount } from './LazyMount'

// «Карта иностранных туристов» на страницах вилл и апартаментов (владелец
// 23.10.2026): видна сразу, без кнопки «Показать карту», и без надписей на
// самой карте — только объект красной точкой и красные пятна туристов.
// Бесплатная подложка OpenStreetMap вместо платной карты Google.
const TITLE = { ru: 'Карта иностранных туристов', en: 'Where foreign tourists go', id: 'Peta turis asing', fr: 'Carte des touristes étrangers', de: 'Wo ausländische Touristen sind', zh: '外国游客聚集地图', nl: 'Waar buitenlandse toeristen zijn', ban: 'Peta turis asing', pl: 'Mapa zagranicznych turystów', uk: 'Карта іноземних туристів' }

export function TouristHeatMap({ lat, lng, name, lang }: { lat: number; lng: number; name: string; lang: Lang }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{pickCopy(TITLE, lang)}</h3>
      <LazyMount fallback={<div className="h-[420px] rounded-xl bg-[var(--color-search-bg)]" />}>
        <ListingMap lat={lat} lng={lng} name={name} heat className="h-[420px]" />
      </LazyMount>
    </section>
  )
}
