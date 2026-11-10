'use client'

import { useState, useMemo } from 'react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { LivingFacts } from '@/lib/living'
import type { Routes, RouteLeg } from '@/lib/complex-access'
import type { RouteLines } from '@/lib/listing-map'
import { ROUTE_COLOR, nearPoints as computeNearPoints, NEAR_GROUPS } from '@/lib/listing-map'
import type { NearbyPlace } from '@/lib/nearby-places'
import { ListingMap, type MapRoute, type MapPoint } from './ListingMap'
import { LazyMount } from './LazyMount'
import { NearbyHighlights } from './NearbyHighlights'

type TabKey = 'nearby' | 'routes' | 'tourists'

const EMOJI: Record<string, string> = {
  school: '🎓', beach: '🏖️', health: '🏥', shop: '🛒', cafes: '☕', quiet: '🤫', volcano: '🌋',
}

const COPY = {
  ru: {
    title: 'Расположение',
    tabs: { nearby: 'Что рядом', routes: 'Как добираться', tourists: 'Туристы' } as Record<TabKey, string>,
    labels: { school: 'Школа', intl: 'Международная школа', beach: 'Пляж', health: 'Клиника', shop: 'Магазин', cafes: 'Кафе', quiet: 'Тишина', volcano: 'Вулкан' },
    km: (km: number) => km < 1 ? `${Math.round(km * 1000 / 50) * 50} м` : `${km.toFixed(1).replace('.', ',')} км`,
    far: (km: number) => `дальше ${String(km).replace('.', ',')} км`,
    drive: (m: number) => `${m} мин на машине`,
    straight: 'по прямой',
    quietOk: 'тихо',
    cafesCount: (n: number) => `${n} в 500 м`,
    routeLabels: { airport: '✈ Аэропорт', canggu: 'Чангу', ubud: 'Убуд', uluwatu: 'Улувату', sanur: 'Санур' } as Record<string, string>,
    min: 'мин',
    reviewsNearby: 'отзывов на Google Maps в радиусе 1 км',
    touristNote: (beach: string | null) => beach
      ? `Район с высокой плотностью отзывов — туристы здесь активны. ${beach} и рестораны рядом получают стабильный поток гостей.`
      : 'Район с высокой плотностью отзывов — туристы здесь активны. Рестораны и кафе рядом получают стабильный поток гостей.',
    restNearby: 'ресторанов рядом',
    cafesNearby: 'кафе рядом',
  },
  en: {
    title: 'Location',
    tabs: { nearby: 'What\'s nearby', routes: 'Getting there', tourists: 'Tourists' } as Record<TabKey, string>,
    labels: { school: 'School', intl: 'International school', beach: 'Beach', health: 'Clinic', shop: 'Grocery', cafes: 'Cafés', quiet: 'Quiet', volcano: 'Volcano' },
    km: (km: number) => km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(1)} km`,
    far: (km: number) => `beyond ${km} km`,
    drive: (m: number) => `${m} min by car`,
    straight: 'as the crow flies',
    quietOk: 'quiet',
    cafesCount: (n: number) => `${n} within 500 m`,
    routeLabels: { airport: '✈ Airport', canggu: 'Canggu', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur' } as Record<string, string>,
    min: 'min',
    reviewsNearby: 'reviews on Google Maps within 1 km',
    touristNote: (beach: string | null) => beach
      ? `High review density area — tourists are active here. ${beach} and nearby restaurants enjoy a steady flow of guests.`
      : 'High review density area — tourists are active here. Restaurants and cafés nearby enjoy a steady flow of guests.',
    restNearby: 'restaurants nearby',
    cafesNearby: 'cafés nearby',
  },
} as const

type Props = {
  lat: number
  lng: number
  name: string
  livingFacts: LivingFacts | null
  nearby: { byCategory: Record<string, NearbyPlace[]> } | null
  routes: Routes | null
  routeLines: RouteLines | null
  beach: { name: string; rating: number | null; reviews: number | null; km: number } | null
  lang: Lang
}

const MINUTES = (s: number) => Math.round(s / 60)

export function LocationSection({ lat, lng, name, livingFacts, nearby, routes, routeLines, beach, lang }: Props) {
  const [tab, setTab] = useState<TabKey>('nearby')
  const c = pickCopy(COPY, lang)
  const TABS: TabKey[] = ['nearby', 'routes', 'tourists']

  const nearData = useMemo(() => {
    if (!nearby) return { points: [] as MapPoint[], groups: [] as { key: string; color: string; ru: string; en: string }[] }
    return computeNearPoints(nearby.byCategory)
  }, [nearby])

  const mapPoints = nearData.points
  const mapGroups = nearData.groups

  const mapRoutes = useMemo((): MapRoute[] => {
    if (!routeLines) return []
    return (Object.keys(routeLines) as (keyof typeof ROUTE_COLOR)[])
      .filter(k => routeLines[k]?.length)
      .map(k => ({
        key: k,
        color: ROUTE_COLOR[k],
        label: c.routeLabels[k] ?? k,
        line: routeLines[k]!,
      }))
  }, [routeLines, c.routeLabels])

  const routeStats = useMemo(() => {
    if (!routes) return []
    const ORDER: (keyof Routes)[] = ['airport', 'canggu', 'ubud', 'uluwatu', 'sanur']
    return ORDER.filter(k => routes[k]).map(k => {
      const leg = routes[k]!
      return {
        key: k,
        label: c.routeLabels[k] ?? k,
        min: MINUTES(leg.s),
        color: ROUTE_COLOR[k] ?? '#94A29A',
      }
    })
  }, [routes, c.routeLabels])

  const touristStats = useMemo(() => {
    if (!nearby) return { totalReviews: 0, restaurants: 0, cafes: 0 }
    let totalReviews = 0
    let restaurants = 0
    let cafes = 0
    for (const [cat, places] of Object.entries(nearby.byCategory)) {
      for (const p of places) {
        if (p.distanceKm > 1) continue
        totalReviews += p.reviews ?? 0
        if (cat === 'restaurant') restaurants++
        if (cat === 'cafe') cafes++
      }
    }
    return { totalReviews, restaurants, cafes }
  }, [nearby])

  const poiCards = useMemo(() => {
    if (!livingFacts) return []
    return livingFacts.rows
      .filter(r => r.key !== 'volcano')
      .map(r => {
        const emoji = EMOJI[r.key] ?? '📍'
        const label = r.key === 'school' && r.intl ? c.labels.intl : c.labels[r.key as keyof typeof c.labels] ?? r.key
        let sub = ''
        if (r.key === 'quiet') {
          sub = r.tone === 'plus' ? c.quietOk : (r.reasons?.[0] ? '' : '')
          if (r.tone === 'plus') sub = c.quietOk
        } else if (r.key === 'cafes') {
          sub = r.count ? c.cafesCount(r.count) : (r.km != null ? c.km(r.km) : '')
        } else {
          const kmTxt = r.km != null ? (r.straight ? `${c.km(r.km)} ${c.straight}` : c.km(r.km)) : c.far(r.searchKm ?? 0)
          sub = [kmTxt, r.name, r.driveMin ? c.drive(r.driveMin) : null].filter(Boolean).join(' · ')
        }
        return { emoji, label, sub }
      })
  }, [livingFacts, c])

  const hasRoutes = routeStats.length > 0
  const hasPOI = poiCards.length > 0

  return (
    <section id="mesto" className="scroll-mt-24 flex flex-col gap-4">
      <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-[#18201C] m-0">{c.title}</h2>

      <div role="tablist" className="flex gap-6 border-b border-[#E4E9E6]">
        {TABS.map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`pb-2.5 text-[15px] border-b-2 bg-transparent cursor-pointer transition-colors ${
              tab === t
                ? 'border-[#1B6E4A] text-[#1B6E4A] font-semibold'
                : 'border-transparent text-[#4C5751] font-normal hover:text-[#18201C]'
            }`}
          >{c.tabs[t]}</button>
        ))}
      </div>

      <LazyMount fallback={<div className="h-[420px] rounded-xl bg-[#F3F7F4]" />}>
        <div className="relative rounded-xl overflow-hidden">
          {tab === 'nearby' && (
            <ListingMap lat={lat} lng={lng} name={name} points={mapPoints} className="h-[420px]" />
          )}
          {tab === 'routes' && (
            <ListingMap lat={lat} lng={lng} name={name} routes={mapRoutes} className="h-[420px]" />
          )}
          {tab === 'tourists' && (
            <ListingMap lat={lat} lng={lng} name={name} heat className="h-[420px]" />
          )}

          {tab === 'nearby' && mapGroups.length > 0 && (
            <div className="absolute left-4 right-14 bottom-4 flex gap-2 flex-wrap pointer-events-none">
              {mapGroups.map(g => (
                <span key={g.key} className="text-[14px] px-3.5 py-2 rounded-lg bg-white/95 shadow-[0_1px_2px_rgb(0_0_0/.08)] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                  {pickCopy({ ru: g.ru, en: g.en }, lang)}
                </span>
              ))}
            </div>
          )}
        </div>
      </LazyMount>

      {tab === 'nearby' && hasPOI && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {poiCards.map((p, i) => (
            <div key={i} className="flex gap-3 items-center px-3.5 py-3 border border-[#EEF2EF] rounded-[10px]">
              <span className="text-[22px]">{p.emoji}</span>
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-[#18201C]">{p.label}</span>
                {p.sub && <span className="text-[13px] text-[#4C5751]">{p.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'nearby' && nearby && <NearbyHighlights byCategory={nearby.byCategory} lang={lang} />}

      {tab === 'routes' && hasRoutes && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {routeStats.map(r => (
            <div key={r.key} className="flex flex-col gap-0.5 pt-2.5" style={{ borderTop: `3px solid ${r.color}` }}>
              <span className="text-[13px] text-[#4C5751]">{r.label}</span>
              <span className="text-[17px] font-semibold text-[#18201C]">{r.min} {c.min}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'tourists' && (
        <div className="flex flex-col gap-4">
          {touristStats.totalReviews > 0 && (
            <div className="bg-[#F3F7F4] rounded-xl p-6 flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-semibold leading-[1.15]">{touristStats.totalReviews.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}</span>
                <span className="text-[14px] text-[#4C5751]">{c.reviewsNearby}</span>
              </div>
              <p className="m-0 text-[15px] leading-[1.55] text-[#36413B]">
                {c.touristNote(beach?.name ?? null)}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {beach && (
              <div className="p-4 border border-[#EEF2EF] rounded-[10px] flex flex-col gap-1">
                <span className="text-[22px] font-semibold">{beach.rating ? `${beach.rating}★` : '🏖️'}</span>
                <span className="text-[13px] text-[#4C5751]">{beach.name}</span>
              </div>
            )}
            {touristStats.restaurants > 0 && (
              <div className="p-4 border border-[#EEF2EF] rounded-[10px] flex flex-col gap-1">
                <span className="text-[22px] font-semibold">{touristStats.restaurants}</span>
                <span className="text-[13px] text-[#4C5751]">{c.restNearby}</span>
              </div>
            )}
            {touristStats.cafes > 0 && (
              <div className="p-4 border border-[#EEF2EF] rounded-[10px] flex flex-col gap-1">
                <span className="text-[22px] font-semibold">{touristStats.cafes}</span>
                <span className="text-[13px] text-[#4C5751]">{c.cafesNearby}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
