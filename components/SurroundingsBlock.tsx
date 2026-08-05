// "What's around" as a picture rather than a list: how many good venues sit
// within 3 km, and the nearest well-reviewed ones with their photos.
//
// Complements the older NearbyPlaces block (lib/nearby-places.ts), which still
// covers the practical categories a family asks about — schools, pharmacies,
// hospitals. This one answers the first question instead: is there any life
// here, and is it life for foreigners.
//
// Data: lib/surroundings.ts. Photos are our own cached copies in Storage, so
// nothing here calls Google at render time. Server Component.
import { Star } from 'lucide-react'
import type { Surroundings } from '@/lib/surroundings'
import { pickCopy, type Lang } from '@/lib/i18n'
import { translit, hasCyrillic } from '@/lib/translit'

const COPY = {
  ru: { title: 'Что вокруг', within: 'В 3 км', foreign: 'для иностранцев', km: 'км', m: 'м', share: 'заведений вокруг работают на иностранцев' },
  en: { title: 'The area around', within: 'Within 3 km', foreign: 'foreigner-facing', km: 'km', m: 'm', share: 'of nearby venues serve foreigners' },
  id: { title: 'Sekitar lokasi', within: 'Dalam 3 km', foreign: 'untuk turis asing', km: 'km', m: 'm', share: 'tempat di sekitar melayani turis asing' },
  fr: { title: 'Les environs', within: 'Dans un rayon de 3 km', foreign: 'pour étrangers', km: 'km', m: 'm', share: 'des lieux alentour visent les étrangers' },
  de: { title: 'Die Umgebung', within: 'Im Umkreis von 3 km', foreign: 'für Ausländer', km: 'km', m: 'm', share: 'der Orte in der Nähe richten sich an Ausländer' },
  zh: { title: '周边环境', within: '3 公里内', foreign: '面向外国人', km: '公里', m: '米', share: '的周边场所服务外国客人' },
  nl: { title: 'De omgeving', within: 'Binnen 3 km', foreign: 'voor buitenlanders', km: 'km', m: 'm', share: 'van de plekken in de buurt richt zich op buitenlanders' },
  ban: { title: 'Sane wenten ring kiwa tengen', within: 'Ring 3 km', foreign: 'anggen tamiu dura negara', km: 'km', m: 'm', share: 'genah ring kiwa tengen nglayanin tamiu dura negara' },
  pl: { title: 'Okolica', within: 'W promieniu 3 km', foreign: 'dla obcokrajowców', km: 'km', m: 'm', share: 'okolicznych miejsc obsługuje obcokrajowców' },
  uk: { title: 'Що навколо', within: 'У 3 км', foreign: 'для іноземців', km: 'км', m: 'м', share: 'закладів навколо працюють на іноземців' },
} as const

// Only the buckets a buyer pictures. The rest — temples, shops, clinics —
// stay in the detailed NearbyPlaces list below.
const SHOWN = ['restaurant', 'cafe', 'bar', 'beach_club', 'beach', 'spa', 'fitness', 'hotel', 'attraction', 'coworking'] as const

const BUCKETS: Record<string, Record<string, string>> = {
  restaurant: { ru: 'ресторанов', en: 'restaurants', id: 'restoran', fr: 'restaurants', de: 'Restaurants', zh: '家餐厅', nl: 'restaurants', ban: 'restoran', pl: 'restauracji', uk: 'ресторанів' },
  cafe: { ru: 'кафе', en: 'cafés', id: 'kafe', fr: 'cafés', de: 'Cafés', zh: '家咖啡馆', nl: 'cafés', ban: 'kafe', pl: 'kawiarni', uk: 'кафе' },
  bar: { ru: 'баров', en: 'bars', id: 'bar', fr: 'bars', de: 'Bars', zh: '家酒吧', nl: 'bars', ban: 'bar', pl: 'barów', uk: 'барів' },
  beach_club: { ru: 'бич-клубов', en: 'beach clubs', id: 'beach club', fr: 'beach clubs', de: 'Beachclubs', zh: '家海滩俱乐部', nl: 'beachclubs', ban: 'beach club', pl: 'beach clubów', uk: 'біч-клубів' },
  beach: { ru: 'пляжей', en: 'beaches', id: 'pantai', fr: 'plages', de: 'Strände', zh: '个海滩', nl: 'stranden', ban: 'pasih', pl: 'plaż', uk: 'пляжів' },
  spa: { ru: 'спа и йога-студий', en: 'spas and yoga studios', id: 'spa & yoga', fr: 'spas et studios de yoga', de: 'Spas und Yogastudios', zh: '家水疗与瑜伽馆', nl: "spa's en yogastudio's", ban: 'spa lan yoga', pl: 'spa i studiów jogi', uk: 'спа та йога-студій' },
  fitness: { ru: 'спортзалов', en: 'gyms', id: 'gym', fr: 'salles de sport', de: 'Fitnessstudios', zh: '家健身房', nl: 'sportscholen', ban: 'gym', pl: 'siłowni', uk: 'спортзалів' },
  hotel: { ru: 'отелей', en: 'hotels', id: 'hotel', fr: 'hôtels', de: 'Hotels', zh: '家酒店', nl: 'hotels', ban: 'hotel', pl: 'hoteli', uk: 'готелів' },
  attraction: { ru: 'достопримечательностей', en: 'attractions', id: 'atraksi', fr: 'sites touristiques', de: 'Sehenswürdigkeiten', zh: '个景点', nl: 'bezienswaardigheden', ban: 'objek wisata', pl: 'atrakcji', uk: 'визначних місць' },
  coworking: { ru: 'коворкингов', en: 'coworkings', id: 'coworking', fr: 'espaces de coworking', de: 'Coworkings', zh: '个联合办公空间', nl: 'coworkings', ban: 'coworking', pl: 'coworkingów', uk: 'коворкінгів' },
}

function bucketLabel(bucket: string, lang: Lang): string {
  return BUCKETS[bucket]?.[lang] ?? BUCKETS[bucket]?.en ?? bucket
}

/** Place names come from Google in Russian; other locales get them in Latin. */
function displayName(name: string | null, lang: Lang): string {
  if (!name) return ''
  return lang !== 'ru' && hasCyrillic(name) ? translit(name) : name
}

function distance(m: number | null, t: { km: string; m: string }): string | null {
  if (m == null) return null
  return m < 950 ? `${Math.round(m / 10) * 10} ${t.m}` : `${(m / 1000).toFixed(1)} ${t.km}`
}

export function SurroundingsBlock({ data, lang }: { data: Surroundings | null; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  if (!data) return null

  const counts = SHOWN
    .map((b) => ({ bucket: b, n: data.r3[b] ?? 0 }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)

  const venues = data.top.filter((v) => v.photo_url).slice(0, 8)
  if (!counts.length && !venues.length) return null

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-[18px] font-semibold tracking-tight text-[#111827] sm:text-[22px] md:text-[26px]">
        {t.title}
      </h2>

      {counts.length > 0 && (
        <p className="mb-4 text-[14px] text-[var(--color-text)]">
          <span className="text-[var(--color-text-muted)]">{t.within}: </span>
          {counts.map((c, i) => (
            <span key={c.bucket}>
              {i > 0 && <span className="text-[var(--color-text-muted)]"> · </span>}
              <strong className="font-semibold">{c.n}</strong> {bucketLabel(c.bucket, lang)}
            </span>
          ))}
          {data.touristShare != null && (
            <span className="text-[var(--color-text-muted)]">
              {' '}· <strong className="font-semibold text-[#111827]">{data.touristShare}%</strong> {t.share}
            </span>
          )}
        </p>
      )}

      {venues.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {venues.map((v) => {
            const foreign = v.tourist_grade === 'tourist_only' || v.tourist_grade === 'tourist_mostly'
            return (
              <figure key={v.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
                {/* Photos are already 640px WebP in our Storage — next/image
                    would add a transform hop for nothing. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.photo_url!}
                  alt={displayName(v.name, lang)}
                  width={640}
                  height={480}
                  loading="lazy"
                  className="h-28 w-full object-cover sm:h-32"
                />
                <figcaption className="p-2.5">
                  <div className="truncate text-[13px] font-medium text-[#111827]">{displayName(v.name, lang)}</div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                    {v.rating != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star size={11} className="fill-[#F59E0B] text-[#F59E0B]" />
                        {v.rating}
                      </span>
                    )}
                    <span>{distance(v.dist_m, t)}</span>
                  </div>
                  <div className="mt-1 truncate text-[12px] text-[var(--color-text-muted)]">
                    {bucketLabel(v.bucket, lang)}
                    {foreign ? ` · ${t.foreign}` : ''}
                  </div>
                </figcaption>
              </figure>
            )
          })}
        </div>
      )}
    </section>
  )
}
