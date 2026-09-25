// Homepage block: four headline market figures, each linking to the page
// that explains it. Every locale; Balinese reads the Indonesian copy.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { MARKET, marketPath, usd, asOfLabel } from '@/lib/market-index'

type Copy = {
  h2: string
  data: (when: string) => string
  how: string
  median: (n: number) => string
  perM2: string
  month: string
  night: string
  prices: string
  rent: string
}

const COPY: Record<Exclude<Lang, 'ban'>, Copy> = {
  ru: {
    h2: 'Рынок Бали в цифрах', data: w => `Данные за ${w} · `, how: 'как мы считаем',
    median: n => `медианная цена виллы, ${n} объектов`, perM2: 'за м² — медиана по виллам',
    month: 'в месяц — аренда виллы с 2 спальнями', night: 'за ночь — вилла с 2 спальнями посуточно',
    prices: 'Цены по районам', rent: 'Сколько стоит аренда',
  },
  en: {
    h2: 'The Bali market in numbers', data: w => `Data for ${w} · `, how: 'how we calculate',
    median: n => `median villa asking price, ${n} listings`, perM2: 'per m² — villa median',
    month: 'a month — renting a 2-bedroom villa', night: 'a night — 2-bedroom holiday villa',
    prices: 'Prices by area', rent: 'What rent costs',
  },
  id: {
    h2: 'Pasar Bali dalam angka', data: w => `Data ${w} · `, how: 'cara kami menghitung',
    median: n => `median harga penawaran vila, ${n} listing`, perM2: 'per m² — median vila',
    month: 'per bulan — sewa vila 2 kamar tidur', night: 'per malam — vila liburan 2 kamar tidur',
    prices: 'Harga per kawasan', rent: 'Berapa harga sewa',
  },
  fr: {
    h2: 'Le marché de Bali en chiffres', data: w => `Données : ${w} · `, how: 'notre méthode',
    median: n => `prix demandé médian d’une villa, ${n} annonces`, perM2: 'au m² — médiane des villas',
    month: 'par mois — location d’une villa de 2 chambres', night: 'la nuit — villa de vacances de 2 chambres',
    prices: 'Prix par quartier', rent: 'Combien coûte un loyer',
  },
  de: {
    h2: 'Der Bali-Markt in Zahlen', data: w => `Daten: ${w} · `, how: 'so rechnen wir',
    median: n => `medianer Angebotspreis einer Villa, ${n} Angebote`, perM2: 'pro m² — Median der Villen',
    month: 'pro Monat — Villa mit 2 Schlafzimmern mieten', night: 'pro Nacht — Ferienvilla mit 2 Schlafzimmern',
    prices: 'Preise nach Gegend', rent: 'Was Miete kostet',
  },
  zh: {
    h2: '数字看巴厘岛市场', data: w => `数据：${w} · `, how: '我们如何计算',
    median: n => `别墅挂牌价中位数，${n}套`, perM2: '每平方米——别墅中位数',
    month: '每月——租一套两居室别墅', night: '每晚——两居室度假别墅',
    prices: '各区域价格', rent: '租房多少钱',
  },
  nl: {
    h2: 'De markt op Bali in cijfers', data: w => `Data: ${w} · `, how: 'hoe we rekenen',
    median: n => `mediane vraagprijs villa, ${n} aanbiedingen`, perM2: 'per m² — mediaan villa’s',
    month: 'per maand — villa met 2 slaapkamers huren', night: 'per nacht — vakantievilla met 2 slaapkamers',
    prices: 'Prijzen per gebied', rent: 'Wat huren kost',
  },
  pl: {
    h2: 'Rynek Bali w liczbach', data: w => `Dane: ${w} · `, how: 'jak liczymy',
    median: n => `mediana ceny ofertowej willi, ofert: ${n}`, perM2: 'za m² — mediana willi',
    month: 'miesięcznie — najem willi z 2 sypialniami', night: 'za noc — willa wakacyjna z 2 sypialniami',
    prices: 'Ceny według rejonów', rent: 'Ile kosztuje najem',
  },
  uk: {
    h2: 'Ринок Балі в цифрах', data: w => `Дані: ${w} · `, how: 'як ми рахуємо',
    median: n => `медіанна ціна вілли, об’єктів: ${n}`, perM2: 'за м² — медіана по віллах',
    month: 'на місяць — оренда вілли з 2 спальнями', night: 'за ніч — вілла з 2 спальнями подобово',
    prices: 'Ціни за районами', rent: 'Скільки коштує оренда',
  },
}

export function MarketNumbers({ lang }: { lang: Lang }) {
  const V = MARKET.island.villas
  const c = COPY[lang === 'ban' ? 'id' : lang]
  const cards = [
    { v: usd(V.median, lang), t: c.median(V.n), href: marketPath('prices', lang) },
    { v: usd(V.perM2, lang), t: c.perM2, href: marketPath('prices', lang) },
    { v: usd(MARKET.monthly.island.villa2br.median, lang), t: c.month, href: marketPath('rent', lang) },
    { v: usd(MARKET.island.villaRent['2br'].median, lang), t: c.night, href: marketPath('rent', lang) },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h2 className="text-[26px] md:text-[38px] leading-[1.15] font-light tracking-[-0.02em] text-[#0E1A14]">
          {c.h2}
        </h2>
        <p className="text-[13px] text-[#4B5563]">
          {c.data(asOfLabel(lang))}
          <Link href={marketPath('method', lang)} className="text-[var(--color-primary)] underline underline-offset-2 hover:no-underline">
            {c.how}
          </Link>
        </p>
      </div>
      <ul className="mt-8 md:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <li key={card.t}>
            <Link href={card.href} className="group block h-full rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6 no-underline hover:border-[var(--color-primary)] transition-colors">
              <div className="text-[26px] md:text-[32px] font-light tabular-nums leading-none text-[#0E1A14]">{card.v}</div>
              <div className="mt-3 text-[13.5px] leading-[1.45] text-[#4B5563]">{card.t}</div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
        <Link href={marketPath('prices', lang)} className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)] no-underline hover:gap-2.5 transition-all">
          {c.prices} <ArrowRight size={15} />
        </Link>
        <Link href={marketPath('rent', lang)} className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)] no-underline hover:gap-2.5 transition-all">
          {c.rent} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
