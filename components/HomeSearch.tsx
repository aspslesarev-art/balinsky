'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { DISTRICT_GROUPS } from '@/lib/district-groups'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

// Поиск на главной (вариант B, владелец 20.11.2026): что · где · бюджет → каталог
// с уже выставленными фильтрами. Обычные <select> — на телефоне открывают родной список.

type SearchCopy = {
  what: string; where: string; budget: string; submit: string
  kinds: [string, string, string]
  anyArea: string
  areas: [string, string, string, string, string]
  anyBudget: string
  upTo: (usd: number) => string
}
const usdSpace = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, '\u00a0')
const usdDot = (n: number) => n.toLocaleString('de-DE')
const usdComma = (n: number) => n.toLocaleString('en-US')

// Названия районов — как их пишут в каждом языке; значения фильтра — латиница из базы.
const COPY: Record<Lang, SearchCopy> = {
  ru: { what: 'Что', where: 'Где', budget: 'Бюджет', submit: 'Найти', kinds: ['Виллы', 'Апартаменты', 'Жилые комплексы'], anyArea: 'Любой район', areas: ['Чангу', 'Букит и Улувату', 'Убуд', 'Санур', 'Семиньяк'], anyBudget: 'Любой', upTo: n => `до $${usdSpace(n)}` },
  en: { what: 'What', where: 'Where', budget: 'Budget', submit: 'Search', kinds: ['Villas', 'Apartments', 'Residential complexes'], anyArea: 'Any area', areas: ['Canggu', 'Bukit & Uluwatu', 'Ubud', 'Sanur', 'Seminyak'], anyBudget: 'Any', upTo: n => `up to $${usdComma(n)}` },
  de: { what: 'Was', where: 'Wo', budget: 'Budget', submit: 'Suchen', kinds: ['Villen', 'Apartments', 'Wohnanlagen'], anyArea: 'Alle Gegenden', areas: ['Canggu', 'Bukit & Uluwatu', 'Ubud', 'Sanur', 'Seminyak'], anyBudget: 'Beliebig', upTo: n => `bis ${usdDot(n)}\u00a0$` },
  fr: { what: 'Quoi', where: 'Où', budget: 'Budget', submit: 'Rechercher', kinds: ['Villas', 'Appartements', 'Résidences'], anyArea: 'Tous les quartiers', areas: ['Canggu', 'Bukit et Uluwatu', 'Ubud', 'Sanur', 'Seminyak'], anyBudget: 'Indifférent', upTo: n => `jusqu’à ${usdSpace(n)}\u00a0$` },
  nl: { what: 'Wat', where: 'Waar', budget: 'Budget', submit: 'Zoeken', kinds: ['Villa’s', 'Appartementen', 'Wooncomplexen'], anyArea: 'Elke regio', areas: ['Canggu', 'Bukit en Uluwatu', 'Ubud', 'Sanur', 'Seminyak'], anyBudget: 'Maakt niet uit', upTo: n => `tot $\u00a0${usdDot(n)}` },
  pl: { what: 'Co', where: 'Gdzie', budget: 'Budżet', submit: 'Szukaj', kinds: ['Wille', 'Apartamenty', 'Kompleksy mieszkaniowe'], anyArea: 'Dowolna okolica', areas: ['Canggu', 'Bukit i Uluwatu', 'Ubud', 'Sanur', 'Seminyak'], anyBudget: 'Dowolny', upTo: n => `do ${usdSpace(n)}\u00a0$` },
  uk: { what: 'Що', where: 'Де', budget: 'Бюджет', submit: 'Знайти', kinds: ['Вілли', 'Апартаменти', 'Житлові комплекси'], anyArea: 'Будь-який район', areas: ['Чангу', 'Букіт і Улувату', 'Убуд', 'Санур', 'Семіньяк'], anyBudget: 'Будь-який', upTo: n => `до $${usdSpace(n)}` },
  id: { what: 'Apa', where: 'Di mana', budget: 'Anggaran', submit: 'Cari', kinds: ['Vila', 'Apartemen', 'Kompleks hunian'], anyArea: 'Semua area', areas: ['Canggu', 'Bukit dan Uluwatu', 'Ubud', 'Sanur', 'Seminyak'], anyBudget: 'Berapa saja', upTo: n => `hingga $${usdDot(n)}` },
  ban: { what: 'Napi', where: 'Ring dija', budget: 'Anggaran', submit: 'Rereh', kinds: ['Vila', 'Apartemen', 'Komplek hunian'], anyArea: 'Sami wewidangan', areas: ['Canggu', 'Bukit lan Uluwatu', 'Ubud', 'Sanur', 'Seminyak'], anyBudget: 'Napi kémanten', upTo: n => `kirang saking $${usdDot(n)}` },
  zh: { what: '类型', where: '区域', budget: '预算', submit: '搜索', kinds: ['别墅', '公寓', '住宅区'], anyArea: '不限区域', areas: ['苍古', '布基特与乌鲁瓦图', '乌布', '沙努尔', '水明漾'], anyBudget: '不限', upTo: n => `$${usdComma(n)} 以内` },
}

const KIND_SEGS = ['villy', 'apartamenty', 'zhilye-kompleksy'] as const
const AREA_VALUES: { v: string; values: readonly string[] }[] = [
  { v: 'canggu', values: DISTRICT_GROUPS.canggu },
  { v: 'bukit', values: DISTRICT_GROUPS.bukit },
  { v: 'ubud', values: DISTRICT_GROUPS.ubud },
  { v: 'sanur', values: ['Sanur'] },
  { v: 'seminyak', values: ['Seminyak'] },
]
const BUDGETS = [150000, 300000, 500000, 1000000]

function Field({ label, value, onChange, options, last }: { label: string; value: string; onChange: (v: string) => void; options: readonly { v: string; l: string }[]; last?: boolean }) {
  return (
    <label className={`relative flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 px-5 py-3 md:py-0 ${last ? '' : 'border-b border-[#ECEFED] md:border-b-0 md:border-r'}`}>
      <span className="text-[12px] text-[#6B7570]">{label}</span>
      <span className="flex items-center justify-between gap-2 text-[16px] font-semibold text-[#0F1A15]">
        <span className="truncate">{options.find(o => o.v === value)?.l}</span>
        <ChevronDown size={16} className="shrink-0 text-[#6B7570]" aria-hidden />
      </span>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={label} className="absolute inset-0 cursor-pointer opacity-0">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

export function HomeSearch({ lang = 'ru' }: { lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  const kinds = KIND_SEGS.map((v, i) => ({ v, l: c.kinds[i] }))
  const areas = [{ v: '', l: c.anyArea }, ...AREA_VALUES.map((a, i) => ({ v: a.v, l: c.areas[i] }))]
  const budgets = [{ v: '', l: c.anyBudget }, ...BUDGETS.map(n => ({ v: String(n), l: c.upTo(n) }))]
  const router = useRouter()
  const [kind, setKind] = useState<string>('villy')
  const [area, setArea] = useState('')
  const [budget, setBudget] = useState('')
  function go(e: React.FormEvent) {
    e.preventDefault()
    const sp = new URLSearchParams()
    const values = AREA_VALUES.find(a => a.v === area)?.values ?? []
    if (values.length) sp.set('district', values.join(','))
    if (budget) sp.set('price_max', budget)
    const qs = sp.toString()
    router.push(`${switchLangPath(`/ru/${kind}`, lang)}${qs ? `?${qs}` : ''}`)
  }
  return (
    <form onSubmit={go} role="search"
      className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgb(0_0_0/.06),0_16px_40px_rgb(0_0_0/.18)] md:h-[68px] md:flex-row md:items-center md:pr-2">
      <Field label={c.what} value={kind} onChange={setKind} options={kinds} />
      <Field label={c.where} value={area} onChange={setArea} options={areas} />
      <Field label={c.budget} value={budget} onChange={setBudget} options={budgets} last />
      <button type="submit"
        className="m-2 inline-flex h-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-[var(--color-primary)] px-8 text-[16px] font-semibold text-white transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:m-0">
        {c.submit}
      </button>
    </form>
  )
}
