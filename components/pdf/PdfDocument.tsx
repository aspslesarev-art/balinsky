// Печатная презентация объекта (Pro, макет «Balinsky — страницы PDF»,
// владелец 28.10.2026). Листы A4 альбомом; в листы ставятся те же блоки,
// что на странице объекта, — цифры совпадают с сайтом. Карты — статичные
// снимки Esri (StaticMap), остальное печатает браузер.

import type { ReactNode } from 'react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { InlinePrice } from '@/components/InlinePrice'
import { StaticMap, type MapPoint } from './StaticMap'
import { PdfShell } from './PdfShell'
import { computeEconomics, type TaxStatus } from '@/lib/investment/economics'
import { AGENT_FEE_PCT, MONTHS_RENTED, computeMonthlyEconomics } from '@/lib/investment/monthly'
import type { InvestmentSnapshot } from '@/lib/investment/snapshot'
import type { CalcSettings } from '@/lib/calc-settings'

import type { PdfBlock } from '@/lib/pdf-blocks'

export type PdfHead = { kicker: string; title: string; lead?: string }
export type PdfCalcRow = { label: string; value: ReactNode; strong?: boolean }

const COPY = {
  ru: {
    bali: 'Бали', facts: 'Характеристики', about: 'Об объекте', photos: 'Фото',
    near: 'Что рядом', nearSub: 'Круги - 100 м, 500 м и 1 км по прямой',
    heat: 'Где оживлённо: карта иностранных туристов', heatSub: 'Чем ярче пятно, тем больше мест с оценкой от 4,3 и от 50 отзывов в Google',
    daily: 'Посуточная аренда рядом', monthly: 'Помесячная аренда рядом', sale: 'Что продаётся рядом',
    calc: 'Расчёт доходности', calcSub: 'Цифры из калькулятора на странице объекта. Это оценка по реальным ставкам соседей, а не обещание дохода.',
    settings: 'Настройки расчёта', result: 'Результат',
    price: 'Цена', night: 'Цена за ночь', occ: 'Загрузка', mgmt: 'Управляющая компания', rent: 'Аренда в месяц',
    months: 'Сдано месяцев в году', agentFee: 'Комиссия агента', taxL: 'Налоги',
    tax: { beforeTax: 'до налогов', resident: 'резидент, 10%', nonResident: 'нерезидент, 20%' } as Record<string, string>,
    revenue: 'Выручка в год', noi: 'Чистыми в год', yieldY: 'Доходность в год', payback: 'Окупаемость',
    years: (n: number) => `${n.toFixed(1).replace('.', ',')} лет`,
    agent: 'Ваш агент', agentSub: 'Свяжитесь напрямую - отвечу и помогу с просмотром',
    more: 'Подробнее на сайте', moreSub: 'Актуальная цена, все цифры и форма связи - на странице объекта',
    legend: { beach: 'Пляж', health: 'Клиники и аптеки', shop: 'Магазины', school: 'Школы', food: 'Кафе и рестораны' },
    print: 'Сохранить в PDF', printHint: 'В окне печати выберите «Сохранить как PDF».',
  },
  en: {
    bali: 'Bali', facts: 'Key facts', about: 'About the property', photos: 'Photos',
    near: 'What is nearby', nearSub: 'Circles - 100 m, 500 m and 1 km as the crow flies',
    heat: 'Where it is lively: foreign visitors map', heatSub: 'The brighter the spot, the more places rated 4.3+ with 50+ Google reviews',
    daily: 'Nightly rentals nearby', monthly: 'Monthly rentals nearby', sale: 'For sale nearby',
    calc: 'Yield calculation', calcSub: 'Numbers from the calculator on the listing page. An estimate based on real neighbour rates, not a promise of income.',
    settings: 'Calculation settings', result: 'Result',
    price: 'Price', night: 'Nightly rate', occ: 'Occupancy', mgmt: 'Management company', rent: 'Monthly rent',
    months: 'Months rented per year', agentFee: 'Agent commission', taxL: 'Taxes',
    tax: { beforeTax: 'before tax', resident: 'resident, 10%', nonResident: 'non-resident, 20%' } as Record<string, string>,
    revenue: 'Revenue per year', noi: 'Net per year', yieldY: 'Yield per year', payback: 'Payback',
    years: (n: number) => `${n.toFixed(1)} years`,
    agent: 'Your agent', agentSub: 'Contact me directly - I will answer and arrange a viewing',
    more: 'More on the website', moreSub: 'Current price, all numbers and contact form - on the listing page',
    legend: { beach: 'Beach', health: 'Clinics and pharmacies', shop: 'Shops', school: 'Schools', food: 'Cafes and restaurants' },
    print: 'Save as PDF', printHint: 'In the print window choose “Save as PDF”.',
  },
}

export const NEAR_COLORS: Record<string, string> = {
  beach: '#3898EC', hospital: '#E64650', pharmacy: '#E64650', supermarket: '#F59E0B',
  international_school: '#9366E6', school: '#9366E6', restaurant: '#FFFFFF', cafe: '#FFFFFF',
}

function Page({ head, footer, children, bleed = false, portrait = false }: { head?: PdfHead; footer: string; children: ReactNode; bleed?: boolean; portrait?: boolean }) {
  return (
    <section className="pdf-page">
      <div className={`pdf-inner ${bleed ? '' : portrait ? 'px-5 pt-2' : 'px-12 pt-10 pb-6'}`}>
        {head && (
          <header className="mb-5 flex flex-col gap-1">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary-pressed)]">{head.kicker}</div>
            <h2 className={`${portrait ? 'text-[22px]' : 'text-[26px]'} font-semibold leading-tight tracking-tight`}>{head.title}</h2>
            {head.lead && <p className="max-w-[90ch] text-[15px] leading-relaxed text-[var(--color-text-muted)]">{head.lead}</p>}
          </header>
        )}
        <div className="pdf-body">{children}</div>
      </div>
      <footer className="pdf-foot">{footer}</footer>
    </section>
  )
}

export function PdfDocument(p: {
  lang: Lang
  title: string
  district: string | null
  photos: string[]
  priceUsd: number | null
  pricePerM2: number | null
  chips: string[]
  facts: { label: string; value: string }[]
  about: string | null
  lat: number | null
  lng: number | null
  url: string
  blocks: PdfBlock[]
  agent: { name: string; telegram: string; whatsapp: string } | null
  heads: Partial<Record<'verdict' | 'safety' | 'comfort' | 'demand' | 'money', PdfHead>>
  nodes: Partial<Record<PdfBlock | 'climate', ReactNode>>
  nearPoints: MapPoint[]
  nearLegend?: ReactNode
  snap: InvestmentSnapshot | null
  calcSettings: CalcSettings | null
  autoPrint: boolean
  portrait?: boolean
  /** Слова, которых не должно быть в тексте (подборка для клиента). */
  scrub?: string[]
  back?: { href: string; label: string }
}) {
  const c = pickCopy(COPY, p.lang)
  const P = !!p.portrait
  const calc = calcRows(p.snap, p.calcSettings, p.lang, c)
  const want = (b: PdfBlock) => p.blocks.includes(b)
  const foot = `${p.title} · balinsky.info`
  const hasMap = p.lat != null && p.lng != null
  const pool = p.photos.slice(1, 10)
  return (
    <PdfShell autoPrint={p.autoPrint} printLabel={c.print} printHint={c.printHint} portrait={P} back={p.back}
      // В коде страницы — не открытым текстом: клиент не должен прочитать имена и там.
      scrub={p.scrub?.map(w => Buffer.from(w, 'utf8').toString('base64'))}>
      {/* Обложка — всегда. */}
      <section className="pdf-page">
        <div className="pdf-inner" style={{ flexDirection: P ? 'column-reverse' : 'row', bottom: 0 }}>
          <div className={`flex flex-col justify-center gap-4 ${P ? 'px-5 py-6' : 'w-[46%] px-12'}`}>
            {p.district && <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary-pressed)]">{p.district}, {c.bali}</div>}
            <h1 className={`${P ? 'text-[26px]' : 'text-[34px]'} font-semibold leading-[1.15] tracking-tight`}>{p.title}</h1>
            <div className="flex flex-wrap gap-2">
              {p.chips.map(x => <span key={x} className="rounded-full bg-[var(--color-search-bg)] px-3 py-1 text-[13px]">{x}</span>)}
            </div>
            {p.priceUsd != null && (
              <div>
                <div className="text-[32px] font-semibold"><InlinePrice usd={p.priceUsd} lang={p.lang} approx={false} /></div>
                {p.pricePerM2 != null && <div className="text-[15px] text-[var(--color-text-muted)]"><InlinePrice usd={p.pricePerM2} lang={p.lang} approx={false} /> / м²</div>}
              </div>
            )}
          </div>
          {p.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element -- печатная страница
            <img src={p.photos[0]} alt={p.title} className={P ? 'h-[105mm] w-full object-cover' : 'h-full w-[54%] object-cover'} />
          )}
        </div>
      </section>

      {want('verdict') && p.nodes.verdict && <Page portrait={P} head={p.heads.verdict} footer={foot}>{p.nodes.verdict}</Page>}

      {want('photos') && pool.length > 0 && (
        <Page portrait={P} footer={foot} head={{ kicker: c.photos, title: p.title }}>
          <div className={P ? 'grid grid-cols-2 gap-2' : 'grid h-[150mm] grid-cols-3 grid-rows-2 gap-2'}>
            {pool.slice(0, 6).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- печатная страница
              <img key={i} src={src} alt="" className={P ? `pdf-keep aspect-[4/3] w-full rounded-lg object-cover ${i === 0 ? 'col-span-2' : ''}` : `h-full w-full rounded-lg object-cover ${i === 0 ? 'col-span-2 row-span-2' : ''}`} />
            ))}
          </div>
        </Page>
      )}

      {want('facts') && p.facts.length > 0 && (
        <Page portrait={P} footer={foot} head={{ kicker: p.title, title: c.facts }}>
          <div className={`grid gap-3 ${P ? 'grid-cols-2' : 'grid-cols-4'}`}>
            {p.facts.map(f => (
              <div key={f.label} className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="text-[13px] uppercase tracking-wide text-[var(--color-text-muted)]">{f.label}</div>
                <div className="mt-1 text-[20px] font-semibold">{f.value}</div>
              </div>
            ))}
          </div>
        </Page>
      )}

      {want('about') && p.about && (
        <Page portrait={P} footer={foot} head={{ kicker: p.title, title: c.about }}>
          <p className="max-w-[100ch] whitespace-pre-line text-[15px] leading-relaxed">{p.about}</p>
        </Page>
      )}

      {want('safety') && p.nodes.safety && <Page portrait={P} head={p.heads.safety} footer={foot}>{p.nodes.safety}</Page>}

      {want('near') && hasMap && (
        <Page portrait={P} footer={foot} bleed>
          <div className={P ? 'flex flex-col' : 'flex h-full'}>
            <StaticMap lat={p.lat!} lng={p.lng!} zoom={15} width={P ? 408 : 620} height={P ? 440 : 756} dim={0.22} label="Esri, Maxar"
              rings={[{ m: 1000, label: '1 км' }, { m: 500, label: '500 м' }, { m: 100, label: '100 м' }]}
              points={p.nearPoints} />
            <div className={`flex min-w-0 flex-1 flex-col gap-4 ${P ? 'px-5 pt-5' : 'px-8 pt-10'}`}>
              {p.heads.comfort && <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary-pressed)]">{p.heads.comfort.kicker}</div>}
              <h2 className="text-[26px] font-semibold leading-tight tracking-tight">{c.near}</h2>
              <p className="text-[13px] text-[var(--color-text-muted)]">{c.nearSub}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {([['beach', NEAR_COLORS.beach], ['health', NEAR_COLORS.hospital], ['shop', NEAR_COLORS.supermarket], ['school', NEAR_COLORS.school], ['food', NEAR_COLORS.cafe]] as const).map(([k, col]) => (
                  <span key={k} className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-[#0F1A15]" style={{ background: col }} />{c.legend[k]}</span>
                ))}
              </div>
              <div className={P ? '' : 'pdf-fit min-h-0 flex-1'}>{p.nearLegend}</div>
            </div>
          </div>
        </Page>
      )}

      {want('living') && p.nodes.living && <Page portrait={P} head={p.heads.comfort} footer={foot}>{p.nodes.living}</Page>}
      {want('living') && p.nodes.climate && <Page portrait={P} head={p.heads.comfort ? { kicker: p.heads.comfort.kicker, title: p.heads.comfort.title } : undefined} footer={foot}>{p.nodes.climate}</Page>}

      {want('heat') && hasMap && (
        <Page portrait={P} footer={foot} head={{ kicker: p.heads.comfort?.kicker ?? '', title: c.heat, lead: c.heatSub }}>
          <div className="overflow-hidden rounded-xl">
            <StaticMap lat={p.lat!} lng={p.lng!} zoom={15} width={P ? 368 : 1027} height={P ? 520 : 540} heat dim={0.1} label="Esri, Maxar" />
          </div>
        </Page>
      )}

      {want('daily') && p.nodes.daily && <Page portrait={P} head={{ kicker: p.heads.demand?.kicker ?? '', title: c.daily, lead: p.heads.demand?.lead }} footer={foot}>{p.nodes.daily}</Page>}
      {want('monthly') && p.nodes.monthly && <Page portrait={P} head={{ kicker: p.heads.demand?.kicker ?? '', title: c.monthly }} footer={foot}>{p.nodes.monthly}</Page>}
      {want('sale') && p.nodes.sale && <Page portrait={P} head={{ kicker: p.heads.money?.kicker ?? '', title: c.sale }} footer={foot}>{p.nodes.sale}</Page>}

      {want('calc') && (calc || p.nodes.calc) && (
        <Page portrait={P} head={p.heads.money ? { ...p.heads.money, lead: c.calcSub } : { kicker: '', title: c.calc, lead: c.calcSub }} footer={foot}>
          <div className="flex flex-col gap-6">
            {calc && (
              <div className={`grid gap-6 ${P ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {([[c.settings, calc.settings], [c.result, calc.result]] as const).map(([h, rows]) => (
                  <div key={h} className="rounded-xl border border-[var(--color-border)] p-5">
                    <div className="mb-3 text-[15px] font-semibold">{h}</div>
                    {rows.map(r => (
                      <div key={r.label} className="flex justify-between gap-4 border-b border-[var(--color-neutral-100)] py-2 text-[15px] last:border-0">
                        <span className="text-[var(--color-text-muted)]">{r.label}</span>
                        <span className={r.strong ? 'text-[20px] font-semibold' : 'font-semibold'}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {p.nodes.calc}
          </div>
        </Page>
      )}

      {/* Последняя страница — всегда: контакты агента или ссылка на объект. */}
      <section className="pdf-page">
        <div className={`pdf-inner flex flex-col items-start justify-center gap-4 ${P ? 'min-h-[160mm] px-5' : 'px-16'}`}>
          <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary-pressed)]">{p.agent ? c.agent : c.more}</div>
          <div className="text-[34px] font-semibold tracking-tight">{p.agent ? p.agent.name : p.title}</div>
          <p className="text-[16px] text-[var(--color-text-muted)]">{p.agent ? c.agentSub : c.moreSub}</p>
          {p.agent ? (
            <div className="flex flex-col gap-2 text-[18px]">
              {p.agent.telegram && <a href={`https://t.me/${p.agent.telegram.replace(/^@/, '')}`}>Telegram: {p.agent.telegram}</a>}
              {p.agent.whatsapp && <a href={`https://wa.me/${p.agent.whatsapp.replace(/\D/g, '')}`}>WhatsApp: {p.agent.whatsapp}</a>}
            </div>
          ) : p.url ? (
            <a href={p.url} className="break-all text-[18px] text-[var(--color-primary-pressed)]">{p.url}</a>
          ) : null}
        </div>
      </section>
    </PdfShell>
  )
}

type Copy = ReturnType<typeof pickCopy<typeof COPY>>

/** Расчёт по настройкам агента — той же формулой, что калькулятор на странице. */
function calcRows(snap: InvestmentSnapshot | null, s: CalcSettings | null, lang: Lang, c: Copy): { settings: PdfCalcRow[]; result: PdfCalcRow[] } | null {
  if (!snap || snap.villa.askingPrice == null) return null
  const r = snap.region
  const v = snap.villa
  const base = snap.villa.askingPrice
  const P = (usd: number) => <InlinePrice usd={usd} lang={lang} approx={false} />
  const pct = (x: number | null) => x == null ? '—' : `${(Math.round(x * 1000) / 10).toFixed(1)}%`.replace('.', lang === 'en' || lang === 'zh' ? '.' : ',')
  const tax = (t: string) => c.tax[t] ?? c.tax.beforeTax
  const daily = snap.scenarios && !snap.flags.rentalRestricted && (!s || s.mode === 'daily')
  if (daily) {
    const own = snap.ownBooking
    const d = s?.mode === 'daily' ? s : {
      price: base, adr: own?.adr ?? snap.scenarios!.median.adrAsking,
      occ: Math.round((own?.occupancy ?? r.occupancyByScenario.median) * 100), mgmt: Math.round(r.mgmtFeePct * 100), tax: 'beforeTax',
    }
    const e = computeEconomics({
      adr: d.adr, occupancy: d.occ / 100,
      adrRealization: r.adrRealizationByScenario.median, phrOwnerShare: r.phrOwnerShareByScenario.median,
      area: v.area, bedrooms: v.bedrooms, askingPrice: d.price, leaseholdYearsLeft: v.leaseholdYearsLeft,
      taxStatus: d.tax as TaxStatus, furnished: v.furnished, landRentYear: v.landRentYear,
      region: { ...r, mgmtFeePct: d.mgmt / 100 },
    })
    return {
      settings: [
        { label: c.price, value: P(d.price) }, { label: c.night, value: P(d.adr) },
        { label: c.occ, value: `${d.occ}%` }, { label: c.mgmt, value: `${d.mgmt}%` }, { label: c.taxL, value: tax(d.tax) },
      ],
      result: [
        { label: c.revenue, value: P(e.revenue) }, { label: c.noi, value: P(e.noi), strong: true },
        { label: c.yieldY, value: pct(e.capRate), strong: true }, { label: c.payback, value: e.payback != null ? c.years(e.payback) : '—' },
      ],
    }
  }
  const m = snap.monthly
  if (!m) return null
  const d = s?.mode === 'monthly' ? s : { price: base, rent: m.p50, months: MONTHS_RENTED.median, agent: Math.round(AGENT_FEE_PCT * 100), tax: 'beforeTax' }
  const e = computeMonthlyEconomics({
    rentMonth: d.rent, monthsRented: d.months, agentFeePct: d.agent / 100,
    area: v.area, bedrooms: v.bedrooms, askingPrice: d.price, leaseholdYearsLeft: v.leaseholdYearsLeft,
    taxStatus: d.tax as TaxStatus, furnished: v.furnished, landRentYear: v.landRentYear, region: r,
  })
  return {
    settings: [
      { label: c.price, value: P(d.price) }, { label: c.rent, value: P(d.rent) },
      { label: c.months, value: String(d.months) }, { label: c.agentFee, value: `${d.agent}%` }, { label: c.taxL, value: tax(d.tax) },
    ],
    result: [
      { label: c.revenue, value: P(e.revenue) }, { label: c.noi, value: P(e.noi), strong: true },
      { label: c.yieldY, value: pct(e.capRate), strong: true }, { label: c.payback, value: e.payback != null ? c.years(e.payback) : '—' },
    ],
  }
}
